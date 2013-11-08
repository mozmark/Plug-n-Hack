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
  var messagePeer = {
    sendMessage:function(message){
      var dest = message.to;
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
  return messagePeer;
}();

function Heartbeat(interval, heartbeatID, destination) {
  this.interval = 1000;
  if(interval) {
    this.interval = interval;
  }
  this.heartbeatID = heartbeatID;
  this.destination = destination;
}

Heartbeat.prototype.beat = function() {
  messageClient.sendMessage({type:'heartbeat', time:new Date().getTime(), to:this.destination, from:this.heartbeatID});
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
