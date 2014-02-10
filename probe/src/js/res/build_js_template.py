from string import Template
import base64

script = open('../proxyframe.js','w')

template = Template(open('script_template.js','r').read())
script.write(template.substitute({'template':base64.b64encode(open('template.html','r').read())}))

script.close()

