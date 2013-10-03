const transports = {HTTPMessageTransport:HTTPMessageTransport};

function Probe(url, id) {
  // TODO: create the transport name from a GUID or something (perhaps the
  // injector can get something sensible).
  this.transportName = id;
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

    // find a suitable transport
    this.receiver = messageClient.getReceiver(this.transportName);
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
    this.heartbeat = new Heartbeat(1000, this.transportName, this.endpointName);
    this.heartbeat.start();

    this.receiver.addListener(getActorsListener(messageClient, this.endpointName));
  }
}
