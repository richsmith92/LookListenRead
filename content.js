var LookListenRead = (function() {

  if (!Array.prototype.last){
    Array.prototype.last = function(){
      return this[this.length - 1];
    };
  };

  var info = s => console.log("LookListenRead: " + s);

  var playing = false,
      chunkIx = null,
      blockIx = null,
      chunks = [],
      blocks = [],
      options, voice;

  var commands = {
    next: () => gotoChunk(chunkIx + 1) && reset(),
    previous: () => gotoChunk(chunkIx - 1) && reset(),
    nextBlock: () => gotoBlock(blockIx + 1),
    previousBlock: () => gotoBlock(blockIx - 1),
    pauseOrResume: pauseOrResume,
    slowdown: () => speedup(-10),
    speedup: () => speedup(10),
    exitMode: exitMode
  };
  
  function initVoice(callback) {
    var voices = speechSynthesis.getVoices();
    info("Found voices: " + voices.length);
    voice = voices.find(v => v.name == options.voice);
    if (voice) {
      callback();
    } else {
      info("Selected voice not found. Waiting for voices...");
      speechSynthesis.onvoiceschanged = () => initVoice(callback);
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
             var i = chunks.length - 1;
             blocks.length > 0 && blocks.last().node == block ?
                     blocks.last().chunkIxs.push(i) :
                     blocks.push({node: block, chunkIxs: [i]});
           }
         });
  }
  
  function bringToRange(i, xs) {
    return i == null ? i : Math.max(0, Math.min(xs.length - 1, i));
  }

  function play() {
    chunkIx != null || gotoChunk(0);
    playing = true;
    speakText(chunks[chunkIx].text, () =>
      chunkIx < chunks.length - 1 ? gotoChunk(chunkIx + 1) && play() : pause());
  }
  
  function pause() {
    playing = false;
    speechSynthesis.cancel();
  }

  function pauseOrResume() {
    playing ? pause() : play();
  }

  function reset(startPlaying) {
    if (playing) {
      pause();
      setTimeout(play, 30);
    } else if (startPlaying) {
      play();
    }
  }

  function stop() {
    pause();
    gotoChunk(null);
  }

  function gotoBlock(i) {
    i = bringToRange(i, blocks);
    blockIx === i || gotoChunk(blocks[i].chunkIxs[0]) && reset();
  }

  // Go to new chunk index, highlight the chunk nodes and return true if new chunk index is
  // not null.
  function gotoChunk(i) {
    i = bringToRange(i, chunks);
    if (chunkIx !== i) {
      if (chunkIx !== null)
        chunks[chunkIx].nodes.forEach(node => $(node).removeClass("llr-active"));
      chunkIx = i;
      blockIx = blocks.findIndex(block => block.chunkIxs.includes(chunkIx));
      if (chunkIx !== null) {
        chunks[chunkIx].nodes.forEach(node => $(node).addClass("llr-active"));
        chunks[chunkIx].nodes[0].scrollIntoViewIfNeeded();
      }
    }
    return chunkIx !== null;
  }
  
  function speedup(percentage) {
    options.rate *= 1 + 0.01*percentage;
    reset();
  }

  function bindHotkey(hotkey, callback) {
    Mousetrap.bind(hotkey, e => { callback(); return false });
  }

  function enterMode() {
    initChunks();
    initVoice(() => {
      Mousetrap.unbind(options.hotkeys.enterMode);
      Object.keys(commands).forEach(cmd => bindHotkey(options.hotkeys[cmd], commands[cmd]));
      chunks.forEach((chunk, i) => chunk.nodes.forEach(node => node.ondblclick = e => {
          gotoChunk(i) && reset(true);
          e.stopPropagation();
      }));
      blocks.forEach(block => block.node.ondblclick = e => {
        gotoChunk(block.chunkIxs[0]) && reset(true);
        e.stopPropagation();
      });
      info("Enter speaking mode");
    });
  }

  function exitMode() {
    stop();
    Object.keys(commands).forEach(cmd => Mousetrap.unbind(options.hotkeys[cmd]));
    bindHotkey(options.hotkeys.exitMode, exitMode);
    bindHotkey(options.hotkeys.enterMode, enterMode);
    info("Exit speaking mode");
  }

  return opts => {
    options = opts;
    bindHotkey(options.hotkeys.enterMode, enterMode);
  }

})();

chrome.storage.sync.get(defaults, LookListenRead);
