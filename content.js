var LookListenRead = (function() {

  var Status = {
    PLAYING : 1,
    STOPPED : 2,
    PAUSED : 3
  };
  var status = Status.STOPPED, options, voice, rate, textNodes, markedNode, position;

  var commands = {
    next: function(){goto(position+1);},
    previous: function(){goto(position-1);},
    speedup: function(){speedup(10);},
    slowdown: function(){speedup(-10);},
    pauseOrResume: function(){pauseOrResume();},
    start: function(){start();},
    stop: function(){stop();}
  }
  
  /* var log = console.log.bind(console);*/
  
  function getTextNodesIn(node, maxNodes) {
    var textNodes = [], nonWhitespaceMatcher = /\S/;
    var count = 0;
    function getTextNodes(node) {
      if (maxNodes == null || count < maxNodes) {
        if (node.nodeType == 3) {
          if (nonWhitespaceMatcher.test(node.nodeValue)) {
            textNodes.push(node);
            count++;
          }
        } else {
          for (var i = 0, len = node.childNodes.length; i < len; ++i) {
            getTextNodes(node.childNodes[i]);
          }
        }
      }
    }
    getTextNodes(node);
    return textNodes;
  }

  function speakNode(textNode, cont) {
    var msg = new SpeechSynthesisUtterance(textNode.textContent);
    msg.rate = rate;
    msg.voice = voice;
    msg.onend = function(e) {
      /* console.log(e);*/
      if (status === Status.PLAYING) {
        cont();
      }
    };
    msg.onerror = function(e) { console.log(e); };
    speechSynthesis.speak(msg);
  }

  function retrievePosition() {
    var selection = getSelection();
    if (selection.rangeCount > 0) {
      var selected = selection.getRangeAt(0).commonAncestorContainer;
      var first = getTextNodesIn(selected, 1)[0];
      position = textNodes.findIndex(function(x){return x == first;});
    } else {
      position = 0;
    }
  }

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

  function init(opts) {
    options = opts;
    rate = options.rate;
    initVoice(function() {
      textNodes = getTextNodesIn($("body")[0]);
      speechSynthesis.cancel();
      /* $(document).keydown(keyHandler);*/
      Object.keys(options.hotkeys).forEach(function(cmd){
        Mousetrap.bind(options.hotkeys[cmd],commands[cmd]);
      });
      console.log("LookListenRead: started listener");
    });
  }

  function unmark(node) {
    if (node && node.parentNode.tagName == "MARK") {
      $(node).unwrap();
    }
  }
  
  function updateMark() {
    unmark(markedNode);
    if (status !== Status.STOPPED) {
      markedNode = textNodes[position];
      $(markedNode).wrap("<mark></mark>");
      }
  }

  function playAfterDelay() {
    setTimeout(play, 200);
  }
  
  function start() {
    stop();
    retrievePosition();
    playAfterDelay();
  }

  function play() {
    status = Status.PLAYING;
    updateMark();
    speakNode(textNodes[position], function() {
      if (position < textNodes.length - 1) {
        position++;
        play();
      } else {
        stop ();
      }
    });
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
    updateMark()
    speechSynthesis.cancel();
  }

  function goto(pos) {
    var rewind = pos < position;
    position = pos;
    if (status == Status.PLAYING) {
      stop();
      playAfterDelay();
    }
    updateMark();
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
  console.log(options);
  LookListenRead.init(options);
});
