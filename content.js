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
    next: () => goto(position+1),
    previous: () => goto(position-1),
    nextBlock: () => moveBlocks(1),
    previousBlock: () => moveBlocks(-1),
    pauseOrResume: pauseOrResume,
    slowdown: () => speedup(-10),
    speedup: () => speedup(10),
    start: start,
    exitMode: exitMode
  };
  
  function initVoice(callback) {
    var voices = speechSynthesis.getVoices();
    console.log("Found voices: " + voices.length);
    voice = voices.find(v => v.name == options.voice);
    if (voice) {
      callback();
    } else {
      console.log("LookListenRead: Selected voice not found. Waiting for voices...");
      speechSynthesis.onvoiceschanged = () => initVoice(callback)
    }
  }

  function speakText(text, callback) {
    var msg = new SpeechSynthesisUtterance(text);
    msg.rate = options.rate;
    msg.voice = voice;
    msg.onend = e => playing && callback();
    msg.onerror = console.log;
    speechSynthesis.speak(msg);
  }

  /* Chunk is a set of blast nodes sharing common block-style parent. Nodes in chunk are
     played and highlighted together. */
  function initChunks() {

    function displayType(elem) {
      return (elem.currentStyle || window.getComputedStyle(elem, "")).display;
    }

    function closestBlock(elem) {
      while (displayType(elem) !== 'block' && elem.parentNode) { elem = elem.parentNode }
      return elem;
    }

    document.normalize();
    $("body").blast({ delimiter: options.delimiter });
    var regexFilter = new RegExp(options.regexFilter);
    var regexIgnore = new RegExp(options.regexIgnore);
    chunks = [];
    Array.from(document.getElementsByClassName("blast"))
      .filter(span => regexFilter.test(span.innerText) && !regexIgnore.test(span.innerText))
         .forEach(span => {
           var chunk = chunks.length > 0 ? chunks.last() : null;
           var block = closestBlock(span);
           if (chunk && chunk.block === block &&
               chunk.text.length + span.innerText.length <= options.maxLength
           ) {
             chunk.nodes.push(span);
             chunk.text += ' ' + span.innerText;
           } else {
             chunks.push({nodes:[span], text:span.innerText, block: block});
           }
         });
  }
  
  // Position where to start new playback: selected node or the last position or first chunk
  function startPosition() {
    try {
      var selNode = getSelection().getRangeAt(0).commonAncestorContainer;
      var blastNode = selNode.nodeType == Node.TEXT_NODE ? selNode.parentNode : 
                 selNode.getElementsByClassName("blast")[0];
      return chunks.findIndex(chunk => chunk.nodes.includes(blastNode));
    } catch (err) {
      return position ? position : 0;
    }
  }
  
  // Set new position and update highlighted chunk.
  function setPosition(pos) {
    if (pos !== null) pos = Math.max(0, Math.min(chunks.length - 1, pos));
    if (position !== null)
      chunks[position].nodes.forEach(node => $(node).removeClass("llr-active"));
    position = pos;
    if (position !== null)
      chunks[position].nodes.forEach(node => $(node).addClass("llr-active"));
  }

  function play() {
    playing = true;
    speakText(chunks[position].text, () => {
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
    pause();
    setPosition(null);
  }

  function moveBlocks(n) {
    if (position != null) {
      var dir = Math.sign(n);
      var pos = position;
      while(n) {
        var newpos = pos + dir;
        if(newpos >= 0 && newpos < chunks.length) {
          if(chunks[newpos].block !== chunks[pos].block) n -= dir;
          pos = newpos;
        } else {
          n = 0;
        }
      }
      goto(pos);
    }
  }
  
  function goto(pos) {
    setPosition(pos);
    playing && pauseAndResume();
  }
  
  function speedup(percentage) {
    options.rate *= 1 + 0.01*percentage;
    playing && pauseAndResume();
  }

  function enterMode() {
    initChunks();
    initVoice(() => {
      Mousetrap.unbind(options.hotkeys.enterMode);
      Object.keys(commands).forEach(
        cmd => Mousetrap.bind(options.hotkeys[cmd], commands[cmd]));
      console.log("LookListenRead: started listener");
    });
  }

  function exitMode() {
    stop();
    Object.keys(commands).forEach(cmd => Mousetrap.unbind(options.hotkeys[cmd]));
    Mousetrap.bind(options.hotkeys.enterMode, enterMode);
  }

  return opts => {
    options = opts;
    Mousetrap.bind(options.hotkeys.enterMode, enterMode);
  }

})();

chrome.storage.sync.get(defaults, LookListenRead);
