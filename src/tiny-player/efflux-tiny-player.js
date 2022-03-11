/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2019-2022 - https://www.igorski.nl
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the 'Software'), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * TinyPlayer takes the bare minimum necessary to play back an Efflux
 * song within the browser. This re-uses the same code as used by the
 * main application to maximize compatibility and keeping up-to-date with
 * changes. The TinyPlayer however does not use Vue nor its reactivity.
 *
 * TinyPlayer plays back songs that were saved using SongAssemblyService version 4
 */

// destructure imports from Efflux source to only include what we need

import sequencerModule from "@/store/modules/sequencer-module";
import { assemble } from "@/services/song-assembly-service";
import { getPitchByFrequency } from "@/services/audio/pitch";
import { init } from "@/services/audio/webaudio-helper";
import { resetPlayState } from "@/utils/song-util";
import { ACTION_NOTE_ON } from "@/model/types/audio-event-def";
import {
    prepareEnvironment, reset, cacheCustomTables, applyModules, noteOn, noteOff
} from "@/services/audio-service";

// short hands, note these variable names can be as long/descriptive as
// you want, inline variables will compress to single digits on build
const WINDOW = window, TRUE = !!1, FALSE = !!0;

// environment variables
let audioContext, activeSong, event;
const { state, mutations, actions } = sequencerModule; // take all we need from Vuex sequencer module

init().then( ac => { audioContext = ac; });

// mock Vuex root store
const rootStore = {
    state: { sequencer: state, song: {} },
    getters: { sampleCache: new Map() },
    commit( mutationType, value ) {
        mutations[ mutationType ]( state, value );
    }
};

// helpers

const jp = i => mutations.setPosition( state, { activeSong, pattern: i });

// logging
const { console } = WINDOW;
const log = ( type = "log", message, optData ) => {
    console && console[ type ]( message, optData );
};

export default {
    /**
     * Load a song defined by given xtkObject. This will initialize an
     * AudioContext, create all audio events, instruments and effects modules.
     *
     * @param {Object|string} xtkObject
     * @param {Function=} optExternalEventCallback
     * @return {boolean} whether player is ready for playback
     */
    l: async ( xtkObject, optExternalEventCallback ) => {
        try {
            if ( !audioContext ) {
                await init();
            }
            xtkObject = typeof xtkObject === "string" ? JSON.parse( xtkObject ) : xtkObject;

            // 1. parse .XTK into a Song Object
            activeSong = await assemble( xtkObject );
            if ( !activeSong ) {
                log( "error", "INVALID SONG" );
                return FALSE;
            }

            // 2. assemble waveTables from stored song

            const waveTables = xtkObject.wt || {};

            // 3. all is well, set up environment

            prepareEnvironment( audioContext, waveTables, optExternalEventCallback );
            actions.prepareSequencer({ state }, rootStore );

            rootStore.state.song.activeSong = activeSong;

            reset();
            cacheCustomTables( activeSong.instruments );
            applyModules( activeSong );

            jp( 0 ); // start at first pattern

            return TRUE;

        } catch ( e ) {
            log( "error", "LOAD ERROR", e );
            return FALSE;
        }
    },
    /**
     * Play loaded song
     */
    p: () => {
        mutations.setPlaying( state, TRUE );
    },
    /**
     * Stop playing song
     */
    s: () => {
        mutations.setPlaying( state, FALSE );
        resetPlayState( activeSong.patterns ); // unset playing state of existing events
    },
    /**
     * Jump to pattern at given index
     */
    j: i => {
        jp( i );
    },
    /**
     * Play a note with given properties, using the
     * instruments and effects defined in the loaded song
     *
     * @param {Object}
     * @return {Object} generated event object, to be used when invoking off()
     */
    on: ({ f, i, a, mp, t }) => {
        event = {
            instrument: i,
            action: a || ACTION_NOTE_ON,
            mp,
            ...getPitchByFrequency( f ) // TODO: we can also supply note and octave directly?
        };
        // TODO: no sample playback in tiny player
        noteOn( event, activeSong.instruments[ i ], new Map(), t );
        return event;
    },
    /**
     * Halt playing of a note triggered with on()
     *
     * @param {Object} e event Object of the note returned by the on() method
     */
    off: e => {
        noteOff( e );
    },
    /**
     * Retrieve the generated AudioContext. This can be used
     * in case you which to create an external hook (for instance
     * to create an audio visualizer)
     */
    a: () => audioContext
};
