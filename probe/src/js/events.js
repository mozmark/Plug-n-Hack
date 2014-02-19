EventUtils = {
  findNodeIndex:function(node, parent) {
    for(i=0; i< parent.childNodes.length; i++) {
      if(node === parent.childNodes[i]) {
        return i;
      }
    }
    return -1;
  },
  findPath:function(node) {
    if(node.id) {
      return [node.id];
    } else {
      // find index on parent
      if(node.parentNode) {
        var parent = node.parentNode;
        var index = this.findNodeIndex(node, parent);
        // find path for parent
        var parentPath =  this.findPath(parent);
        parentPath.push(index);
        return parentPath;
      } else {
        return [];
      }
    }
  },
  elementFromPath:function(path) {
    var element;
    for(idx in path) {
      if(!element) {
        if('string' === typeof path[idx]) {
          // we've got a node with an id, start the path with that
          element = document.getElementById(path[idx]);
        } else {
          // our start node is maybe a child of document
          element = document.childNodes[path[idx]];
        }
      } else {
        element = element.childNodes[path[idx]];
      }
    }
    return element;
  },
  makeEventJSON:function(evt) {
    var obj = {};
    for(key in evt) {
      var value = evt[key];
      var type = typeof value;
      // we don't do object or array attrs yet
      if('string' === type || 'number' === type || 'boolean' === type) {
        obj[key] = value;
      }
    }
    return JSON.stringify(obj);
  },
  synthesizeEvent:function(eventData) {
    var evt = document.createEvent('Events');
    evt.initEvent(eventData.type, true, false);
    // TODO: Copy attrs
    for(key in eventData) {
      try {
        evt[key] = eventData[key];
      } catch(e) {
        console.log('oops');
        console.log(e);
      }
    }
    return evt;
  }
}

