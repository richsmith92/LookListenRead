const defaults = {
  hotkeys: {
    enterMode: ['ctrl+enter'],
    next: ['right'],
    previous: ['left'],
    nextBlock: ['down'],
    previousBlock: ['up'],
    pauseOrResume: ['space'],
    slowdown: ['['],
    speedup: [']'],
    exitMode: ['esc'],
  },
  rate: '1.3',
  voice: 'US English Female TTS (by Google)',
  delimiter: 'sentence',
  maxLength: 200,
  regexFilter: '\\S',
  regexIgnore: '^\\[[\\w ,]*\\]$',
}
