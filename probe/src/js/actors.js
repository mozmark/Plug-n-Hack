/*
 * Makes a listener that directs messages to the appropriate actor based on
 * the message type.
 */
function getActorsListener(messagePeer, endpointName) {
  // TODO: replace with something that actually makes something globally
  // unique
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
    }
  };

  // hook in things from the DOM
  var awaitingResponses = [];
  window.origPostMessage = window.postMessage;
  window.postMessage = function(message, targetOrigin, transfer){
    var pMsg = {
      to:endpointName,
      type:'interceptPostMessage',
      from:'TODO: we need a from',
      target:'someTarget',
      data:message,
      messageId:zapGuidGen()
    };
    messagePeer.sendMessage(pMsg);
    awaitingResponses[pMsg.messageId] = function(response){
      window.origPostMessage(response.data, targetOrigin, transfer);
    };
    // TODO: setTimeout for no response
  }

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
            var handleFunc = awaitingResponses[message.responseTo];
            delete awaitingResponses[message.responseTo];
            handleFunc(message);
          }
          else {
            console.log('not awaiting a response for message '+message.responseTo);
          }
        } else {
          console.log('no actor could be found for messages of type: '
              +message.type);
        }
      }
    } else {
      console.log('no message data or missing type information');
    }
  };
}
