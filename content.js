var LookListenRead = (function() {

  var Status = {
    PLAYING : 1,
    STOPPED : 2,
    PAUSED : 3
  };

  var Chunk = {
    SLICE : 1,
    NODES : 2
  };

  var status = Status.STOPPED, options, voice, rate, chunks,
      position = null,
      maxLen = 150,
      nonWhitespaceMatcher = /\S/;

  var commands = {
    next: function(){goto(position+1);},
    previous: function(){goto(position-1);},
    speedup: function(){speedup(10);},
    slowdown: function(){speedup(-10);},
    pauseOrResume: function(){pauseOrResume();},
    start: function(){start();},
    stop: function(){stop();}
  }
  
  var log = console.log.bind(console);

  function initVoice(callback) {
    var voices = speechSynthesis.getVoices();
    console.log("Found voices: " + voices.length);
    voice = voices.find(function(v){return v.name == options.voice;});
    if (voice) {
      callback();
    } else {
      console.log("LookListenRead: Selected voice not found. Waiting for voices...");
      speechSynthesis.onvoiceschanged = function() {initVoice(callback);}
    }
  }

  function speakText(text, cont) {
    var msg = new SpeechSynthesisUtterance(text);
    msg.rate = rate;
    msg.voice = voice;
    msg.onend = function(e) {
      if (status === Status.PLAYING) {
        cont();
      }
    };
    msg.onerror = function(e) { console.log(e); };
    speechSynthesis.speak(msg);
  }
  
  function initChunks(root) {
    chunks = [];
    function go(node) {
      if (node.nodeType == Node.TEXT_NODE) {
        if (nonWhitespaceMatcher.test(node.nodeValue)) {
          chunks.push({
            type: Chunk.NODES,
            nodes : [node],
            text: node.nodeValue
          });
        }
      } else {
        for (var i = 0, len = node.childNodes.length; i < len; ++i) {
          go(node.childNodes[i]);
        }
      }
    }
    go(root);
  }

  function totalText(root, maxLen) {
    var text = "";
    function go(node) {
      if (text.length <= maxLen) {
        if (node.nodeType == Node.TEXT_NODE) {
          if (nonWhitespaceMatcher.test(node.nodeValue)) {
            text += node.nodeValue;
          }
        } else {
          for (var i = 0, len = node.childNodes.length; i < len; ++i) {
            go(node.childNodes[i]);
          }
        }
      }
    }
    go(root);
    return text.length <= maxLen ? text : null;
  }
  
  /* function nodesWithText(root) {
   *   var result = [];
   *   function go(parent, child) {
   *     var parentLen = parent.text.length;
   *     if (child.node.nodeType == Node.TEXT_NODE) {
   *       if (nonWhitespaceMatcher.test(cur.node.nodeValue)) {
   *         if totalText(child, maxLen - parentLen) { // use parent chunk 
   *           parent.text += child.text;
   *         } else { // new chunk for child
   *           res
   *         }
   *         // TODO: split text by chunks
   *         cur.text += cur.node.nodeValue;
   *       } // else just skip child node
   *     }
   *     var maxNextLen = maxLen - curLen;
   *     if (totalText(node)) {
   *       result.push(node);
   *     } else {
   *     }
   *   }
   *   go(root);
   *   return result;
   * }
   */

  function findFirstTextNode(root) {
    var textNode = null;
    function go(node) {
      if (textNode === null) {
        if (node.nodeType == Node.TEXT_NODE) {
          if (nonWhitespaceMatcher.test(node.nodeValue)) {
            textNode = node;
          }
        } else {
          for (var i = 0, len = node.childNodes.length; i < len; ++i) {
            go(node.childNodes[i]);
          }
        }
      }
    }
    go(root);
    /* console.log(root);*/
    return textNode;
  }
  
  function startingPos() {
    var selection = getSelection();
    if (selection.rangeCount > 0) {
      var selected = selection.getRangeAt(0).commonAncestorContainer;
      var node = findFirstTextNode(selected);
      return chunks.findIndex(function(chunk){return chunkHasNode(chunk,node);});
    } else {
      return 0;
    }
  }

  function init(opts) {
    options = opts;
    rate = options.rate;
    document.normalize();
    $("body").blast({ delimiter: "sentence" });
    initChunks(document.body);
    
    initVoice(function() {
      speechSynthesis.cancel();
      /* $(document).keydown(keyHandler);*/
      Object.keys(options.hotkeys).forEach(function(cmd){
        Mousetrap.bind(options.hotkeys[cmd],commands[cmd]);
      });
      console.log("LookListenRead: started listener");
    });
  }

  function chunkHasNode(chunk, node) {
    return chunk.nodes.includes(node);
  }
  
  function setPosition(pos) {
    pos = pos < 0 ? 0 : pos;
    if (position !== null) {
      chunk = chunks[position];
      if (chunk.type === Chunk.NODES) {
        chunk.nodes.forEach(function(node) {
          $(node).unwrap(".llr-active");
        });
      }
    }
    position = pos;
    if (position !== null) {
      chunk = chunks[position];
      if (chunk.type === Chunk.NODES) {
        chunk.nodes.forEach(function(node) {
          $(node).wrap('<span class="llr-active"></span>');
        });
      }
    }
  }

  function play() {
    status = Status.PLAYING;
    speakText(chunks[position].text, function() {
      if (position < chunks.length - 1) {
        setPosition(position+1);
        play();
      } else {
        pause();
      }
    });
  }
  
  function playAfterDelay() {
    setTimeout(play, 30);
  }
  
  function start() {
    if (status === Status.PLAYING) pause();
    setPosition(startingPos());
    playAfterDelay();
  }

  function pause() {
    status = Status.PAUSED;
    speechSynthesis.cancel();
  }

  function pauseOrResume() {
    if (status === Status.PLAYING) {
      pause();
    } else if (status === Status.PAUSED) {
      play();
    }
  }

  function stop() {
    status = Status.STOPPED;
    setPosition(null);
    speechSynthesis.cancel();
  }

  function goto(pos) {
    setPosition(pos);
    if (status == Status.PLAYING) {
      pause();
      playAfterDelay();
    }
  }
  
  function speedup(percentage) {
    rate = rate * (1 + percentage/100);
    if (status == Status.PLAYING) {
      pause(); playAfterDelay();
    }
  }

  return {
    init: init
  };
})();

chrome.storage.sync.get(defaults, function(options) {
  /* console.log(options);*/
  LookListenRead.init(options);
});
