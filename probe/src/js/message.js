function Receiver(name, remote){
  this.remote = !!remote;
  this.name = name;
  this.listeners = [];

  // TODO use emit / proper custom events
  this.addListener = function(listener){
    this.listeners[this.listeners.length] = listener;
  };

  this.forward = function(message) {
    for(i in this.listeners){
      var listener = this.listeners[i];
      listener(message);
    }
  };
}

var messageClient = function () {
  var receivers = [];
  return {
    sendMessage:function(dest, message){
      console.log('sending '+JSON.stringify(message)+' to '+dest);
      var receiver = this.getReceiver(dest);
      receiver.forward(message);
    },

    getReceiver:function(name) {
      if(!receivers[name]) {
        receivers[name] = new Receiver(name);
      }
      return receivers[name];
    },

    getLocalReceivers:function() {
      var localReceivers = [];
      for(var idx=0; idx < receivers.length; idx++) {
        var receiver = receivers[idx];
        if(!receiver.remote) {
          localReceivers[localReceivers.length] = receiver;
        }
      }
      return localReceivers;
    }
  };
}();

function Heartbeat(interval, heartbeatID) {
  this.interval = 1000;
  if(interval) {
    this.interval = interval;
  }
  this.heartbeatID = heartbeatID;
}

Heartbeat.prototype.beat = function() {
  messageClient.sendMessage('heartbeat',{type:'heartbeat', time:new Date().getTime(), from:this.heartbeatID});
}

Heartbeat.prototype.stop = function() {
  if(this.handle) {
    clearInterval(this.handle);
    this.handle = false;
  }
}

Heartbeat.prototype.start = function() {
  if(this.handle) {
    this.stop();
  }
  this.handle = setInterval(this.beat.bind(this),this.interval);
}
