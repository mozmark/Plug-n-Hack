const transports = {HTTPMessageTransport:HTTPMessageTransport};

function Probe(url, id) {
  // TODO: create the transport name from a GUID or something (perhaps the
  // injector can get something sensible).
  this.transportName = id;
  this.receiver = messageClient.getReceiver(this.transportName);

  this.config = {
    // default is also set in Heartbeat - see message.js
    'heartbeatInterval': 1000,
    'monitorPostMessage': true,
    'monitorEvents': true,
    'interceptPostMessage': true,
    'interceptEvents': true,
    'listeners': [],
    'addConfigChangedListener': function(listener) {
      if(-1 == this.listeners.indexOf(listener)) {
        this.listeners.push(listener);
      }
    },
    'removeConfigChangedListener': function(listener) {
      if(-1 != this.listeners.indexOf(listener)) {
        console.log('removing');
        delete this.listeners[this.listeners.indexOf(listener)];
      }
     },
     'notifyListeners':function() {
        for(listener in this.listeners) {
            this.listeners[listener](this);
        }
     }
  };

  this.receiver.addListener(getActorsListener(messageClient, this.config));
  // TODO: wrap with promise pixie dust
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.onload = function(aEvt) {
    if (xhr.readyState == 4) {
      if (xhr.status == 200) {
        var json = xhr.responseText;
        var manifest = JSON.parse(json);
        this.configure(manifest);
      }
    }
  }.bind(this);
  xhr.send();
}

Probe.prototype.configure = function(manifest) {
  if(manifest && manifest.features && manifest.features.probe) {
    var probeSection = manifest.features.probe;

    // get the remote endpoint ID
    this.endpointName = probeSection.endpointName;

    // copy probe section items to the config
    for(configItem in probeSection) {
      this.config[configItem] = probeSection[configItem];
    }

    // find a suitable transport
    this.transport = new transports[probeSection.transport](this.transportName,
        this.receiver, probeSection);

    // Wire the transport to receive messages to the remote endpoint
    var remoteReceiver = messageClient.getReceiver(this.endpointName);
    remoteReceiver.addListener(function(message){
      this.transport.send(message);
    }.bind(this));

    // create a heartbeat
    // now create the heartbeat
    // TODO: Configure the heartbeat interval from the manifest
    this.heartbeat = new Heartbeat(this.transportName, this.endpointName, this.config);
    this.heartbeat.start();

    // make XSS oracle
    if(probeSection.oracle) {
      window.xss = function(arg) {
        var child = document.createElement('img');
        function cleanup(){
          console.log('cleaning up');
          document.body.removeChild(child);
        }
        child.src = probeSection.oracle+arg;
        child.addEventListener('load',cleanup,false);
        child.addEventListener('error',cleanup,false);
        document.body.appendChild(child);
      };
    }
  }
}
