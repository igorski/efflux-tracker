# efflux

[![MadeWithVueJs.com shield](https://madewithvuejs.com/storage/repo-shields/1779-shield.svg)](https://madewithvuejs.com/p/efflux-music-tracker/shield-link)

## What is it ?

Efflux is an application that allows users to create music inside their browser. Efflux is a tracker and
follows conventions familiar to those who have used anything from Ultimate Soundtracker to Renoise.
All sounds are oscillator (or wave table) based and can be routed through an effects signal path, making Efflux a
modular synthesis environment, where the synths are driven by the tracker.

## Feature list

* Create custom waveforms for multiple synth instruments
* Tons of keyboard shortcuts to provide nice and easy arranging using cutting, copying and cloning of (sub)patterns
* State history that allows undo / redo of your actions
* Save songs locally to continue working on them later or export / import them between devices
* Save your favourite instrument presets to be reused
* Attach a MIDI controller and record them live during playback (Google Chrome only)

### Sounds cool, but I don't want to build from source, I just want to tinker with this!!

Of course, this was made to allow for instant composition, so let's cut the chatter!
You can use the application right now from  your web browser by visiting [this link](https://www.igorski.nl/experiment/efflux).

### The [Issue Tracker](https://github.com/igorski/efflux-tracker/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc) is your point of contact

Bug reports, feature requests, questions and discussions are welcome on the GitHub Issue Tracker, please do not send
e-mails through the development website. However, please search before posting to avoid duplicates, and limit to one
issue per post.

Please vote on feature requests by using the Thumbs Up/Down reaction on the first post.

## Project outline

All source code can be found in the _./src_-folder and is written in ES6 following the ES2017 spec. Efflux is written
using [Vue](https://vuejs.org).

 * _./src/_ contains all JavaScript sourcecode with _main.js_ and _efflux-application.vue_ being the application entry points
 * _./src/assets_ contains all used fonts and images
 * _./src/model_ contains factories and utilities to create an Efflux song (see _"Efflux song model"_ below)
 * _./src/services_ contains a variety of services used to integrate hardware interaction within the application
 * _./src/workers_ contains all Workers (which will be inlined into the compiled output and loaded as Blobs)
 * _./src/utils_ contains utilities for common operations or to orchestrate batch changes

Additional folders:

 * _./design_ contains SVG icons that are combined into a webfont (currently done manually through Fontello)
 * _./src/fixtures_ can be filled with separate JSON files containing Song data, these will be concatenated into
   a single file that can be requested via Ajax on the first application start to provide demo content
   (see _fixtures-loader.js_)

## Application actors

The Vuex store is defined in _./src/store/_ and its submodules in the _./src/store/modules/_-folder. Each part of
the application has its own module, these are:

 * _editor-module_ used to keep track of user interactions when editing patterns
 * _history-module_ used to keep track of song mutation history to provide undo/redo functionality
 * _instrument-module_ provides a store to save, load and edit instruments presets
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

A song contains a list of _PATTERNS_. A Pattern contains a list of _channels_ (one for each available track) and a
descriptor for the amount of _steps_ the pattern contains (e.g. 16, 32, 64, etc.).

Each channel inside a pattern contains _AUDIO_EVENTS_. These describe an action that should happen at a given step within a patterns
channel. These can be note on/note off instructions or module parameter automations, or both. Each event references
an _INSTRUMENT_ that it will operate on (as not all events within a single pattern channel necessarily reference the
same instrument to allow for more complex compositions).

As hinted above, a song also has _INSTRUMENTS_. There are an equal amount of instruments available as there are tracks
(the pattern channels). By default each channel references its own instruments. As the instruments in Efflux are
synthesizers, each INSTRUMENT has a list of _INSTRUMENT_OSCILLATORS_ which can be individually tuned and configured for playback.

INSTRUMENTS also reference _MODULES_. A MODULE is basically an effects processor. Each instrument can have its output
routed through multiple processors before its output is mixed into the master channel (by the _AudioService_).

### Efflux song model and Vuex

In Vuex, the song is stored inside its own Vuex store module _"song-module.js"_. The editors bind directly to this reactive model, but for
audio playback, an additional Object structure (e.g. _AudioEvent.seq_) is used. This separates the _data_ aspect (maintained
by the Vuex store mutations) from the _audio rendering_.

The history module provides custom methods for saving and restoring individual actions for specific sections of a song.
While Vuex makes it easy to simply save an entire song upon each mutation, this will consume a lot (!) of memory fast.

### Audio rendering

The synthesizer itself renders its output by use of the Web Audio API's _OscillatorNodes_ and _PeriodicWave_. All of
this logic is determined by _noteOn_ and _noteOff_ events (similar to the MIDI spec) that is handled by the _AudioService_.
The routing of audio paths, connecting of nodes and effect modules, recording, etc. is handled by the same service, see the
_./services/audio/_-folder.

When in doubt of how the audio output relates to the visual interface, remember that the Vuex song model defines _what it
should sound like_ (as in: defines the properties of the instruments) while the AudioService takes care of the actual
sound rendering, outside of Vue.

### Wiki

For more in-depth topics, you can consult the [Wiki on GitHub](https://github.com/igorski/efflux-tracker/wiki).

## Build instructions

You will need Node.js in order to run the build scripts and resolve the dependencies.

To build Efflux, first resolve all dependencies using NPM:

```
npm install
```

After which a development mode can be started (which conveniently opens your browser and points it to the correct
location at _http://localhost:8080_) using the following Node command:

```
npm run serve
```

A minified and transpiled production build can be created using the following command:

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
the _.spec_-suffix, e.g. _functions.js_ will have a test file _functions.spec.js_.
