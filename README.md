slocum-tracker
==============

What is it ?
------------

Slocum Tracker is a JavaScript-based application that allows you to compose music for the Atari 2600 using a
tracker style interface. Slocum Tracker gets its name from the fact that it exports its output into assembly
code which can be fed to Paul Slocums Sequencer Kit (an audio driver that allows you to sequence sounds within
a musical context). Slocum Tracker as such outputs no sound by itself, but rather the instructions that can be compiled
alongside Slocums audio driver so you can listen to the results in an emulator / actual Atari 2600. Slocum Tracker
basically leverages the fact that having to write music directly into assembly language can be a tad annoyi...
er, _slows down the creative juices_.

Feature list
------------

- Directly edit the Atari 2600's two available output channels using the pattern editor
- Quickly select from all available waveforms / sound types using convenient keyboard shortcuts
- Copy / clone patterns for nice and easy arranging
- Save songs locally and continue working on them later (just don't clear the browsers local storage!)
- Generate assembly instructions when ready
- Duplicate patterns are declared only once to minimize program size

Sounds cool, but I don't want to build from source, I just want to tinker with this!!
-------------------------------------------------------------------------------------

Of course, it was made to allow for easy composition, so let's cut the chatter!
You can use the application right now from  your web browser by visiting: - link to follow -

Do pay heed to the "How to create an Atari ROM for my composition"-section below to understand how
to get the generated output from Slocum Tracker to play back sweet, pristine music on an Atari 2600 (emulator).

How to create an Atari ROM for my composition
---------------------------------------------

You will need to create a binary file that can run on an Atari 2600 (emulator). This sounds like a hassle, but implies
you need to download some files listed here and merely follow these instructions. It's quite painless really.

You will need an assembler such as [DASM](https://sourceforge.net/projects/dasm-dillon/) (Windows and Linux) to compile the
assembly code into an executable program. Once you have created a pattern/song that you'd like to hear, you hit the "export"-
button within Slocum Tracker and download the generated assembly file to the folder that holds the remaining
[source code](http://www.qotile.net/files/music_kit_2.zip) of Paul Slocum's Sequencer Kit.

Execute the following command from the command line:

    dasm songmain.asm -f3 -osong.bin
    
And behold, a file "_song.bin_" has been generated containing your awesome track ready for playback. You can use an emulator
such as the excellent [Stella](http://stella.sourceforge.net/downloads.php) to play your song. If you want to run it on
an actual Atari 2600, you might want to shop around [AtariAge](https://www.atariage.com/) to find out how to get your
code on a cartridge! 

Build instructions
------------------

To build slocum-tracker first resolve all dependencies using Node:

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
