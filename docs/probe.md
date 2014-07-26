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

Injection involves 2 things:
* Injecting the probe source
* Initialising a probe

Initialising a probe looks something like:

``` JavaScript
var probe = new Probe(
  'http://localhost:8080/OTHER/pnh/other/manifest/?apikey=',
  'ZAP_ID-4');
```

The first parameter there is the URL of the PnH manifest (see below), the second is an ID given to this probe.

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

Other configuration options include:
* **heartbeatInterval**: your tool may want a mechanism for knowing whether a probe is still alive. A heartbeat provides a useful mechanism for checking this; if your heartbeat interval is set to 1000 (or, 1 second) and you've not recieved a heartbeat for several seconds, it's a good indicator that your probe is no longer alive.  With the HTTPMessageTransport, this has the nice side-effect of providig a ready-made poll loop. The default value for this option is 1000.
* **monitorEvents**: (true/false) Set this to true if you wish to receive information on events seen by EventListeners added to the document via AddEventListener. This is a great way of exposing functionality in an application to test.
* **interceptEvents**: (true/false) Similar to the monitor functionality, with the difference that the remote tool can modify the message received to change how the event looks to the receiving EventListener.
*  **monitorPostMessage**: (true/false) In cases when the receiving window doesn't have a probe set, this can be a way of getting information on postMessages. Only use this if you can't set a probe on the receiving document for whatever reason.
*  **interceptPostMessage**: (true/false) Similar for monitorPostMessage but for interception and modification.
*  **recordEvents**: (true/false) should all click and keypress events be sent to the tool (e.g. for recording)?

Some configuration options can be changed after probe initialization by sending setConfig messages to the client.

Messages
---

Probe messages consist of (short) pieces of JSON. An example message might look like this:

``` JSON
{"type":"heartbeat","time":1404739028607,"to":"ZAP","from":"ZAP_ID-4"}
```

All probe messages must have the following fields:
* **type**: information on what kind of message this is. In this case, it's a heartbeat message.
* **to**: information on where this message is going to. This will correspond to the endpointName configuration option; in this case, it's "ZAP".
* **from**: information on where this message comes from. This will correspond to the ID the probe was given on creation; in this case, it's "ZAP_ID-4".

Probe messages may have other data. In this case, "time" is included.

Messages Sent
---

There are a number of messages that can be sent by the probe

Messages Received
---

The probe also handles a number of messages:
* **setConfig**: This message sets a configuration option on the probe. Configuration options are described above. The probe expects the message to contain the following:
  * **name**: (string) the name of the configuration option to set
  * **value**: the value to set this configuration option to.
* **setLocation**: This message causes the window containing the probed document to navigate. The probe expects a single item in the message:
  * **URL**: (string) the URL the window should navigate to.
* **makeRequest**: This message is similar to setLocation but allows for more request types. It works by injecting a form into the probed document and submitting it. this is useful if, for example, you want to POST some form data to an URL. The probe expects the following in this message:
  * **URL**: (string) The URL the form should use as its action
  * **method**: (string) The method the form should use (e.g. GET or POST)
  * We really ought to allow some form fields to be set too. That hasn't happened yet. Patches welcome!
