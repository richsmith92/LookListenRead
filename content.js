var LookListenRead = (function() {

  if (!Array.prototype.last){
    Array.prototype.last = function(){
      return this[this.length - 1];
    };
  };
  
  var Status = {
    PLAYING : 1,
    STOPPED : 2,
    PAUSED : 3
  };

  var status = Status.STOPPED, options, voice, rate, chunks,
      position = null;

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

  function displayType(elem) {
    return (elem.currentStyle || window.getComputedStyle(elem, "")).display;
  }

  function closestBlock(elem) {
    while (displayType(elem) !== 'block' && elem.parentNode) { elem = elem.parentNode }
    return elem;
  }

  function initChunks() {
    var regexFilter = new RegExp(options.regexFilter);
    var regexIgnore = new RegExp(options.regexIgnore);
    chunks = [];
    Array.from(document.getElementsByClassName("blast"))
         .filter(function(span){
           return regexFilter.test(span.innerText) && !regexIgnore.test(span.innerText);
         })
         .forEach(function(span){
           var chunk = chunks.length > 0 ? chunks.last() : null;
           var block = closestBlock(span);
           if (chunk && chunk.block === block &&
               chunk.text.length + span.innerText.length <= options.maxLength
           ) {
             chunk.nodes.push(span);
             chunk.text += ' ' + span.innerText;
           } else {
             chunks.push({
               nodes:[span],
               text:span.innerText,
               block: block
             });
           }
         });
  }
  
  function startingPos() {
    try {
      var selected = getSelection().getRangeAt(0).commonAncestorContainer;
      /* console.log(selected, selected.nodeType);*/
      var node = selected.nodeType == Node.TEXT_NODE ? selected.parentNode : 
                 selected.getElementsByClassName("blast")[0];
      return chunks.findIndex(function(chunk){return chunk.nodes.includes(node);});
    } catch (err) {
      console.log(err);
      return 0;
    }
  }

  function init(opts) {
    options = opts;
    rate = options.rate;
    document.normalize();
    $("body").blast({ delimiter: options.delimiter });
    initChunks();
    
    initVoice(function() {
      speechSynthesis.cancel();
      /* $(document).keydown(keyHandler);*/
      Object.keys(options.hotkeys).forEach(function(cmd){
        Mousetrap.bind(options.hotkeys[cmd],commands[cmd]);
      });
      console.log("LookListenRead: started listener");
    });
  }
  
  function setPosition(pos) {
    pos = pos < 0 ? 0 : pos;
    if (position !== null) {
      chunk = chunks[position];
      chunk.nodes.forEach(function(node) {
        $(node).removeClass("llr-active");
      });
    }
    position = pos;
    if (position !== null) {
      chunk = chunks[position];
      chunk.nodes.forEach(function(node) {
        $(node).addClass("llr-active");
      });
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
