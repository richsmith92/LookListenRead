var options;

function restore() {
  console.log("Reading options from sync storage...");
  chrome.storage.sync.get(defaults, function(items) {
    options = items;
    console.log(options);
    document.getElementById('rate').value = items.rate;
    initVoiceOptions();
    initHotkeys();
  });
}

function save() {
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
      var opt = document.createElement('option');
      if (voice.name == options.voice) {
        opt.setAttribute('selected', 'selected');
      }
      opt.setAttribute('value', voice.name);
      opt.innerText = voice.name + " " + (voice.localService ? "(local)" : "(remote)");
      document.getElementById('voice').appendChild(opt);
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

document.addEventListener('DOMContentLoaded', restore);
document.getElementById('voice').addEventListener('change', save);
document.getElementById('rate').addEventListener('change', save );
