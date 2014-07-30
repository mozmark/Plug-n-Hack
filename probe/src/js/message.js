function Receiver(name, remote){
  this.remote = !!remote;
  this.name = name;
  this.listeners = [];

  // TODO use emit / proper custom events
  this.addListener = function(listener){
    this.listeners[this.listeners.length] = listener;
  };

  this.forward = function(message) {
    for (var i in this.listeners){
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
      if (!receivers[name]) {
        receivers[name] = new Receiver(name);
      }
      return receivers[name];
    },

    getLocalReceivers:function() {
      var localReceivers = [];
      for (var idx=0; idx < receivers.length; idx++) {
        var receiver = receivers[idx];
        if (!receiver.remote) {
          localReceivers[localReceivers.length] = receiver;
        }
      }
      return localReceivers;
    }
  };
  return messagePeer;
}();

function Heartbeat(heartbeatID, destination, config) {
  this.config = config;
  config.addConfigChangedListener(function(newConfig) {
    this.stop();
    this.config = newConfig;
    this.start();
  }.bind(this));

  this.heartbeatID = heartbeatID;
  this.destination = destination;
}



Heartbeat.prototype.getHeartbeatInterval = function() {
  if (this.config && this.config.heartbeatInterval) {
    console.log('interval set from config: '+this.config.heartbeatInterval);
    console.log(this.config);
    return this.config.heartbeatInterval;
  }
  console.log('interval set from default');
  return 1000;
};

Heartbeat.prototype.beat = function() {
  messageClient.sendMessage({type:'heartbeat', time:new Date().getTime(), to:this.destination, from:this.heartbeatID});
};

Heartbeat.prototype.stop = function() {
  if (this.handle) {
    clearInterval(this.handle);
    this.handle = false;
  }
  // TODO: remove config listener
};

Heartbeat.prototype.start = function() {
  if (this.handle) {
    this.stop();
  }
  this.handle = setInterval(this.beat.bind(this), this.getHeartbeatInterval());
  // TODO: Add config listener at this point
};
