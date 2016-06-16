let options

const $ = id => document.getElementById(id)

const valueOpts = ['rate', 'voice', 'delimiter', 'maxLength', 'regexFilter', 'regexIgnore']

function restore() {
  console.log("Reading options from sync storage...")
  chrome.storage.sync.get(defaults, items => {
    options = items
    console.log(options)
    ;['sentence', 'element'].forEach(x => $('delimiter').options.add(new Option(x, x)))
    initVoiceOptions()
    valueOpts.forEach(name => $(name).value = options[name])
    initHotkeys()
  })
}

function save() {
  valueOpts.forEach(name => options[name] = $(name).value)
  console.log(options)
  chrome.storage.sync.set(options, () => {
    // Update status to let user know options were saved.
    const status = $('status')
    status.textContent = 'Options saved.'
    setTimeout((() => status.textContent = ''), 1000)
  })
}

function initVoiceOptions() {
  speechSynthesis.onvoiceschanged = () =>
    speechSynthesis.getVoices().forEach(voice =>
      $('voice').options.add(new Option(
        voice.name + " " + (voice.localService ? "(local)" : "(remote)"),
        voice.name,
        false,
        voice.name == options.voice
      )))
}

function initHotkeys() {
  Object.keys(options.hotkeys).forEach(cmd =>
    defaults.hotkeys.hasOwnProperty(cmd) ? addHotkeyInput(cmd) : delete options.hotkeys[cmd])
}

function addHotkeyInput(cmd) {
  const input = document.createElement('input')
  input.id = 'hotkey-' + cmd
  input.setAttribute('type', 'button')
  input.setAttribute('value', options.hotkeys[cmd])
  input.addEventListener('click', () => {
    Mousetrap.record(sequence => {
      // sequence is an array like ['ctrl+k', 'c']
      console.log(input.id)
      input.setAttribute('value', sequence.join(','))
      options.hotkeys[cmd] = sequence
      save()
    })
  })
  const p = document.createElement('p')
  p.appendChild(document.createTextNode(cmd))
  p.appendChild(input)
  $('hotkeys').appendChild(p)
}

document.addEventListener('DOMContentLoaded', () => {
  restore()
  valueOpts.forEach(name => $(name).addEventListener('change', save))
})
