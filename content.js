// ==UserScript==
// @name         LookListenRead
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @include      http://*
// @include      https://*
// @include      file://*
// @require      https://code.responsivevoice.org/responsivevoice.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.0.0-rc1/jquery.min.js

// @grant        none
// ==/UserScript==

var LookListenRead = (function() {

  var defaults = {
    lang: "en-US",
    rate: 1.2
  };
  
  var Status = {
    PLAYING : 1,
    STOPPED : 2,
    PAUSED : 3
  };
  var rate = defaults.rate;
  var status = Status.STOPPED, voice, textNodes, markedNode, position;

  var log = console.log.bind(console);
  
  function getTextNodesIn(node, maxNodes) {
    var textNodes = [], nonWhitespaceMatcher = /\S/;
    var count = 0;
    function getTextNodes(node) {
      if (maxNodes == null || count < maxNodes) {
        if (node.nodeType == 3) {
          if (nonWhitespaceMatcher.test(node.nodeValue)) {
            textNodes.push(node);
            count++;
          }
        } else {
          for (var i = 0, len = node.childNodes.length; i < len; ++i) {
            getTextNodes(node.childNodes[i]);
          }
        }
      }
    }
    getTextNodes(node);
    return textNodes;
  }

  function speakNode(textNode, cont) {
    var msg = new SpeechSynthesisUtterance(textNode.textContent);
    msg.rate = rate;
    msg.voice = voice;
    msg.onend = function(e) {
      /* console.log(e);*/
      if (status === Status.PLAYING) {
        cont();
      }
    };
    msg.onerror = function(e) { console.log(e); };
    speechSynthesis.speak(msg);
  }

  function initVoice() {
    voice = speechSynthesis.getVoices().filter(function(x){
      return x.localService && x.lang == defaults.lang;
      })[0];
  }

  function initPosition() {
    var selection = getSelection();
    if (selection.rangeCount > 0) {
      var selected = selection.getRangeAt(0).commonAncestorContainer;
      var first = getTextNodesIn(selected, 1)[0];
      position = textNodes.findIndex(function(x){return x == first;});
    } else {
      position = 0;
    }
  }
  
  function init() {
    if (voice) {
      if (!textNodes) {
        textNodes = getTextNodesIn($("body")[0]);
      }
      /* log("Voice", voice);*/
      speechSynthesis.cancel();
      initPosition();
      }
    else {
      alert("Voice not loaded yet, please try again");
    }
  }

  function unmark(node) {
    if (node && node.parentNode.tagName == "MARK") {
      $(node).unwrap();
    }
  }
  
  function updateMark() {
    unmark(markedNode);
    if (status !== Status.STOPPED) {
      markedNode = textNodes[position];
      $(markedNode).wrap("<mark></mark>");
      }
  }

  function start() {
    stop();
    init();
    setTimeout(play, 200);
  }

  function play() {
    status = Status.PLAYING;
    updateMark();
    speakNode(textNodes[position], function() {
      if (position < textNodes.length - 1) {
        position++;
        play();
      } else {
        stop ();
      }
    });
  }

  function pause() {
    status = Status.PAUSED;
    speechSynthesis.cancel();
  }

  function pauseOrResume() {
    if (status === Status.PLAYING) {
      pause();
    } else if (status === Status.PAUSED) {
      play();
    }
  }

  function stop() {
    status = Status.STOPPED;
    updateMark()
    speechSynthesis.cancel();
  }

  function goto(pos) {
    var rewind = pos < position;
    position = pos;
    if (status == Status.PLAYING) {
      stop();
      setTimeout(play, 200);
    }
    updateMark();
  }
  
  function speedup(percentage) {
    rate = rate * (1 + percentage/100);
    if (status == Status.PLAYING) {
      pause(); setTimeout(play, 200);
    }
  }
  
  function keyHandler(e) {
    if (e.keyCode==39) { // ->
      goto(position+1);
    } else if (e.keyCode==37) { // <-
      goto(position-1);
    } else if (e.keyCode == 38 && e.ctrlKey) { // ctrl + up
      speedup(10);
    } else if (e.keyCode == 40 && e.ctrlKey) { // ctrl + down
      speedup(-10);
    } else if (e.keyCode==67) { // c
      pauseOrResume();
    } else if (e.keyCode==13) { // enter
      start();
    } else if (e.keyCode==27 || e.keyCode == 86) { // esc or v
      stop();
    }
  }

  speechSynthesis.onvoiceschanged = function() {
    initVoice();
  };

  return {
    keyHandler: keyHandler
  };
})();

$(document).keydown(LookListenRead.keyHandler);

$(document).ready(function() {});
