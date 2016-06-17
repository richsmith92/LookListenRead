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

Open a webpage, right click where you want to start reading, and select **Start speaking here** from the context menu. Alternatively, enter the speaking mode with `Ctrl+Enter` and double click on text where you want to start. `Space` to pause/resume and `Esc` to exit the speaking mode.

The webpage text is split into HTML text nodes, and by default new text node is created for each sentence. HTML elements like bold text or hyperlinks have their own text nodes, so they are treated as separate sentences.

Then text nodes are merged into chunks with specified minimum length, to avoid pauses in speech between sentences. You can navigate between chunks with `←` and `→` keys. Active chunk is higlighted.

Chunks are grouped into blocks, corresponding to HTML block-level elements, e.g. paragraphs. You can navigate between blocks by `↑` and `↓` arrows.

