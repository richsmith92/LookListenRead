var LookListenRead = (function() {

  if (!Array.prototype.last){
    Array.prototype.last = function(){
      return this[this.length - 1];
    };
  };

  var playing = false,
      position = null,
      options, voice, chunks;

  var commands = {
    next: function(){goto(position+1);},
    previous: function(){goto(position-1);},
    speedup: function(){speedup(10);},
    slowdown: function(){speedup(-10);},
    pauseOrResume: pauseOrResume,
    start: start,
    stop: stop,
    nextBlock: function(){moveBlocks(1)},
    previousBlock: function(){moveBlocks(-1)}
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

  function speakText(text, callback) {
    var msg = new SpeechSynthesisUtterance(text);
    msg.rate = options.rate;
    msg.voice = voice;
    msg.onend = function(e) { playing && callback();};
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

  /* Chunk is a set of blast nodes sharing common block-style parent. Nodes in chunk are
     played and highlighted together.
  */
  function initChunks() {
    document.normalize();
    $("body").blast({ delimiter: options.delimiter });
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
  
  // Position where to start new playback: selected node or the last position or first chunk
  function startPosition() {
    try {
      var selNode = getSelection().getRangeAt(0).commonAncestorContainer;
      var blastNode = selNode.nodeType == Node.TEXT_NODE ? selNode.parentNode : 
                 selNode.getElementsByClassName("blast")[0];
      return chunks.findIndex(function(chunk){return chunk.nodes.includes(blastNode);});
    } catch (err) {
      return position ? position : 0;
    }
  }
  
  // Set new position and update highlighted chunk.
  function setPosition(pos) {
    if (pos !== null) pos = Math.max(0, Math.min(chunks.length - 1, pos));
    if (position !== null) {
      chunks[position].nodes.forEach(function(node) {
        $(node).removeClass("llr-active");
      });
    }
    position = pos;
    if (position !== null) {
      chunks[position].nodes.forEach(function(node) {
        $(node).addClass("llr-active");
      });
    }
  }

  function play() {
    playing = true;
    speakText(chunks[position].text, function() {
      if (position < chunks.length - 1) {
        setPosition(position+1);
        play();
      } else {
        pause();
      }
    });
  }
  
  
  function pause() {
    playing = false;
    speechSynthesis.cancel();
  }

  function pauseOrResume() {
    playing ? pause() : play();
  }

  function pauseAndResume() {
    pause();
    setTimeout(play, 30);
  }

  function start() {
    setPosition(startPosition());
    pauseAndResume();
  }

  function stop() {
    playing = false;
    speechSynthesis.cancel();
    setPosition(null);
  }

  function moveBlocks(n) {
    var dir = Math.sign(n);
    var pos = position;
    while(n) {
      if(chunks[pos + dir].block !== chunks[pos].block) n -= dir;
      pos += dir;
    }
    goto(pos);
  }
  
  function goto(pos) {
    setPosition(pos);
    playing && pauseAndResume();
  }
  
  function speedup(percentage) {
    options.rate *= 1 + 0.01*percentage;
    playing && pauseAndResume();
  }

  function init(opts) {
    options = opts;
    initChunks();
    initVoice(function() {
      speechSynthesis.cancel();
      Object.keys(options.hotkeys).forEach(function(cmd){
        Mousetrap.bind(options.hotkeys[cmd],commands[cmd]);
      });
      console.log("LookListenRead: started listener");
    });
  }

  return {
    init: init
  };
})();

chrome.storage.sync.get(defaults, function(options) {
  /* console.log(options);*/
  LookListenRead.init(options);
});
