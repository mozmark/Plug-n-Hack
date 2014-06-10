var template_string = atob('PCFET0NUWVBFIGh0bWw+PGh0bWw+PGhlYWQ+PG1ldGEgY29udGVudD0idGV4dC9odG1sO2NoYXJzZXQ9dXRmLTgiIGh0dHAtZXF1aXY9IkNvbnRlbnQtVHlwZSI+PG1ldGEgY29udGVudD0idXRmLTgiIGh0dHAtZXF1aXY9ImVuY29kaW5nIj48dGl0bGU+TWlkZGxlPC90aXRsZT48L2hlYWQ+PHNjcmlwdD4Kd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoIm1lc3NhZ2UiLGZ1bmN0aW9uKGUpewp2YXIgZGVzdCA9IHdpbmRvdy5wYXJlbnQ7CmlmKGUuc291cmNlID09PSB3aW5kb3cucGFyZW50KSB7CmRlc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiaW5uZXIiKS5jb250ZW50V2luZG93Owp9CmRlc3QucG9zdE1lc3NhZ2UoZS5kYXRhLCIqIik7Cn0sdHJ1ZSk7Cjwvc2NyaXB0PjxzdHlsZT4KYm9keSwgaHRtbCB7IHdpZHRoOjEwMCUgOwpoZWlnaHQ6MTAwJSA7Cm92ZXJmbG93OmhpZGRlbiA7Cn0KaWZyYW1lIHsgd2lkdGg6MTAwJSA7CmhlaWdodDoxMDAlIDsKYm9yZGVyOm5vbmUgOwp9Cjwvc3R5bGU+PGJvZHk+PGlmcmFtZSBpZD0iaW5uZXIiIG5hbWU9ImlubmVyV2luZG93IiBzcmM9IiN7c3JjfSIgaGVpZ2h0PSIxMDAlIj48L2lmcmFtZT48L2JvZHk+PC9odG1sPgo=');

function Template(str) {
  this.template_string = str;
}

Template.prototype.render = function (template_data) {
  var rendered = this.template_string;
  for(var key in template_data) {
    rendered = rendered.replace('#{'+key+'}', template_data[key])
  }
  // TODO: replace escaped chars
  return rendered
};

var template = new Template(template_string);

function makeProxyFrame(ifr) {
  var enc = 'data:text/html;charset=US-ASCII,';
  ifr.src = enc+template.render({'src':ifr.src});

  var name = ifr.name;
  if(name) {
    ifr.addEventListener('load',function (){
      ifr.name = 'proxied_'+name;
      ifr.contentDocument.getElementById('inner').name = name;
      console.log('set inner frame name to '+name);
    }, false);
  }
}
