/**
 * Created by igorzinken on 25/11/2019.
 *
 * TinyPlayer takes the bare minimum necessary to play back an Efflux
 * song within the browser. This re-uses the same code as used by the
 * main application to maximize compatibility and keeping up-to-date with
 * changes. The TinyPlayer however does not use Vue nor its reactivity.
 */
import { assemble } from '@/services/song-assembly-service';
import { sequencerModule } from '@/store/modules/sequencer-module';

// short hands, note these variables names can be as long/descriptive as
// you want, inline variables will compress to single digits on build
const WINDOW = window, TRUE = !!1, FALSE = !!0;

// environment variables
let audioContext;

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
            // 1. create AudioContxt, this will throw into catch block when unsupported
            audioContext = new (WINDOW.AudioContext || WINDOW.webkitAudioContext)();

            // 2. parse .XTK into a Song Object
            const song = assemble(xtkObject);
            if (!song) {
                log('error', 'INVALID SONG');
                return FALSE;
            }

            // 3. all is well, set up environment
            // TODO: translate these from main app into Tiny Player

            // AudioService.reset();
            // AudioService.cacheCustomTables(song.instruments);
            // AudioService.applyModules(song);

            // createLinkedList(song);
            // setActivePattern(0);

            return TRUE;

        } catch(e) {
            log('error', 'LOAD ERROR', e);
            return FALSE;
        }
    }
};
