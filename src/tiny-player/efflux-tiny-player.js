/**
 * Created by igorzinken on 25/11/2019.
 *
 * TinyPlayer takes the bare minimum necessary to play back an Efflux
 * song within the browser. This re-uses the same code as used by the
 * main application to maximize compatibility and keeping up-to-date with
 * changes. The TinyPlayer however does not use Vue nor its reactivity.
 */
// destructure imports from Efflux source to include what we need
// TODO
// default WaveTables add considerable size to the bundle, can
// we enjoy better compression on these?
// E.O. TODO
import sequencerModule from '@/store/modules/sequencer-module';
import { assemble } from '@/services/song-assembly-service';
import { getPitchByFrequency } from '@/services/audio/pitch';
import {
    prepareEnvironment, reset, cacheCustomTables, applyModules, noteOn, noteOff
} from '@/services/audio-service';

// short hands, note these variable names can be as long/descriptive as
// you want, inline variables will compress to single digits on build
const WINDOW = window, TRUE = !!1, FALSE = !!0;

// environment variables
let audioContext, song, event;
const { state, mutations, actions } = sequencerModule; // take all we need from Vuex sequencer module

// mock Vuex root store
const rootStore = {
    state: { sequencer: state, song: {} },
    commit(mutationType, value) {
        mutations[mutationType](state, value);
    }
};

// logging
const { console } = WINDOW;
const log = (type = 'log', message, optData) => {
    console && console[type](message, optData);
};

export default {
    /**
     * Load a song defined by given xtkObject. This will initialize an
     * AudioContext, create all audio events, instruments and effects modules.
     *
     * @param {Object|string} xtkObject
     * @return {boolean} whether player is ready for playback
     */
    l: xtkObject => {
        try {
            // 1. create AudioContext, this will throw into catch block when unsupported
            if (!audioContext) {
                audioContext = new (WINDOW.AudioContext || WINDOW.webkitAudioContext)();
                prepareEnvironment(audioContext);
                actions.prepareSequencer({ state }, rootStore);
            }

            // 2. parse .XTK into a Song Object
            song = assemble(xtkObject);
            if (!song) {
                log('error', 'INVALID SONG');
                return FALSE;
            }

            // 3. all is well, set up environment

            rootStore.state.song.activeSong = song;

            reset();
            cacheCustomTables(song.instruments);
            applyModules(song);

            // createLinkedList(song); // wait, these lists are editor only? (e.g. unused by sequencer?)

            mutations.setActivePattern(state, 0);

            return TRUE;

        } catch(e) {
            log('error', 'LOAD ERROR', e);
            return FALSE;
        }
    },
    /**
     * Play loaded song
     */
    p: () => {
        mutations.setPlaying(state, TRUE);
    },
    /**
     * Stop playing song
     */
    s: () => {
        mutations.setPlaying(state, FALSE);
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
            action: a || 1,
            mp,
            ...getPitchByFrequency(f) // TODO: we can also supply note and octave directly?
        };
        noteOn(event, song.instruments[i], t);
        return event;
    },
    /**
     * Halt playing of a note triggered with on()
     *
     * @param {Object} e event Object of the note returned by the on() method
     */
    off: e => {
        noteOff(e);
    },
    /**
     * Retrieve the generated AudioContext. This can be used
     * in case you which to create an external hook (for instance
     * to create an audio visualizer)
     */
    a: () => audioContext
};
