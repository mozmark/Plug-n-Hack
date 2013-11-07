var preSrc = 'data:text/html;charset=US-ASCII,<!DOCTYPE html><html><head><meta content="text/html;charset=utf-8" http-equiv="Content-Type"><meta content="utf-8" http-equiv="encoding"><title>Middle</title></head><script>\n\
window.addEventListener("message",function(e){\n\
var dest = window.parent;\n\
if(e.source === window.parent) {\n\
dest = document.getElementById("inner").contentWindow;\n\
}\n\
dest.postMessage(e.data,"*");\n\
},true);\n\
</script><style>\n\
body, html { width:100% ;\n\
height:100% ;\n\
overflow:hidden ;\n\
}\n\
iframe { width:100% ;\n\
height:100% ;\n\
border:none ;\n\
}\n\
</style><body><iframe id="inner" name="innerWindow" src="';
var postSrc ='" height="100%"></iframe></body></html>';

URLData = preSrc+document.querySelector('#ifr').src+postSrc;
document.querySelector("#ifr").src=URLData;