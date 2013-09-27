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
    // find a suitable transport
    var probeSection = manifest.features.probe;
    this.receiver = messageClient.getReceiver(this.transportName);
    this.transport = new transports[probeSection.transport](this.transportName,
        this.receiver, probeSection);
    // create a heartbeat
    // first create a route for heartbeat messages to get to the mothership
    var hb = messageClient.getReceiver('heartbeat');
    hb.addListener(this.transport.send.bind(this.transport));
    // now create the heartbeat
    // TODO: Configure the heartbeat interval from the manifest
    this.heartbeat = new Heartbeat(1000,this.transportName);
    this.heartbeat.start();

    this.receiver.addListener(getActorsListener());
  }
}
