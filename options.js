var options;

var valueOpts = ['rate', 'voice', 'delimiter', 'maxLength', 'regexFilter', 'regexIgnore'];

function restore() {
  console.log("Reading options from sync storage...");
  chrome.storage.sync.get(defaults, items => {
    options = items;
    console.log(options);
    ['sentence', 'element']
      .forEach(x => document.getElementById('delimiter').options.add(new Option(x, x)));
    initVoiceOptions();
    valueOpts.forEach(name => document.getElementById(name).value = options[name]);
    initHotkeys();
  });
}

function save() {
  valueOpts.forEach(name => options[name] = document.getElementById(name).value);
  console.log(options);
  chrome.storage.sync.set(options, () => {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout((() => status.textContent = ''), 1000);
  });
}

function initVoiceOptions() {
  speechSynthesis.onvoiceschanged = () =>
    speechSynthesis.getVoices().forEach(voice =>
      document.getElementById('voice').options.add(new Option(
        voice.name + " " + (voice.localService ? "(local)" : "(remote)"),
        voice.name,
        false,
        voice.name == options.voice
      )));
}

function initHotkeys() {
  Object.keys(options.hotkeys).forEach(cmd =>
    defaults.hotkeys.hasOwnProperty(cmd) ? addHotkeyInput(cmd) : delete options.hotkeys[cmd]);
}

function addHotkeyInput(cmd) {
  var input = document.createElement('input');
  input.id = 'hotkey-' + cmd;
  input.setAttribute('type', 'button');
  input.setAttribute('value', options.hotkeys[cmd]);
  input.addEventListener('click', () => {
    Mousetrap.record(sequence => {
      // sequence is an array like ['ctrl+k', 'c']
      console.log(input.id);
      input.setAttribute('value', sequence.join(','));
      options.hotkeys[cmd] = sequence;
      save();
    });
  });
  var p = document.createElement('p');
  p.appendChild(document.createTextNode(cmd));
  p.appendChild(input);
  document.getElementById('hotkeys').appendChild(p);
}

document.addEventListener('DOMContentLoaded', () => {
  restore();
  valueOpts.forEach(name => document.getElementById(name).addEventListener('change', save));
});
