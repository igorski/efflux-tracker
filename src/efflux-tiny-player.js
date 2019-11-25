/**
 * Created by igorzinken on 25/11/2019.
 *
 * TinyPlayer takes the bare minimum necessary to play back an Efflux
 * song within the browser. This re-uses the same code as used by the
 * main application to maximize compatibility and keeping up-to-date with
 * changes. The TinyPlayer however does not use Vue nor its reactivity.
 */
export default {
    play: xtkObject => {
        const { console } = window;

        try {
            console.warn('We should be doing something with', xtkObject);
        } catch(e) {
            console && console.error('Efflux Tiny Player::ERROR', e);
        }
    }
};
