import Vue from 'vue';
import Vuex from 'vuex';
import Pubsub from 'pubsub-js';
import { getCopy } from '../i18n/Copy';

Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        menuOpened: false,
        overlayOpened: false,
        helpTopic: 'general',
        loading: false,
        dialog: null,
    },
    getters: {
        // expose copy retrieval via curried getter
        getCopy: () => state => (copyKey, optReplacement) => getCopy(copyKey, optReplacement),
    },
    mutations: {
        /**
         * Used to broadcast changes to the audio layer which is not
         * attached to reactive Vue states. This will broadcast a
         * message over PubSub to whoever is listening.
         *
         * @param {Object} state
         * @param {string} message
         * @param {*} opt_payload optional payload
         * @param {boolean=} sync whether to send this synchronously, defaults to false
         */
        setAudioState(state, { message, opt_payload, sync = false }) {
            Pubsub[ sync === true ? 'publishSync' : 'publish' ](message, opt_payload);
        },
        setMenuOpened(state, value) {
            state.menuOpened = !!value;
        },
        setOverlayState(state, opened) {
            state.overlayOpened = !!opened;
        },
        setHelpTopic(state, topic) {
            if (typeof topic === 'string') {
                state.helpTopic = topic;
            }
        },
        setLoading(state, loading) {
            state.loading = !!loading;
        },
        openDialog(state, { title, message, confirm = null, cancel = null }) {
            state.dialog = { title, message, confirm, cancel };
        },
        closeDialog(state) {
            state.dialog = null;
        }
    },
    actions: {

    }
});
