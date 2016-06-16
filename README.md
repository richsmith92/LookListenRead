# LookListenRead

## Overview

Chrome extension to read webpages aloud.

## Install

Clone the repo, or download and unpack zip from https://github.com/w3rs/LookListenRead/archive/master.zip

Go to `chrome://extensions`, check **Developer mode** checkbox on the top right, and click on **Load unpacked extension**.
Then navigate to `LookListenRead` folder.

You need to have TTS voices installed.
With Chrome, you probably already have some preinstalled, but they are likely to be remote, so there will be noticeable pauses between chunks of text.

I use local [US English Female TTS (by Google)](https://chrome.google.com/webstore/detail/google-voice-by-google/kcnhkahnjcbndmmehfkdnkjomaanaooo?hl=en) voice for testing. If you want to use other voice, you should select it in the extension options.

## Usage

Open a webpage, enter the speaking mode with `Ctrl+Enter` and double click where you want to start reading. `Space` to pause/resume and `Esc` to exit the speaking mode. See other hotkeys in the extension options.
