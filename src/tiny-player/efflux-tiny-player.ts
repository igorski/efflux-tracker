/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2019-2023 - https://www.igorski.nl
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
 * TinyPlayer plays back songs that were saved using SongAssemblyService version 4 and up
 */

// note we destructure imports from Efflux source to only include what we need
import type { Store, ActionTree, MutationTree } from "vuex";
import sequencerModule from "@/store/modules/sequencer-module";
import type { SequencerState } from "@/store/modules/sequencer-module";
import type { SongState } from "@/store/modules/song-module";
import { assemble } from "@/services/song-assembly-service";
import { getPitchByFrequency } from "@/services/audio/pitch";
import type { ExternalEventCallback } from "@/services/audio/module-automation";
import type WaveTables from "@/services/audio/wave-tables";
import { resetPlayState } from "@/utils/song-util";
import SampleFactory from "@/model/factories/sample-factory";
import { WAVE_TABLES } from "@/model/serializers/instrument-serializer";
import { ACTION_NOTE_ON } from "@/model/types/audio-event";
import type { EffluxAudioEvent, EffluxAudioEventModuleParams } from "@/model/types/audio-event";
import type { Instrument } from "@/model/types/instrument";
import type { EffluxPattern } from "@/model/types/pattern";
import type { Sample } from "@/model/types/sample";
import type { EffluxSong } from "@/model/types/song";
import {
    prepareEnvironment, reset, cacheCustomTables, applyModules, noteOn, noteOff
} from "@/services/audio-service";
import type { Pitch } from "@/services/audio/pitch";
import type { EffluxState } from "@/store";

type TinyEvent = Pitch & { instrument: number, action: number, mp: EffluxAudioEventModuleParams };

// short hands, note these variable names can be as long/descriptive as
// you want, inline variables will compress to single digits on build
const WINDOW = window;
const TRUE = !!1;
const FALSE = !!0;

// environment variables
let audioContext: AudioContext;
let activeSong: EffluxSong;
let event: TinyEvent;

// take all we need from Vuex sequencer module
const state: SequencerState = sequencerModule.state as SequencerState;
const mutations: MutationTree<SequencerState> = sequencerModule.mutations!;
const actions: ActionTree<SequencerState, any> = sequencerModule.actions!;

const sampleCache: Map<string, Sample> = new Map();

// mock Vuex root store
const rootStore: Store<EffluxState> = {
    // @ts-expect-error state not complete
    state: {
        sequencer: state,
        song: {} as unknown as SongState,
    },
    getters: { sampleCache },
    commit( mutationType: string, value?: any ): void {
        mutations[ mutationType ]( state, value );
    }
};

// helpers

const jp = ( i: number ): void => mutations.setPosition( state, { activeSong, pattern: i });

// logging
const log = ( type = "log", message: string, optData?: any ): void => {
    const c = WINDOW.console;
    // @ts-expect-error No index signature with a parameter of type 'string' was found on type 'Console'
    c && c[ type ]( message, optData );
};

export default {
    /**
     * Load a song defined by given xtkObject. This will initialize an
     * AudioContext, create all audio events, instruments and effects modules.
     *
     * @param {Object|string} xtkObject
     * @param {Function=} optExternalEventCallback
     * @param {AudioContext=} optAudioContext optional AudioContext (when provided, should not be
     *        in suspended state. when null, audioContext will be initialized inline, though be sure
     *        to call this method after a user interaction to prevent muted playback)
     * @return {Promise<boolean>} whether player is ready for playback
     */
    l: async ( xtkObject: string | any, optExternalEventCallback?: ExternalEventCallback, optAudioContext?: AudioContext ): Promise<boolean> => {
        try {
            if ( optAudioContext ) {
                audioContext = optAudioContext;
            } else if ( !audioContext ) {
                // @ts-expect-error vendor prefix not a valid typedef
                audioContext = new ( WINDOW.AudioContext || WINDOW.webkitAudioContext )();
            }
            xtkObject = typeof xtkObject === "string" ? JSON.parse( xtkObject ) : xtkObject;

            // 1. parse .XTK into a Song Object
            activeSong = await assemble( xtkObject );
            if ( !activeSong ) {
                log( "error", "INVALID SONG" );
                return FALSE;
            }

            // 2. assemble waveTables from stored song

            const waveTables: typeof WaveTables = xtkObject[ WAVE_TABLES ] || {};

            // 3. all is well, set up environment

            prepareEnvironment( audioContext, waveTables, optExternalEventCallback );
            // @ts-expect-error Type 'ActionObject<SequencerState, any>' has no call signatures.
            actions.prepareSequencer({ state }, rootStore );

            rootStore.state.song.activeSong = activeSong;

            reset();
            cacheCustomTables( activeSong.instruments );
            activeSong.samples?.forEach(( sample: Sample ): void => {
                sampleCache.set( sample.name, {
                    ...sample,
                    buffer: SampleFactory.getBuffer( sample, audioContext )
                });
            });
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
    p: (): void => {
        mutations.setPlaying( state, TRUE );
    },
    /**
     * Stop playing song
     */
    s: (): void => {
        mutations.setPlaying( state, FALSE );
        resetPlayState( activeSong.patterns ); // unset playing state of existing events
    },
    /**
     * Jump to pattern at given index
     */
    j: ( i: number ): void => {
        jp( i );
    },
    /**
     * Play a note with given properties, using the
     * instruments and effects defined in the loaded song
     *
     * @param {Object}
     * @return {TinyEvent} generated event object, to be used when invoking off()
     */
    on: ({ f, i, a, mp, t } : { f: number, i: number, a?: number, mp?: EffluxAudioEventModuleParams, t: number }): TinyEvent => {
        event = {
            instrument: i,
            action: a || ACTION_NOTE_ON,
            mp,
            ...getPitchByFrequency( f ) // TODO: we can also supply note and octave directly?
        };
        // TODO: no sample playback in tiny player
        noteOn( event as unknown as EffluxAudioEvent, activeSong.instruments[ i ], new Map(), t );
        return event;
    },
    /**
     * Halt playing of a note triggered with on()
     *
     * @param {TinyEvent} e event Object of the note returned by the on() method
     */
    off: ( e: TinyEvent ): void => {
        noteOff( e as unknown as EffluxAudioEvent );
    },
    /**
     * Retrieve the generated AudioContext. This can be used
     * in case you which to create an external hook (for instance
     * to create an audio visualizer)
     */
    a: (): AudioContext => audioContext
};
