var template_string = atob('$template');

function Template(str) {
  this.template_string = str;
}

Template.prototype.render = function (template_data) {
  var rendered = this.template_string;
  for(key in template_data) {
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
