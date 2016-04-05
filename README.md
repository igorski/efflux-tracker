zTtracker
=========

What is it ?
------------

zTracker is a JavaScript-based application that allows you to make

Feature list
------------

- Create custom waveforms for multiple synth instruments
- Directly edit instrument output using the pattern editor
- Copy / clone patterns for nice and easy arranging
- Save songs locally and continue working on them later (just don't clear the browsers local storage!)
- Input notes using a MIDI controller

Sounds cool, but I don't want to build from source, I just want to tinker with this!!
-------------------------------------------------------------------------------------

Of course, it was made to allow for easy composition, so let's cut the chatter!
You can use the application right now from  your web browser by visiting [this link](http://www.igorski.nl/experiment/ztracker).

Build instructions
------------------

To build zTracker first resolve all dependencies using Node:

    npm install
    
After which a development mode can be started (which conveniently opens your browser and points it to the correct
location) using the following Grunt command:

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
