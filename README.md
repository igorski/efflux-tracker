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
You can use the application right now from  your web browser by visiting [this link](http://www.igorski.nl/experiment/efflux).

Project outline
---------------

All source code can be found in the _./src_-folder.

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
 
Build instructions
------------------

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
 * altering delay time only works from module parameter automation, not when dragging its slider in the instrument editor...
 * When adding a note or module change to a track, by default it should use the instrument of the previous note in the lane
 * delay module parameter mutations don't glide

ROADMAP
-------

 * Add pattern jump instructions
 * Add cut/paste icons for touch screen devices
 * Add EQ for each individual instrument for mix balancing
 * Improve arrow key navigation within patterns (there are odd jumps when switching direction)
 * Instrument mute / solo
 * Add overdrive (npm: wa-overdrive)
 * When selecting notes in noteEntry popup sound note when making changes to note / octave
