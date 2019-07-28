# efflux

## What is it ?

efflux is a JavaScript-based application that allows users to create music using user defined
WaveTable synthesis, all inside a browser.

## Feature list

- Create custom waveforms for multiple synth instruments
- Directly edit instrument output using the pattern editor
- Copy / clone patterns for nice and easy arranging
- Save songs locally to continue working on them later or export / import them between devices
- Input notes using a MIDI controller and/or record them live during playback

Sounds cool, but I don't want to build from source, I just want to tinker with this!!
-------------------------------------------------------------------------------------

Of course, it was made to allow for easy composition, so let's cut the chatter!
You can use the application right now from  your web browser by visiting [this link](https://www.igorski.nl/experiment/efflux).

### The [Issue Tracker](https://github.com/igorski/efflux-tracker/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc)
is your point of contact

Bug reports, feature requests, questions and discussions are welcome on the GitHub Issue Tracker, please do not send
e-mails through the development website. However, please search before posting to avoid duplicates, and limit to one
issue per post.

Please vote on feature requests by using the Thumbs Up/Down reaction on the first post.

## Project outline

All source code can be found in the _./src_-folder and is written in ES6 (transpiled to ES5 for use in the browser)

 * _./src/assets_ contains all CSS style declarations in .less format as well fonts
 * _./src/js_ contains all JavaScript sourcecode with _main.js_ being the application entry point
 * _./src/js/workers_ contains all Workers (will be inlined using Blob URLs via Workerify for ease of deployment)
 * _./src/templates_ contains all HMTL snippets used by the application in Handlebars format
 * _./src/public_html_ contains the main HTML page that will link to the source output 

Additional folders:

 * _./design_ contains SVG icons that are combined into an icon font (by fontello)
 * _./fixtures_ can be filled with separate JSON files containing Song data, these will be concatenated into
   a single file that can be requested via Ajax on the first application start to provide demo content
   (see FixturesLoader.js)
 
## Application actors

Efflux is written using [Vue](https://vuejs.org). While originally the application was written without adopting any
framework, the design pattern adopted is similar to Vue and Vuex's reactivity model, with the benefit of Vue bringing
easier templating, data binding and event handling.

Each part of the application is self-contained. State changes are communicated using the _publish / subscribe_
mechanism (using _pubsub-js_, with the messages defined in _./src/js/definitions/Messages_). As such, each part of
the application is a separate component only interested in the messages that can alter its state.
    
## Efflux model

The model of Efflux' consists of the following actors (created via their respective factories):

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
 
## Build instructions

You will need Node.js in order to run the build scripts and resolve the dependencies.

To build efflux, first resolve all dependencies using NPM:

    npm install
 
After which a development mode can be started (which conveniently opens your browser and points it to the correct
location at _http://localhost:8080_) using the following Node command:

    npm run serve
 
A production build (minimizes CSS and JS output size) can be created using the following command:

    npm run build
 
After which the build output is available in the _./dist/_-folder.
 
## Unit testing

Unit tests are run via Jest. You can run the tests by using:

    npm run test
 
Unit tests go in the _./test_-folder. The file name for a unit test must be equal to the file it is testing, but contain
the suffix "_.spec_", e.g. _Functions.js_ will have a test file _Functions.spec.js_.

## ROADMAP

 * When copy pasting a pattern in the same channels, don't adjust the note's channels indices
 * Move linked list update logic from PatternTrackListController to EventUtil (_linkEvent()_ & _clearEvent()_)
 * Add pattern jump instructions
 * Add cut/paste icons for touch screen devices
 * Implement Instrument mute / solo

## TODO VUE MIGRATION

FONTS!
Mouse and horizontal keyboard control
Record output
move instrumentModule active oscillator and instrument to editorModule (can we remove instrumentModule.instrumentId and rely on editor.activeInstrument instead??)
igorski.nl share integration
unit tests > jest
ensure Message.js is replaced with appropriate state mutations / minimize pubsub
igorski.nl Analytics

what is the difference between editor.recordingInput and sequencer.recording ??? -> one is for recording output, RENAME!!

HANDLE_SAVE and VALIDATE_AND_GET_SONG message from outside > trigger save in menu

editormodule.activeStep/activeInstrument > should become selected step/instrument (setters and mapped getters too)!
activeInstrument > name activeChannel across the app
currentMeasure SHOULD BE REPLACED WITH activePattern (these wre tracked twice!?)
store.setOverlay() -> should indicate its a modal component
rename stateFactory and related stuff to historyState

editormodule -> active/step/instrument should be renamed to reflect they are being edited
rename States to HistoryStates

submit to madewithvue :D

## LONG TERM TODO (make Git issues once Vue migration is in master)

vue i18n
Create separate component for MIDI settings panel
Clean up helpSection (do not inline all topics)
CSS no tag selectors in critical areas (replace ids with classes in scoped components)
