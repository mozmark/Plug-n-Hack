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
      if(message.URL) {
        // navigate to the specified URL
        window.location = message.URL;
      }
    },

    /*
     * cause the browser to make a request with a given method. Useful for,
     * e.g. resending forms for replaying a POST.
     */
    'makeRequest' : function(message) {
      if(message.URL && message.method) {
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
    }
  };

  // hook in things from the DOM
  // postMessage Proxy stuff
  var awaitingResponses = [];
  var endpoints = [];
  var forEach = Array.prototype.forEach;

  function hookWindow(win) {
    if(!win.postMessage.isPnHProbe){
      try{
        var endpointId = zapGuidGen();
        win.origPostMessage = win.postMessage;
        endpoints[endpointId] = function(response) {
          win.origPostMessage(response.data, '*');
        }
        win.postMessage = function(message, targetOrigin, transfer){
          console.log('client config is ...');
          console.log(clientConfig);
          if(clientConfig.monitorPostMessage || clientConfig.interceptPostMessage) {
            var messageId = zapGuidGen();
            if(clientConfig.interceptPostMessage){
              awaitingResponses[messageId] = function(response){
                if(transfer) {
                  //win.origPostMessage(response.data, targetOrigin, transfer);
                  win.origPostMessage(response.data, '*', transfer);
                } else {
                  //win.origPostMessage(response.data, targetOrigin);
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
          } else {
            if(!clientConfig.interceptPostMessage) {
              console.log('intercept postMessage is off: firing directly');
              win.origPostMessage(message, targetOrigin, transfer);
            }
          }
        }
        win.postMessage.isPnHProbe = true;
        console.log('hooked');
        return true;
      } catch (e) {
        console.log('conventional hook failed');
        return false;
      }
    } else {
      return true;
      console.log('pnh hook postMessage hook already in place');
    }
  }

  function makeProxy(fn, pre, post) {
    if(fn.isPnHProbeProxy) return fn;
    console.log('make proxy... '+fn);
    newFn = function(){
      var newArgs = pre ? pre(this,arguments) : arguments;
      var ret = fn.apply(this, newArgs);
      return post ? post(ret) : ret;
    }
    newFn.isPnHProbeProxy = true;
    return newFn;
  }

  function addEventListenerProxy(obj, args) {
    var type = args[0];
    var onEventProxy = makeProxy(args[1], function() {
      //TODO: replace with an actual implementation
      var evt = arguments[1][0];
      var endpointId = zapGuidGen();
      var message = 'a '+type+' event happened!';
      var pMsg = {
        to:clientConfig.endpointName,
        type:'eventInfoMessage',
        from:'TODO: we need a from',
        target:'someTarget',
        data:message,
        evt:evt,
        messageId:zapGuidGen(),
        endpointId:endpointId
      };
      messagePeer.sendMessage(pMsg);
      return arguments[1];
    });
    return[args[0], onEventProxy, args[2]];
  }

  function proxyAddEventListener(node) {
    node.addEventListener = makeProxy(node.addEventListener, addEventListenerProxy);
  }

  var observer = new MutationObserver(function(mutations) {
    function hookNode(node) {
      if(node.contentWindow && node.contentWindow.postMessage) {
        node.addEventListener('load', function() {
          console.log("MODIFY TEH "+node.nodeName+"!!!");
          if(!hookWindow(node.contentWindow)) {
            makeProxyFrame(node);
            hookWindow(node.contentWindow);
            console.log('tried alternative postMessage hook');
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

  /*
   * The actual listener that's returned for adding to a receiver.
   */
  return function(message) {
    if(message && message.type) {
      if(actors[message.type]) {
        actors[message.type](message);
      } else {
        // if we're awaiting a response with this ID, call the handler
        if(message.responseTo) {
          if(awaitingResponses[message.responseTo]){
            console.log('awaiting response: '+message.responseTo+' - handling');
            var handleFunc = awaitingResponses[message.responseTo];
            delete awaitingResponses[message.responseTo];
            handleFunc(message);
          } else {
            if(endpoints[message.responseTo]){
              console.log('known endpoint: '+message.responseTo+' - handling');
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
