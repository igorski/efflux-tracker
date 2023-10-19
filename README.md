# efflux

[![MadeWithVueJs.com shield](https://madewithvuejs.com/storage/repo-shields/1779-shield.svg)](https://madewithvuejs.com/p/efflux-music-tracker/shield-link)

## What is it ?

Efflux is an application that allows users to create music inside their browser. Efflux is a tracker and
follows conventions familiar to those who have used anything from Ultimate Soundtracker to Renoise.
All sounds are oscillator (or wave table) based and can be routed through an effects signal path, making Efflux a
modular synthesis environment, where the synths are driven by the tracker.

## Feature list

* Create custom waveforms for multiple synth instruments
* Load and manipulate audio files into samples
* Record samples on the fly using your device microphone / inputs
* Tons of keyboard shortcuts to provide nice and easy arranging using cutting, copying and cloning of (sub)patterns
* State history that allows undo / redo of your actions
* Save songs locally to continue working on them later or export / import them between devices
* Save your favourite instrument presets to be reused
* Attach a MIDI controller and record them live during playback (Google Chrome only)
* Use the [Tiny Player](https://github.com/igorski/efflux-tracker/wiki/Embedding-the-tiny-player) to play back Efflux songs embedded in your website or in demos.

### Sounds cool, but I don't want to build from source, I just want to tinker with this!!

Of course, this was made to allow for instant composition, so let's cut the chatter!
You can use the application right now from  your web browser by visiting [this link](https://www.igorski.nl/experiment/efflux).

### The [Issue Tracker](https://github.com/igorski/efflux-tracker/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc) is your point of contact

Bug reports, feature requests, questions and discussions are welcome on the GitHub Issue Tracker, please do not send
e-mails through the development website. However, please search before posting to avoid duplicates, and limit to one
issue per post.

Please vote on feature requests by using the Thumbs Up/Down reaction on the first post.

## Project outline

All source code can be found in the _./src_-folder. Efflux is written using [Vue](https://vuejs.org), with the audio engine fully written in TypeScript.

 * _./src/_ contains all source code with _main.js_ and _efflux-application.vue_ being the application entry points
 * _./src/assets_ contains all used fonts and images
 * _./src/model_ contains factories and utilities to create and serialize an Efflux song (see _"Efflux song model"_ below)
 * _./src/services_ contains a variety of services used to integrate hardware interaction within the application
 * _./src/workers_ contains all Workers (which will be inlined into the compiled output and loaded as Blobs)
 * _./src/utils_ contains utilities for common operations or to orchestrate batch changes

Additional folders:

 * _./design_ contains SVG icons that are combined into a webfont (currently done manually through Fontello)
 * _./fixtures_ can be filled with separate JSON files containing Song and Instrument data, these will be concatenated into
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
 * Pattern order list
 * Events
 * Instruments
 * Modules

A song contains a list of `EffluxPattern`s, defined in a `EffluxPatternOrder`-list. A Pattern contains a list of `EffluxChannels` (one for each available instrument) and a descriptor for the amount of _steps_ the pattern contains (e.g. 16, 32, 64, etc.). The Pattern order list contains a list of Patterns which define the playback order
in the song (patterns can appear in this list multiple times allowing you to reuse the same pattern without having
to manage duplicates).

Each channel inside a pattern contains `EffluxAudioEvent`s. These describe an action that should happen at a given step within a patterns
channel. These can be note on/note off instructions or module parameter automations, or both. Each event references
an `Instrument` that it will operate on (as not all events within a single pattern channel necessarily reference the
same instrument to allow for more complex compositions).

As hinted above, a song also has `Instrument`s. There are an equal amount of instruments available as there are tracks
(the pattern channels). By default each channel references its own instruments. As the instruments in Efflux are
synthesizers, each Instrument has a list of `InstrumentOscillator`s which can be individually tuned and configured for playback.

Instruments also reference `InstrumentModules`. Each of these modules is basically an effects processor. Each instrument can have its output routed through multiple processors before its output is mixed into the master channel (by the _AudioService_).

All model types are generated through their respected _FACTORIES_. The factory should be able to create a new
instance of the model type, as well as be able to assemble an instance from a _serialized_ version. _SERIALIZERS_ are
separate files (to minimize file size of the Tiny player that should only be able to assemble (deserialize) serialized songs).

### Efflux song model and Vuex

In Vuex, the song is stored inside its own Vuex store module _"song-module.js"_. The editors bind directly to this reactive model, but for audio playback, an additional Object structure (e.g. `EffluxAudioEvent.seq`) is used. This separates the _data_ aspect (maintained by the Vuex store mutations) from the _audio rendering_.

The history module provides custom methods for saving and restoring individual actions for specific sections of a song. While Vuex makes it easy to simply save an entire song upon each mutation, this will consume a lot (!) of memory fast. Which brings us to:

#### State history

Mutations can be registered in state history (Vuex _history-module.js_) in order to provide undo and redo
of operations. In order to prevent storing a lot of changes of the same property (for instance when dragging a slider), the storage of a new state is deferred through a queue. This is why history states are enqueued by _propertyName_:

When enqueuing a new state while there is an existing one enqueued for the same property name, the first state is updated so its redo will match that of the newest state, the undo remaining unchanged. The second state will not
be added to the queue.

It is good to understand that the undo/redo for an action should be considered separate
from the Vue component that is triggering the transaction, the reason being that the component can be
unmounted at the moment the history state is changed (and the component is no longer active).

That's why undo/redo handlers should either work on variables in a local scope, or on the Vuex store
when mutating store properties. When relying on store state and getters, be sure to cache their
values in the local scope to avoid conflicts (for instance in below example we cache _selectedInstrument_
as it is used by the undo/redo methods to update a specific instrument. _selectedInstrument_ can change during
the application lifetime before the undo/redo handler fires which would otherwise lead to the _wrong instrument_
being updated.

```typescript
update( propertyName: string, newValue: any ): void {
    // cache the existing values of the property value we are about to mutate...
    const existingValue = this.getterForExistingValue;
    // ...and the instrument index that is used to identify the instrument containing the property
    const instrumentIndex = this.selectedInstrument;
    const store: Store<EffluxState> = this.$store;
    // define the method that will mutate the existing value to given newValue
    const commit = (): void => store.commit( "updateInstrument", { instrumentIndex, prop: propertyName, value: newValue });
    // and perform the mutation directly
    commit();
    // now define and enqueue undo/redo handlers to reverse and redo the commit mutation for given propertyName
    enqueueState( propertyName, {
        undo(): void {
            store.commit( "updateInstrument", { instrumentIndex, prop: propertyName, value: existingValue });
        },
        redo(): void {
            commit();
        },
    });
}
```

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

Generate the combined fixtures JSON files by running the following command (note: this
only needs to be executed once or when new files are added / modified in the fixtures folder)

```
npm run fixtures
```

After which a development mode can be started (which conveniently opens your browser and points it to the correct
location at _http://localhost:5173_) using the following NPM command:

```
npm run dev
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

## Roadmap

Efflux is considered complete, though every now and then new features are added.

Future considerations for the code are migrating the Vue 2 code to Vue 3. To facilitate this, first the Vuex
modules must be migrated to Pinia. There is no rush as Vue 2 is more than performant enough.
