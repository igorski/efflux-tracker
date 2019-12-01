/**
 * Created by igorzinken on 25/11/2019.
 *
 * TinyPlayer takes the bare minimum necessary to play back an Efflux
 * song within the browser. This re-uses the same code as used by the
 * main application to maximize compatibility and keeping up-to-date with
 * changes. The TinyPlayer however does not use Vue nor its reactivity.
 */
// non CommonJS/ES6 module, provides "DFT" on window, see audio-helper
// TODO: this adds a whopping 62K to the bundle...
import dspjs from 'script-loader!dspjs';

// destructure imports from Efflux source to include what we need
// TODO
// AudioService includes RecorderWorker, we don't need it
// default WaveTables add considerable size to the bundle, can
// we enjoy better compression on these?
// E.O. TODO
import { assemble } from '@/services/song-assembly-service';
import { prepareEnvironment, reset, cacheCustomTables, applyModules } from '@/services/audio-service';
import sequencerModule from '@/store/modules/sequencer-module';

// short hands, note these variable names can be as long/descriptive as
// you want, inline variables will compress to single digits on build
const WINDOW = window, TRUE = !!1, FALSE = !!0;

// environment variables
let audioContext, song;
const { state, mutations, actions } = sequencerModule; // take all we need from Vuex sequencer module

const noop = () => {};

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
    }
};
