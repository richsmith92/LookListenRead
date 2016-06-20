/* global $, Mousetrap, chrome, defaults */

const LookListenRead = (() => {

  const last = xs => xs[xs.length - 1]
  const info = s => console.log('LookListenRead: ' + s)

  let playing = false
  let chunkIx = null
  let blockIx = null
  let options
  let voice
  let startPos = {x: null, y: null, chunkIx: null}
  const chunks = []
  const blocks = []
  const utterances = []

  const initVoice = next => {
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

  const speakText = (text, next) => {
    const msg = Object.assign(new SpeechSynthesisUtterance(text), {
      rate: options.rate,
      voice: voice,
      onend: () => playing && next(),
      onerror: info,
    })
    utterances.push(msg) // see http://stackoverflow.com/a/35935851/713303
    speechSynthesis.speak(msg)
  }

  /* Chunk is a set of blast nodes sharing common block-style parent. Nodes in chunk are
     uttered and highlighted together. */
  const initChunks = () => {

    const displayType = elem =>
      (elem.currentStyle || window.getComputedStyle(elem, '')).display

    const closestBlock = elem => {
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
               actions: [],
             })
             blocks.length > 0 && last(blocks).node === block ?
                     last(blocks).chunkIxs.push(i) :
                     blocks.push({node: block, chunkIxs: [i], actions: []})
           }
         })
  }
  
  const bringToRange = (i, xs) => {
    return i == null ? i : Math.max(0, Math.min(xs.length - 1, i))
  }

  const play = () => {
    chunkIx != null || gotoChunk(0)
    playing = true
    speakText(chunks[chunkIx].text, () => {
      chunkIx < chunks.length - 1 ? gotoChunk(chunkIx + 1) && play() : pause()
    })
  }
  
  const pause = () => {
    playing = false
    speechSynthesis.cancel()
  }

  const pauseOrResume = () => {
    playing ? pause() : play()
  }

  const reset = startPlaying => {
    if (playing) {
      pause()
      setTimeout(play, 30)
    } else if (startPlaying) {
      play()
    }
  }

  const stop = () => {
    pause()
    gotoChunk(null)
  }

  const gotoBlock = (i) => {
    i = bringToRange(i, blocks)
    blockIx === i || gotoChunk(blocks[i].chunkIxs[0]) && reset()
  }

  // Go to new chunk index, highlight the chunk nodes and return true if new chunk index is
  // not null.
  const gotoChunk = (i) => {
    i = bringToRange(i, chunks)
    if (chunkIx !== i) {
      chunkIx != null &&
        chunks[chunkIx].nodes.forEach(node => $(node).removeClass('llr-active'))
      chunkIx = i
      blockIx = blocks.findIndex(block => block.chunkIxs.includes(chunkIx))
      if (chunkIx != null) {
        chunks[chunkIx].nodes.forEach(node => $(node).addClass('llr-active'))
        chunks[chunkIx].nodes[0].scrollIntoViewIfNeeded()
      }
    }
    return chunkIx != null
  }
  
  const speedup = percentage => {
    options.rate *= 1 + 0.01 * percentage
    reset()
  }

  const bindHotkey = (hotkey, action) => {
    Mousetrap.bind(hotkey, () => {
      action()
      return false
    })
  }

  const addListeners = (event, action) => {
    chunks.forEach(chunk => {
      chunk.actions[event] = action(chunk)
      chunk.nodes.forEach(elem => elem.addEventListener(event, chunk.actions[event]))
    })
    blocks.forEach(block => {
      block.actions[event] = action(block)
      block.node.addEventListener(event, block.actions[event])
    })
  }

  const removeListeners = event => {
    chunks.forEach(chunk => chunk.nodes.forEach(elem =>
      elem.removeEventListener(event, chunk.actions[event])))
    blocks.forEach(block => block.node.removeEventListener(event, block.actions[event]))
  }

  const firstChunkIx = readable => readable.ix != null ? readable.ix : readable.chunkIxs[0]

  const setStartPos = readable => e =>
    startPos.x === e.clientX && startPos.y === e.clientY || (startPos = {
      x: e.clientX,
      y: e.clientY,
      chunkIx: firstChunkIx(readable),
    })

  const commands = {
    next: () => gotoChunk(chunkIx + 1) && reset(),
    previous: () => gotoChunk(chunkIx - 1) && reset(),
    nextBlock: () => gotoBlock(blockIx + 1),
    previousBlock: () => gotoBlock(blockIx - 1),
    pauseOrResume: () => pauseOrResume(),
    slowdown: () => speedup(-10),
    speedup: () => speedup(10),
    exitMode: () => exitMode(),
  }

  const enterMode = startSpeaking => {
    Mousetrap.unbind(options.hotkeys.enterMode)
    Object.keys(commands).forEach(cmd => bindHotkey(options.hotkeys[cmd], commands[cmd]))
    addListeners('dblclick', readable => e => {
      gotoChunk(firstChunkIx(readable)) && reset(true)
      e.stopPropagation()
    })
    info('Enter speaking mode')
    startSpeaking && gotoChunk(startPos.chunkIx) && play()
  }

  const exitMode = () => {
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
    addListeners('contextmenu', setStartPos)
    initVoice(() => {
      bindHotkey(options.hotkeys.enterMode, enterMode)
      chrome.extension.onMessage.addListener(message => 
        message.action === 'start' && enterMode(true))
    })
  }

})()

chrome.storage.sync.get(defaults, LookListenRead)
