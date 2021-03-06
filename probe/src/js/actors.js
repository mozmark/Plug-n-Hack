/*
 * Makes a listener that directs messages to the appropriate actor based on
 * the message type.
 */
function getActorsListener(messagePeer, clientConfig) {
  // TODO: replace with something that actually makes something globally
  // unique (this is what ZAP uses currently)
  function zapS4() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
  }
  function zapGuidGen() {
    return zapS4()+zapS4()+"-"+zapS4()+"-"+zapS4()+"-"+zapS4()+"-"+zapS4()+zapS4()+zapS4();
  }

  // Actors which receieve messages from the tool
  var actors = {
    /*
     * set the location of the current window. Useful for, e.g. forcing the
     * browser to make a request.
     */
    'setLocation' : function(message) {
      if (message.URL) {
        // navigate to the specified URL
        window.location = message.URL;
      }
    },

    /*
     * cause the browser to make a request with a given method. Useful for,
     * e.g. resending forms for replaying a POST.
     */
    'makeRequest' : function(message) {
      if (message.URL && message.method) {
        // inject a form into the document
        var form = document.createElement('form');
        form.method = message.method;
        form.action = message.URL;
        // TODO: set form parameters would be nice
        document.body.appendChild(form);

        // submit the form
        form.submit();
      }
    },

    'setConfig' : function(message) {
      var name = message.name;
      var value = message.value;
      clientConfig[name] = value;
      // TODO: notify things that are interested in config changes
      clientConfig.notifyListeners();
    }
  };

  // hook in things from the DOM
  // postMessage Proxy stuff
  var awaitingResponses = [];
  var endpoints = [];
  var forEach = Array.prototype.forEach;
  var recentEvents = [];
  var lastClearout = Date.now();

  function hookWindow(win) {
    if (!win.postMessage.isPnHProbe){
      try{
        var endpointId = zapGuidGen();
        win.origPostMessage = win.postMessage;
        endpoints[endpointId] = function(response) {
          win.origPostMessage(response.data, '*');
        }
        win.postMessage = function(message, targetOrigin, transfer){
          if (clientConfig.monitorPostMessage || clientConfig.interceptPostMessage) {
            var messageId = zapGuidGen();
            if (clientConfig.interceptPostMessage){
              awaitingResponses[messageId] = function(response){
                // TODO: Tighten up target origin here if we can
                if (transfer) {
                  win.origPostMessage(response.data, '*', transfer);
                } else {
                  win.origPostMessage(response.data, '*');
                }
              };
              // TODO: setTimeout for no response to clear handlers awaiting
              // dropped responses
            }
            var pMsg = {
              to:clientConfig.endpointName,
              type:'interceptPostMessage',
              from:'TODO: we need a from',
              target:'someTarget',
              data:message,
              intercept: clientConfig.interceptPostMessage ? true: false,
              messageId:messageId,
              endpointId:endpointId
            };
            messagePeer.sendMessage(pMsg);
          }
          if (!clientConfig.interceptPostMessage) {
            if (transfer) {
              win.origPostMessage(message, targetOrigin, transfer);
            } else {
              win.origPostMessage(message, targetOrigin);
            }
          }
        }
        win.postMessage.isPnHProbe = true;
        //console.log('hooked');
        return true;
      } catch (e) {
        //console.log('conventional hook failed');
        return false;
      }
    } else {
      return true;
      //console.log('pnh hook postMessage hook already in place');
    }
  }

  function makeProxy(fn, pre, post) {
    if (fn.isPnHProbeProxy) return fn;
    //console.log('make proxy... '+fn);
    var newFn = function(){
      var callInfo = pre ? pre(this, arguments) : arguments;
      var ret;
      if (callInfo.modify) {
        ret = callInfo.modify(this, fn, callInfo.args);
      } else {
        ret = fn.apply(this, callInfo.args);
      }
      return post ? post(ret) : ret;
    }
    newFn.isPnHProbeProxy = true;
    return newFn;
  }

  var appendAttributes = function(evtType, evt, message){
    if ('submit' === evtType) {
      message.sync = true;
      if (clientConfig.recordEvents) {
        message.probeURL = evt.target.action;
      }
    }
    if ('click' === evtType) {
      var target = evt.target;
      if (evt.target
          && evt.target.nodeName) {
            if ('A' === evt.target.nodeName) {
              message.sync = true;
              if (clientConfig.recordEvents) {
                message.probeURL = evt.target.href;
              }
            }
            if ('INPUT' === target.nodeName
                && target.type
                && 'submit' === target.type) {
                  for (var current = target; current.parentNode; current = current.parentNode) {
                    if ('FORM' === current.nodeName) {
                      if (current.action) {
                        message.probeURL = current.action;
                      } else {
                        message.probeURL = cleanURL(current.baseURI);
                      }
                      message.sync = true;
                      break;
                    }
                  }
                }
          }
    }
  };

  var listenerMap = {};

  function addEventListenerProxy(obj, args) {
    var type = args[0];
    var endpointId = zapGuidGen();
    //console.log("hooking "+endpointId+" for events that are "+type);
    endpoints[endpointId] = function (response) {
      var evt = EventUtils.synthesizeEvent(response.eventData);
      // TODO: if originalTargetPath is set, dispatch event there
      args[1](evt);
    };
    var onEventProxy = makeProxy(args[1], function() {
      var messageId = zapGuidGen();
      var callInfo = {};
      //TODO: replace with an actual implementation
      if (clientConfig.monitorEvents || clientConfig.interceptEvents) {
        var evt = arguments[1][0];
        var message = 'a '+type+' event happened!';
        // TODO: do a better job of marshalling events to the PnH provider
        var pMsg = {
          to:clientConfig.endpointName,
        type:'eventInfoMessage',
        from:'TODO: we need a from',
        target:'someTarget',
        data:message,
        eventData:EventUtils.makeEventJSON(evt),
        originalTargetPath:EventUtils.findPathFromEvent(evt),
        messageId:messageId,
        endpointId:endpointId,
        seenBefore:(recentEvents.indexOf(evt) >= 0)
        };
        appendAttributes(type, evt, pMsg);
        recentEvents.push(evt);
        messagePeer.sendMessage(pMsg);
        // clear out recent events - every second ish
        if (lastClearout + 1000 < Date.now()) {
          for (var idx in recentEvents) {
            var recent = recentEvents[idx];
            if (recent && (recent.timeStamp + 1000 < evt.timeStamp)){
              delete recentEvents[idx];
            }
          }
          lastClearout = Date.now();
        }
      }
      callInfo.args = arguments[1];
      if (clientConfig.interceptEvents) {
        callInfo.modify = function(obj, fn, args) {
          awaitingResponses[messageId] = function () {
            fn.apply(obj, args);
          };
        };
      }
      return callInfo;
    });
    listenerMap[args[1]] = onEventProxy;
    return {'args':[args[0], onEventProxy, args[2]]};
  }

  function removeEventListenerProxy(obj, args) {
    // if it's proxied, remove the proxy, otherwise the original
    var listener = listenerMap[args[1]] ? listenerMap[args[1]] : args[1];
    return {args:[args[0], listener, args[2]]};
  }

  function proxyAddEventListener(node) {
    node.addEventListener = makeProxy(node.addEventListener, addEventListenerProxy);
    node.removeEventListener = makeProxy(node.removeEventListener, removeEventListenerProxy);
  }

  var observer = new MutationObserver(function(mutations) {
    function hookNode(node) {
      if (node.contentWindow && node.contentWindow.postMessage) {
        node.addEventListener('load', function() {
          //console.log("MODIFY TEH "+node.nodeName+"!!!");
          if (!hookWindow(node.contentWindow)) {
            makeProxyFrame(node);
            hookWindow(node.contentWindow);
            //console.log('tried alternative postMessage hook');
          }
        }, false);
      }
      forEach.call(node.childNodes, function(child){
        hookNode(child);
      });
    };

    mutations.forEach(function(mutation) {
      forEach.call(mutation.addedNodes, function(node){
        hookNode(node);
      });
    });
  });

  // configuration of the observer:
  var config = { attributes: true, childList: true, characterData: true, subtree: true };

  // pass in the target node, as well as the observer options
  observer.observe(document, config);

  hookWindow(window);
  proxyAddEventListener(window);
  proxyAddEventListener(Node.prototype);

  // listener for the recorder - initially just do nothing and allow the
  // addEventListenerProxy send the messages for us (no reason not to).
  var recorderListener = function(evt) {
    // Do nothing; we just want to provoke the probe into sending a message
  };

  // TODO: Perhaps we want the tool to specify what events are interesting?
  var evtTypes = ['click','keypress'];
  var recording = false;

  // function for ensuring the relevant recorder eventListeners are added or
  // removed according to config
  var setupRecorders = function(conf) {
    if (conf.recordEvents) {
      if (!recording) {
        for (var evtType of evtTypes) {
          window.addEventListener(evtType, recorderListener, true);
        }
        recording = true;
      }
    } else {
      if (recording) {
        for (var evtType of evtTypes) {
          window.removeEventListener(evtType, recorderListener, false);
        }
        recording = false;
      }
    }
  };

  // ensure recording stuff is done
  clientConfig.addConfigChangedListener(function(newConfig) {
    setupRecorders(newConfig);
  });

  setupRecorders(clientConfig);

  function addWindowOpenProxy(obj, args) {
    console.log('Do window.open stuff here');
    if (clientConfig.recordEvents) {
      var messageId = zapGuidGen();
      // send a probeURL message here
      var pMsg = {
        to:clientConfig.endpointName,
        type:'windowOpenMessage',
        data:'',
        messageId:messageId,
        probeURL:args[0],
        sync:true
      };
      messagePeer.sendMessage(pMsg);
    }
    return {args:args};
  }

  window.open = makeProxy(window.open, addWindowOpenProxy);

  /*
   * The actual listener that's returned for adding to a receiver.
   */
  return function(message) {
    if (message && message.type) {
      if (actors[message.type]) {
        actors[message.type](message);
      } else {
        // if we're awaiting a response with this ID, call the handler
        if (message.responseTo) {
          if (awaitingResponses[message.responseTo]){
            var handleFunc = awaitingResponses[message.responseTo];
            delete awaitingResponses[message.responseTo];
            handleFunc(message);
          } else {
            if (endpoints[message.responseTo]){
              endpoints[message.responseTo](message);
            } else {
              console.log('no endpoint or awaited response for message '+message.responseTo);
            }
          }
        }
      }
    } else {
      console.log('no message data or missing type information');
    }
  };
}
