Plug-n-Hack Probe
===

The Plug-n-Hack probe is a javascript program which can be injected into a document to provide information on that document to an external tool.  The Plug-n-hack probe currently exposes the following functionality:
* Monitoring and interception of events handled by the document using DOM Level 2 EventListeners.
* Navigation to specified URL.
* Make a request (inject a form into the probed document)
* Observation of specified event types (independent of any EventListeners set on the document) for recording user interaction with the document.

Injecting the Probe
---

The injection can hapeen in a number of different ways (browser bookmarklet, browser addon, injection via MITM proxy) but the probe will work far better if it's able to add mutation observers and event listeners as early as possible. In particular, recording or interception of events may be unreliable (or not work at all) if the event listeners are added to elements before the probe is injected.

Configuration
---
Configuration takes place using a conventional plug-n-hack manifest; the JSON config file is served, as normal, from the tool. A new 'probe' section is added to the configuration file containg the probe configuration options. For example, ZAP serves something that looks something like this:

``` JSON
{
  "toolName":"OWASP ZAP",
  "protocolVersion":"0.2",
  "features":{
    "proxy":{
      "PAC":"http://localhost:8080/proxy.pac",
      "CACert":"http://localhost:8080/OTHER/core/other/rootcert/?apikey="
    },
    "commands":{
      "prefix":"zap",
      "manifest":"http://localhost:8080/OTHER/pnh/other/service/?apikey="
    },
    "probe":{
      "transport":"HTTPMessageTransport",
      "endpoint":"http://localhost:8080/JSON/pnh/action/monitor/?apikey=&",
      "oracle":"http://localhost:8080/JSON/pnh/action/oracle/?apikey=&id=",
      "endpointName":"ZAP"
    }
  }
}
```

There are 4 configuration options in this example:
* **transport**: this specifies the method which the probe will use to communicate with the tool. HTTPMessageTransport uses XHR polling to get data to and from the tool. Other transports could include WebSockets or even RTCDataChannel (patches welcome!).
* **endpoint**: the URL the probe should connect to (this is a parameter which is sent to the transport so it knows how to connect).
* **oracle**: the probe contains a simple XSS oracle; this is an URL which should be hit if that oracle is triggered.
* **endpointName**: this is a name for the tool endpoint - the tool name ('ZAP' in this case) is usually a good choice for this.

Some configuration options can be changed after probe initialization by sending setConfig messages to the client.
