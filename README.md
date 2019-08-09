# efflux

## What is it ?

efflux is a JavaScript-based application that allows users to create music using user defined
WaveTable synthesis, all inside a browser. All sounds are oscillator based, therefor Efflux is a
modular synthesis environment, where the synths are driven by the tracker.

## Feature list

* Create custom waveforms for multiple synth instruments
* Directly edit instrument output using the pattern editor
* Copy / clone patterns for nice and easy arranging
* Save songs locally to continue working on them later or export / import them between devices
* Enter notes using an attached MIDI controller and/or record them live during playback

### Sounds cool, but I don't want to build from source, I just want to tinker with this!!

Of course, it was made to allow for easy composition, so let's cut the chatter!
You can use the application right now from  your web browser by visiting [this link](https://www.igorski.nl/experiment/efflux).

### The [Issue Tracker](https://github.com/igorski/efflux-tracker/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc) is your point of contact

Bug reports, feature requests, questions and discussions are welcome on the GitHub Issue Tracker, please do not send
e-mails through the development website. However, please search before posting to avoid duplicates, and limit to one
issue per post.

Please vote on feature requests by using the Thumbs Up/Down reaction on the first post.

## Project outline

All source code can be found in the _./src_-folder and is written in ES6 (transpiled to ES5 for use in the browser)

 * _./src/_ contains all JavaScript sourcecode with _main.js_ being the application entry point
 * _./src/assets_ contains all used fonts and images
 * _./src/services_ contains a variety of services used to integrate hardware interaction with the application
 * _./src/workers_ contains all Workers (will be inlined and loaded using Blob URLs) 
 * _./src/utils_ contains utilities for common operations or to orchestrate batch changes

Additional folders:

 * _./design_ contains SVG icons that are combined into an icon font (by fontello)
 * _./src/fixtures_ can be filled with separate JSON files containing Song data, these will be concatenated into
   a single file that can be requested via Ajax on the first application start to provide demo content
   (see _fixtures-loaders.js_)
 
## Application actors

Efflux is written using [Vue](https://vuejs.org). While originally the application was written without adopting any
framework, the design pattern adopted is similar to Vue and Vuex's reactivity model, with the benefit of Vue bringing
easier templating, data binding and event handling. As such the application has been migrated to use Vue and Vuex.

The Vuex store is defined in _./src/store/_ and its submodules in the _./src/store/modules/_-folder. Each part of
the application has its own module, these are:

 * _editor-module_ used to keep track of variables used for writing and editing patterns
 * _history-module_ used to keep track of mutation history to provide undo/redo functionality
 * _instrument-module_ provides a store to save, load and edit preset instruments (to be reused across songs)
 * _midi-module_ used to link MIDI hardware to the application (currently Google Chrome only)
 * _selection-module_ used to keep track of selections made in the pattern editor
 * _settings-module_ used to maintain persistent configurations
 * _song-module_ provides a store to save, load and edit songs
    
### Efflux song model

The model of an Efflux song consists of the following actors (created via their respective factories):

 * Song
 * Patterns
 * Events
 * Instruments
 * Modules
 
All of the latter are contained within a song (which is maintained by its own Vuex store module). A song has a list
of _PATTERNS_. A Pattern is basically a list of channels (one for each available track) and a descriptor for the amount
of _steps_ the pattern holds (e.g. 16, 32, 64, etc.).

Each pattern has _AUDIO_EVENTS_. These describe an action that should happen at a given step within a patterns
channel. These can be note on/note off instructions or module parameter automations, or both. An event references
an _INSTRUMENT_ that is will operate on. Note: not all events within a single pattern channel reference the
same instrument, this can be specified at the event level for more complex compositions.

As hinted above, a song also has _INSTRUMENTS_. There are an equal amount of instruments available as there are tracks
(also known as pattern channels). As the instruments in Efflux are synthesizers, each INSTRUMENT has a list of
_INSTRUMENT_OSCILLATORS_ which can be individually tuned and configured for playback.

INSTRUMENTS also reference _MODULES_. A MODULE is basically an effects processor. Each instrument can have its output
routed through multiple processors before its output is mixed into the master channel (by the _AudioController_).

### Efflux song model and Vuex

In Vuex, the song is stored in the _"song"_ store module. The editors bind directly to this reactive model, but for
audio playback, an additional Object structure (e.g. _AudioEvent.seq_) is used. This separates the _data_ aspect (maintained
by the Vuex store mutations) from the _audio rendering_.

The history module provides custom methods for saving and restoring individual actions for specific sections of a song.
While Vuex makes it easy to simply save an entire song upon each mutation, this will consume a lot of memory fast.

### Audio rendering

The synthesizer itself renders its output by use of the Web Audio API's _OscillatorNodes_ with _PeriodicWave_'s. All of
this logic is determined by _noteOn_ and _noteOff_ events (similar to the MIDI spec) that is handle by the _AudioService_.

The routing of audio paths and effect modules takes place in the same _AudioService_ via use of several utils. When in
doubt, the Vuex song model defines _what it should sound like_ while the AudioService takes care of actual sound rendering.
 
## Build instructions

You will need Node.js in order to run the build scripts and resolve the dependencies.

To build efflux, first resolve all dependencies using NPM:

```
npm install
```
 
After which a development mode can be started (which conveniently opens your browser and points it to the correct
location at _http://localhost:8080_) using the following Node command:

```
npm run serve
``` 

A production build (minimizes CSS and JS output size) can be created using the following command:

```
npm run build
``` 

After which the build output is available in the _./dist/_-folder.
 
## Unit testing

Unit tests are run via Jest. You can run the tests by using:

```
npm run test
``` 

Unit tests go in the _./tests_-folder. The file name for a unit test should equal the file it is testing, but contain
the suffix "_.spec_", e.g. _functions.js_ will have a test file _functions.spec.js_.

## TODO VUE MIGRATION

igorski.nl share integration
ensure Message.js is replaced with appropriate state mutations / minimize pubsub
igorski.nl Analytics

HANDLE_SAVE and VALIDATE_AND_GET_SONG message from outside > trigger save in menu

currentMeasure SHOULD BE REPLACED WITH activePattern (these wre tracked twice!?)

animate pattern input on switch

check mobile styles ?
submit to madewithvue :D
