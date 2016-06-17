/* global $, Mousetrap, chrome, defaults */

const LookListenRead = (function() {

  const last = xs => xs[xs.length - 1]
  const info = s => console.log('LookListenRead: ' + s)

  const commands = {
    next: () => gotoChunk(chunkIx + 1) && reset(),
    previous: () => gotoChunk(chunkIx - 1) && reset(),
    nextBlock: () => gotoBlock(blockIx + 1),
    previousBlock: () => gotoBlock(blockIx - 1),
    pauseOrResume: pauseOrResume,
    slowdown: () => speedup(-10),
    speedup: () => speedup(10),
    exitMode: exitMode,
  }

  let playing = false
  let chunkIx = null
  let blockIx = null
  let options
  let voice
  let startPos = {x : null, y: null}
  const chunks = []
  const blocks = []
  const utterances = []

  function initVoice(next) {
    const voices = speechSynthesis.getVoices()
    info('Found voices: ' + voices.length)
    voice = voices.find(v => v.name === options.voice)
    if (voice) {
      next()
    } else {
      info('Selected voice not found. Waiting for voices...')
      speechSynthesis.onvoiceschanged = () => initVoice(next)
    }
  }

  function speakText(text, next) {
    const msg = new SpeechSynthesisUtterance(text)
    msg.rate = options.rate
    msg.voice = voice
    msg.onend = () => playing && next()
    msg.onerror = console.log
    utterances.push(msg)
    speechSynthesis.speak(msg)
  }

  /* Chunk is a set of blast nodes sharing common block-style parent. Nodes in chunk are
     played and highlighted together. */
  function initChunks() {

    function displayType(elem) {
      return (elem.currentStyle || window.getComputedStyle(elem, '')).display
    }

    function closestBlock(elem) {
      while (displayType(elem) !== 'block' && elem.parentNode) {
        elem = elem.parentNode
      }
      return elem
    }

    document.normalize()
    $('body').blast({ delimiter: options.delimiter, customClass: 'looklistenread' })
    const regexFilter = new RegExp(options.regexFilter)
    const regexIgnore = new RegExp(options.regexIgnore)
    Array.from(document.getElementsByClassName('looklistenread'))
      .filter(span => regexFilter.test(span.innerText) && !regexIgnore.test(span.innerText))
         .forEach(span => {
           const chunk = chunks.length > 0 ? last(chunks) : null
           const block = closestBlock(span)
           if (chunk && chunk.block === block &&
               chunk.text.length + span.innerText.length <= options.maxLength
           ) {
             chunk.nodes.push(span)
             chunk.text += ' ' + span.innerText
           } else {
             const i = chunks.length
             chunks.push({
               nodes: [span],
               text: span.innerText,
               block: block,
               ix: i,
               actions: []
             })
             blocks.length > 0 && last(blocks).node === block ?
                     last(blocks).chunkIxs.push(i) :
                     blocks.push({node: block, chunkIxs: [i], actions: []})
           }
         })
  }
  
  function bringToRange(i, xs) {
    return i == null ? i : Math.max(0, Math.min(xs.length - 1, i))
  }

  function play() {
    chunkIx != null || gotoChunk(0)
    playing = true
    speakText(chunks[chunkIx].text, () => {
      chunkIx < chunks.length - 1 ? gotoChunk(chunkIx + 1) && play() : pause()
    })
  }
  
  function pause() {
    playing = false
    speechSynthesis.cancel()
  }

  function pauseOrResume() {
    playing ? pause() : play()
  }

  function reset(startPlaying) {
    if (playing) {
      pause()
      setTimeout(play, 30)
    } else if (startPlaying) {
      play()
    }
  }

  function stop() {
    pause()
    gotoChunk(null)
  }

  function gotoBlock(i) {
    i = bringToRange(i, blocks)
    blockIx === i || gotoChunk(blocks[i].chunkIxs[0]) && reset()
  }

  // Go to new chunk index, highlight the chunk nodes and return true if new chunk index is
  // not null.
  function gotoChunk(i) {
    i = bringToRange(i, chunks)
    if (chunkIx !== i) {
      chunkIx !== null &&
        chunks[chunkIx].nodes.forEach(node => $(node).removeClass('llr-active'))
      chunkIx = i
      blockIx = blocks.findIndex(block => block.chunkIxs.includes(chunkIx))
      if (chunkIx !== null) {
        chunks[chunkIx].nodes.forEach(node => $(node).addClass('llr-active'))
        chunks[chunkIx].nodes[0].scrollIntoViewIfNeeded()
      }
    }
    return chunkIx !== null
  }
  
  function speedup(percentage) {
    options.rate *= 1 + 0.01 * percentage
    reset()
  }

  function bindHotkey(hotkey, action) {
    Mousetrap.bind(hotkey, () => {
      action()
      return false
    })
  }

  function addListeners(event, chunkAction, blockAction) {
    chunkAction && chunks.forEach(chunk => {
      chunk.actions[event] = chunkAction(chunk)
      chunk.nodes.forEach(elem => elem.addEventListener(event, chunk.actions[event]))
    })
    blockAction && blocks.forEach(block => {
      block.actions[event] = blockAction(block)
      block.node.addEventListener(event, block.actions[event])
    })
  }

  function removeListeners(event) {
    chunks.forEach(chunk => chunk.nodes.forEach(elem =>
      elem.removeEventListener(event, chunk.actions[event])))
    blocks.forEach(block => block.node.removeEventListener(event, block.actions[event]))
  }

  const playChunk = chunk => e => {
    gotoChunk(chunk.ix) && reset(true)
    e.stopPropagation()
  }

  const playBlock = block => e => {
    gotoChunk(block.chunkIxs[0]) && reset(true)
    e.stopPropagation()
  }

  const firstChunkIx = readable => readable.ix != null ? readable.ix : readable.chunkIxs[0]

  const setStartPos = readable => e =>
    startPos.x === e.clientX && startPos.y === e.clientY || (startPos = {
      x : e.clientX,
      y : e.clientY,
      chunkIx: firstChunkIx(readable),
    })

  function enterMode(startSpeaking) {
    Mousetrap.unbind(options.hotkeys.enterMode)
    Object.keys(commands).forEach(cmd => bindHotkey(options.hotkeys[cmd], commands[cmd]))
    addListeners('dblclick', playChunk, playBlock)
    info('Enter speaking mode')
    startSpeaking && startPos.chunkIx != null && gotoChunk(startPos.chunkIx) && play()
  }

  function exitMode() {
    stop()
    Object.keys(commands).forEach(cmd => Mousetrap.unbind(options.hotkeys[cmd]))
    removeListeners('dblclick')
    bindHotkey(options.hotkeys.exitMode, exitMode)
    bindHotkey(options.hotkeys.enterMode, enterMode)
    info('Exit speaking mode')
  }

  return opts => {
    options = opts
    initChunks()
    addListeners('contextmenu', setStartPos, setStartPos)
    initVoice(() => {
      bindHotkey(options.hotkeys.enterMode, enterMode)
      /* addElementsListener('onmousedown', setLastMouseDown, setLastMouseDown);*/
      chrome.extension.onMessage.addListener(message => {
        message.action == "start" && enterMode(true);
      })
    })
  }

})()

chrome.storage.sync.get(defaults, LookListenRead)
