// Saves options to chrome.storage.sync.

function save() {
  chrome.storage.sync.set({
    voice: document.getElementById('voice').value,
    rate: document.getElementById('rate').value
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 1000);
  });
}

function restore() {
  chrome.storage.sync.get({ // keys with default values
    voice: null,
    rate: 1
  }, function(items) {
    document.getElementById('rate').value = items.rate;
    initVoiceOptions(items.voice);
  });
}

function initVoiceOptions(defaultVoice) {
  speechSynthesis.onvoiceschanged = function() {
    speechSynthesis.getVoices().forEach(function(voice) {
      var opt = document.createElement('option');
      if (voice.name == defaultVoice) {
        opt.setAttribute('selected', 'selected');
      }
      opt.setAttribute('value', voice.name);
      opt.innerText = voice.name + " " + (voice.localService ? "(local)" : "(remote)");
      document.getElementById('voice').appendChild(opt);
    });
  }
}

document.getElementById('voice').addEventListener('change', save);
document.getElementById('rate').addEventListener('change', save );
document.addEventListener('DOMContentLoaded', restore);
