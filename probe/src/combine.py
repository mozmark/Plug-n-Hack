''' A dumb build script to combine the files for pnh_probe.js '''
import os

files = ['actors.js', 'message.js', 'transports.js', 'probe.js']

out = open(os.path.join('dist','pnh_probe.js'),'w')
# read all js files, in order
for f in files:
  h = open(os.path.join('js',f))
  lines = h.readlines()
  h.close()
  for line in lines:
    out.write(line)
out.close()
