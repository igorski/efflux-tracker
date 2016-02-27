slocum-tracker
==============

What is it ?
------------

Slocum Tracker is a JavaScript-based application that allows you to compose music for the Atari 2600 using a
tracker style interface. Slocum Tracker gets its name from the fact that it exports its output into assembly
code which can be used with Paul Slocums tracker. Slocum Tracker as such outputs no sound, but rather
instructions that can be compiled alongside Slocums audio driver so you can listen to the results in
an emulator / actual Atari 2600. Slocum Tracker basically leverages the fact that having to write music
directly into assembly language can be a tad annoyi... er, _slow down the creative juices_.

I just want to tinker with this
-------------------------------

You can immediately run the application in your web browser by visiting: - link to follow -

Build instructions
------------------

To build slocum-tracker first resolve all dependencies using Node:

    npm install
    
After which a development mode can be started using the following Grunt command:

    grunt dev
    
Unit testing
------------

Unit tests are run via mocha, which is installed as a dependency. You can run the tests by running:

    npm test
    
Unit tests go in the _./test_-folder. The file name for a unit test must be equal to the file it is testing, but contain
the suffix "_.test_", e.g. _Functions.js_ will have a test file _Functions.test.js_.

NOTE : Node v4.0 or higher must be installed for running the tests (depends on jsdom)
