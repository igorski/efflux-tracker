import Vue from 'vue';
import Vuex from 'vuex';
import Pubsub from 'pubsub-js';
import { getCopy } from '../i18n/Copy';
import editor from './modules/editorModule';
import history from './modules/historyModule';
import instrument from './modules/instrumentModule';
import selection from './modules/selectionModule';
import settings from './modules/settingsModule';
import sequencer from './modules/sequencerModule';
import song from './modules/songModule';
import audioController from '../js/controller/AudioController';

Vue.use(Vuex);

export default new Vuex.Store({
    modules: {
        editor,
        history,
        instrument,
        selection,
        settings,
        sequencer,
        song
    },
    state: {
        menuOpened: false,
        overlayOpened: false,
        helpTopic: 'general',
        loading: false,
        dialog: null,
        audioController
    },
    getters: {
        /**
         * We expose retrieval of text content via this curried getter so we can
         * easily use it within Vue component templates.
         *
         * TODO: consider use of vue-i18n
         */
        // eslint-disable-next-line no-unused-vars
        getCopy: () => state => (copyKey, optReplacement) => getCopy(copyKey, optReplacement)
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
