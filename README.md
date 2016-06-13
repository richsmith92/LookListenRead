# LookListenRead

## Overview

Chrome extension to read webpages aloud.

## Install

Clone the repo, or download and unpack zip from https://github.com/w3rs/LookListenRead/archive/master.zip

Go to `chrome://extensions`, check **Developer mode** checkbox on the top right, and click on **Load unpacked extension**.
Then navigate to `LookListenRead` folder.

You need to have TTS voices installed.
With Chrome, you probably already have some preinstalled, but they are likely to be remote.
With local voices the extension should perform better, with shorter pauses between pieces of text.

I use local [US English Female TTS (by Google)](https://chrome.google.com/webstore/detail/google-voice-by-google/kcnhkahnjcbndmmehfkdnkjomaanaooo?hl=en) for testing. If you want to use other voice, you should select it in the extension options.

## Usage

Open a webpage, select (e.g. double click) a piece where you want to start reading, and press `Enter` (or other hotkey you've configured for `start` command). `Esc` to stop, see or configure other hotkeys in the extension options.
