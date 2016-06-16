var LookListenRead = (function() {

  if (!Array.prototype.last){
    Array.prototype.last = function(){
      return this[this.length - 1];
    };
  };

  var playing = false,
      chunkIx = null,
      blockIx = null,
      chunks = [],
      blocks = [],
      options, voice;

  var commands = {
    next: () => gotoChunk(chunkIx + 1),
    previous: () => gotoChunk(chunkIx - 1),
    nextBlock: () => gotoBlock(blockIx + 1),
    previousBlock: () => gotoBlock(blockIx - 1),
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
  
  // Position where to start new playback: selected node or the last chunkIx or first chunk
  function startPosition() {
    try {
      var selNode = getSelection().getRangeAt(0).commonAncestorContainer;
      var blastNode = selNode.nodeType == Node.TEXT_NODE ? selNode.parentNode : 
                 selNode.getElementsByClassName("blast")[0];
      return chunks.findIndex(chunk => chunk.nodes.includes(blastNode));
    } catch (err) {
      return chunkIx ? chunkIx : 0;
    }
  }
  
  function bringToRange(i, xs) {
    return i == null ? i : Math.max(0, Math.min(xs.length - 1, i));
  }

  // Set new chunkIx and update highlighted chunk.
  function setChunkIx(i) {
    if (chunkIx !== null)
      chunks[chunkIx].nodes.forEach(node => $(node).removeClass("llr-active"));
    chunkIx = i;
    blockIx = blocks.findIndex(block => block.chunkIxs.includes(chunkIx));
    if (chunkIx !== null)
      chunks[chunkIx].nodes.forEach(node => $(node).addClass("llr-active"));
  }

  function play() {
    playing = true;
    speakText(chunks[chunkIx].text, () => {
      if (chunkIx < chunks.length - 1) {
        setChunkIx(chunkIx + 1);
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
    setChunkIx(startPosition());
    pauseAndResume();
  }

  function stop() {
    pause();
    setChunkIx(null);
  }

  function gotoBlock(i) {
    i = bringToRange(i, blocks);
    blockIx === i || gotoChunk(blocks[i].chunkIxs[0]);
  }
  
  function gotoChunk(i, startPlaying) {
    i = bringToRange(i, chunks);
    if (chunkIx !== i) {
      setChunkIx(i);
      (startPlaying || playing) && pauseAndResume();
    }
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
      chunks.forEach((chunk, i) => chunk.nodes.forEach(node => node.ondblclick = e => {
          gotoChunk(i, true);
          e.stopPropagation();
      }));
      blocks.forEach(block => block.node.ondblclick = e => {
        gotoChunk(block.chunks[0], true);
        e.stopPropagation();
      });
      console.log("LookListenRead: started listener");
    });
  }

  function exitMode() {
    stop();
    Object.keys(commands).forEach(cmd => Mousetrap.unbind(options.hotkeys[cmd]));
    Mousetrap.bind(options.hotkeys.exitMode, exitMode);
    Mousetrap.bind(options.hotkeys.enterMode, enterMode);
  }

  return opts => {
    options = opts;
    Mousetrap.bind(options.hotkeys.enterMode, enterMode);
  }

})();

chrome.storage.sync.get(defaults, LookListenRead);
