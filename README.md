zTracker
========

What is it ?
------------

zTracker is a JavaScript-based application that allows users to create music using user defined
WaveTable synthesis, all inside a browser.

Feature list
------------

- Create custom waveforms for multiple synth instruments
- Directly edit instrument output using the pattern editor
- Copy / clone patterns for nice and easy arranging
- Save songs locally to continue working on them later or export / import them between devices
- Input notes using a MIDI controller

Sounds cool, but I don't want to build from source, I just want to tinker with this!!
-------------------------------------------------------------------------------------

Of course, it was made to allow for easy composition, so let's cut the chatter!
You can use the application right now from  your web browser by visiting [this link](http://www.igorski.nl/experiment/ztracker).

Project outline
---------------

All sources can be found in the _./src_-folder.

 * _./src/assets_ contains all CSS style declarations in .less format as well fonts
 * _./src/js_ contains all JavaScript sourcecode with _main.js_ being the application entry point
 * _./src/workers_ contains all JavaScript Workers (will be served as separate files when requested)
 * _./src/templates_ contains all HMTL snippets used by the application in Handlebars format
 * _./src/public_html_ contains the main HTML page that will link to the source output
 
The build scripts are defined in _./Gruntfile.js_ and includes snippets defined in the _./config_-folder.
 
Build instructions
------------------

To build zTracker first resolve all dependencies using Node:

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

TODO
----

 * Implement per-instrument volume slider
 * Implement delay
 * Add modulator parameters to adjust modules from the tracker
 * Implement correct sequence range
 * Implement MIDI control
 * Implement audio export
 * Support mouse drag for selection
 
KNOWN BUGS
----------

 * When adding a note to a track, by default it should use the instrument of the previous note in the lane
 * When copy-pasting an existing pattern into a new pattern, the new pattern is silent
 * When saving a song, the date is off!
 * When re-opening the instrument editor, it shows the first instrument (show current tracks instrument)
