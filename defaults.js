var defaults = {
  hotkeys: {
    next: ["right"],
    previous: ["left"],
    nextBlock: ["down"],
    previousBlock: ["up"],
    pauseOrResume: ["\\"],
    slowdown: ["["],
    speedup: ["]"],
    start: ["enter"],
    stop: ["esc"]
  },
  rate: "1.3",
  voice: "US English Female TTS (by Google)",
  delimiter: 'sentence',
  maxLength: 200,
  regexFilter: '\\S',
  regexIgnore: "^\\[[\\w ,]*\\]$"
}
