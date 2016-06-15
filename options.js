var options;

var valueOpts = ['rate', 'voice', 'delimiter'];

function restore() {
  console.log("Reading options from sync storage...");
  chrome.storage.sync.get(defaults, function(items) {
    options = items;
    console.log(options);
    document.getElementById('rate').value = items.rate;
    ['sentence', 'element'].forEach(function(x) {
      document.getElementById('delimiter').options.add(
        new Option(x, x, false, x == options.delimiter));
    });
    initVoiceOptions();
    initHotkeys();
  });
}

function save() {
  valueOpts.forEach(function(name){
    options[name] = document.getElementById(name).value;
  });
  console.log(options);
  chrome.storage.sync.set(options, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 1000);
  });
}

function initVoiceOptions() {
  speechSynthesis.onvoiceschanged = function() {
    speechSynthesis.getVoices().forEach(function(voice) {
      document.getElementById('voice').options.add(new Option(
        voice.name + " " + (voice.localService ? "(local)" : "(remote)"),
        voice.name,
        false,
        voice.name == options.voice
      ));
    });
  }
}

function initHotkeys() {
  Object.keys(options.hotkeys).forEach(function(cmd){
    if (defaults.hotkeys.hasOwnProperty(cmd)) {
      addHotkeyInput(cmd);
    } else {
      // remove anything extra
      delete options.hotkeys[cmd];
    }
  });
}

function addHotkeyInput(cmd) {
  var input = document.createElement('input');
  input.id = 'hotkey-' + cmd;
  input.setAttribute('type', 'button');
  input.setAttribute('value', options.hotkeys[cmd]);
  input.addEventListener('click', function(){
    Mousetrap.record(function(sequence) {
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

document.addEventListener('DOMContentLoaded', function(){
  restore();
  valueOpts.forEach(function(name){
    document.getElementById(name).addEventListener('change', save);
  });
});
