// TODO: Configure the messagetransport from the probe config section
function HTTPMessageTransport(name, receiver, config) {
  this.name = name;
  this.receiver = receiver;
  this.config = config;
}

HTTPMessageTransport.prototype.makeURL = function(message) {
  var unencoded = JSON.stringify(message);
  var encoded = encodeURI ? encodeURI(unencoded) : escape(unencoded);
  var URL = this.config.endpoint+"?message="+encoded+'&id='+this.name;
  return URL;
}

HTTPMessageTransport.prototype.send = function(message) {
  var xhr = new XMLHttpRequest();
  var URL = this.makeURL(message);
 console.log('sending to '+URL);
  xhr.open("GET", URL, true);
  xhr.onload = function(aEvt){
    if (xhr.readyState == 4) {
      if(xhr.status == 200) {
        var messages = JSON.parse(xhr.responseText).messages;
        for(var idx = 0; idx < messages.length; idx++) {
          if(this.receiver) {
            this.receiver.forward(messages[idx]);
          }
        }
      }
      else {
        console.log("Error loading page\n");
      }
    }
  }.bind(this);

  xhr.onerror = function(e) {
    console.log('Request to transport endpoint failed');
    console.log(e.target.status);
  };
  xhr.send();
}
