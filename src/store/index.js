import Vue from 'vue';
import Vuex from 'vuex';
import Pubsub from 'pubsub-js';
import { getCopy } from '../i18n/Copy';
import editor from './modules/editorModule';
import history from './modules/historyModule';
import instrument from './modules/instrumentModule';
import midi from './modules/midiModule';
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
        song,
        midi,
    },
    state: {
        menuOpened: false,
        blindActive: false,
        helpTopic: 'general',
        loading: 0,
        windowSize: { width: window.innerWidth, height: window.innerHeight },
        windowScrollOffset: 0,
        dialog: null,
        overlay: null, /* string name of overlay window @see Efflux.vue */
        notifications: [],
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
        getCopy: state => (copyKey, optReplacement) => getCopy(copyKey, optReplacement)
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
        setBlindActive(state, active) {
            state.blindActive = !!active;
        },
        setOverlay(state, overlayName) {
            state.blindActive = !!overlayName;
            state.overlay = overlayName;
        },
        setHelpTopic(state, topic) {
            if (typeof topic === 'string') {
                // we slightly delay showing the new help text (scenario: user is moving
                // the mouse to helpSection to scroll its currently displayed help text)
                //const now = Date.now();
                //if (( now - lastHelpRequest ) > DELAY ) {
                state.helpTopic = topic;
            }
        },
        setLoading(state, loading) {
            if (loading) {
                state.loading += 1;
            } else {
                state.loading = Math.max(0, state.loading - 1 );
            }
        },
        openDialog(state, { type = 'info', title = '', message = '', confirm = null, cancel = null }) {
            state.dialog = { type, title, message, confirm, cancel };
        },
        closeDialog(state) {
            state.dialog = null;
        },
        showNotification(state, { title, message }) {
            state.notifications.push({ title, message });
        },
        clearNotifications(state) {
            state.notifications = [];
        },
        setWindowSize(state, { width, height }) {
            state.windowSize = { width, height };
        },
        setWindowScrollOffset(state, value) {
            state.windowScrollOffset = value;
        }
    },
    actions: {

    }
});
