efflux
======

What is it ?
------------

efflux is a JavaScript-based application that allows users to create music using user defined
WaveTable synthesis, all inside a browser.

Feature list
------------

- Create custom waveforms for multiple synth instruments
- Directly edit instrument output using the pattern editor
- Copy / clone patterns for nice and easy arranging
- Save songs locally to continue working on them later or export / import them between devices
- Input notes using a MIDI controller and/or record them live during playback

Sounds cool, but I don't want to build from source, I just want to tinker with this!!
-------------------------------------------------------------------------------------

Of course, it was made to allow for easy composition, so let's cut the chatter!
You can use the application right now from  your web browser by visiting [this link](https://www.igorski.nl/experiment/efflux).

Project outline
---------------

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
 
The build scripts are defined in _./Gruntfile.js_ and includes snippets defined in the _./config_-folder.

Application actors
------------------

Efflux is written without using any of the large selection of JS frameworks. Instead, it follows _design patterns_.
Each part of the application is self-contained. State changes are communicated using the _publish / subscribe_
mechanism (using _pubsub-js_, with the messages defined in _./src/js/definitions/Messages_). As such, each part of
the application is a separate component only interested in the messages that can alter its state.

A quick summary:

    ./src/js/model

contains the model of the application. This holds editor state (EditorModel), instrument state (InstrumentModel),
general settings (SettingsModel), the "song"/project that is being edited (SongModel) as well as model for
selection (SelectionModel) and undo/redo history (StateModel). Most models have factories to create their
respective entities, as well as validators.
    
    ./src/js/controller
    
contains the controllers of the application. The controllers are responsible for monitoring state changes
instructed from the views, as well as listening to model state changes and broadcasting these to the view.
Note: not all controllers have a view (e.g. keyboard and MIDI controller handle input messages and broadcast
these to subscribed listeners).
    
    ./src/js/view
    
contains all the views that are mediated by the controllers. The views reference HTML templates (the Handlebars
snippets in _/src/templates_) and attach event listeners which can be used to communicate UI changes back
to the controller. Note: at the moment of writing most Views are still embedded within the controllers and
need to be separated.
    
Efflux model
------------

The model of Efflux' consists of the following actors (created via their respective factories):

 * Song
 * Patterns
 * Events
 * Instruments
 * Modules
 
All of the latter are contained within a song. A song has a list of _PATTERNS_. A Pattern is basically a list
of channels (one for each available track) and a descriptor for the amount of _steps_ the pattern holds (e.g.
16, 32, 64, etc.).

Each pattern has _AUDIO_EVENTS_. These describe an action that should happen at a given step within a patterns
channel. These can be note on/note off instructions or module parameter automations, or both. An event references
an _INSTRUMENT_ that is will operate on. Note: not all events within a single pattern channel reference the
same instrument, this can be specified at the event level for more complex compositions.

As hinted above, a song also has _INSTRUMENTS_. There are an equal amount of instruments available as there are tracks
(also known as pattern channels). As the instruments in Efflux are synthesizers, each INSTRUMENT has a list of
_INSTRUMENT_OSCILLATORS_ which can be individually tuned and configured for playback.

INSTRUMENTS also reference _MODULES_. A MODULE is basically an effects processor. Each instrument can have its output
routed through multiple processors before its output is mixed into the master channel (by the _AudioController_).
 
Build instructions
------------------

You will need Node.js in order to run the build scripts and resolve the dependencies. The build script is
run using Grunt.

To build efflux first resolve all dependencies using Node:

    npm install
 
After which a development mode can be started (which conveniently opens your browser and points it to the correct
location at _http://localhost:3000_) using the following Grunt command:

    grunt dev
 
A production build (minimizes CSS and JS output size) can be created using the following Grunt command:

    grunt build
 
After which the build output is available in the _./dist/prod_-folder.
 
Unit testing
------------

Unit tests are run via Mocha, which is installed as a dependency. You can run the tests by using:

    npm test
 
Unit tests go in the _./test_-folder. The file name for a unit test must be equal to the file it is testing, but contain
the suffix "_.test_", e.g. _Functions.js_ will have a test file _Functions.test.js_.

NOTE : Node v 4.0 or higher must be installed for running the tests (these depend on jsdom)

KNOWN BUGS
----------

 * pitch down automation works in reverse...
 * delay module parameter mutations don't glide
 * delay time is clamped to 0 - 1 yet the application uses a different range

ROADMAP
-------

 * Separate view logic from controllers (in progress)
 * Separate InstrumentController and InstrumentView into separate objects for each module (kinda bloated...)
 * Investigate whether to clean up unused views and listeners (there is no memory leakage and the additional garbage collection might even be bad)
 * When copy pasting a pattern in the same channels, don't adjust the note's channels indices
 * Move linked list update logic from PatternTrackListController to EventUtil (_linkEvent()_ & _clearEvent()_)
 * Minimize vendor libraries
 * Add pattern jump instructions
 * Add cut/paste icons for touch screen devices
 * Improve arrow key navigation within patterns (there are odd visual jumps when switching direction)
 * Implement Instrument mute / solo
