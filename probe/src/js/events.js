var EventUtils = {
  findNodeIndex:function(node, parent) {
    for(var i=0; i< parent.childNodes.length; i++) {
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
  findPathFromEvent:function(evt) {
    try {
      //return this.findPath(evt.originalTarget);
      return this.getElementXPath(evt.originalTarget);
    } catch (e) {
      //return this.findPath(evt.target);
      return this.getElementXPath(evt.target);
    }
  },
   /**
   * Gets an XPath for an element which describes its hierarchical location.
   */
  getElementXPath: function(element) {
      if (element && element.id)
          return '//*[@id="' + element.id + '"]';
      else
          return this.getElementTreeXPath(element);
  },

  getElementTreeXPath: function(element) {
      var paths = [];

      // Use nodeName (instead of localName) so namespace prefix is included (if any).
      for (; element && element.nodeType == 1; element = element.parentNode)  {
          var index = 0;
          // EXTRA TEST FOR ELEMENT.ID
          if (element && element.id) {
              paths.splice(0, 0, '/*[@id="' + element.id + '"]');
              break;
          }

          for (var sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
              // Ignore document type declaration.
              if (sibling.nodeType == Node.DOCUMENT_TYPE_NODE)
                continue;

              if (sibling.nodeName == element.nodeName)
                  ++index;
          }

          var tagName = element.nodeName.toLowerCase();
          var pathIndex = (index ? "[" + (index+1) + "]" : "");
          paths.splice(0, 0, tagName + pathIndex);
      }

      return paths.length ? "/" + paths.join("/") : null;
  },
  elementFromPath:function(path) {
    var element;
    for(var idx in path) {
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
    for(var key in evt) {
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
    for(var key in eventData) {
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

