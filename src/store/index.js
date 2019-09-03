import editor from './modules/editor-module';
import history from './modules/history-module';
import instrument from './modules/instrument-module';
import midi from './modules/midi-module';
import selection from './modules/selection-module';
import settings from './modules/settings-module';
import sequencer from './modules/sequencer-module';
import song from './modules/song-module';
import AudioService from '@/services/audio-service';
import KeyboardService from '@/services/keyboard-service';
import MIDIService from '@/services/midi-service';
import PubSubService from '@/services/pubsub-service';

// cheat a little by exposing the vue-i18n translations directly to the
// store so we can commit translated error/success messages from actions

let i18n;
const translate = (key, optArgs) => i18n && typeof i18n.t === 'function' ? i18n.t(key, optArgs) : key;

export default
{
    modules: {
        editor,
        history,
        instrument,
        selection,
        settings,
        sequencer,
        song,
        midi
    },
    state: {
        menuOpened: false,
        blindActive: false,
        helpTopic: 'general',
        loading: 0,
        windowSize: { width: window.innerWidth, height: window.innerHeight },
        windowScrollOffset: 0,
        dialog: null,
        notifications: [],
        modal: null, /* string name of modal window to open, see modal-windows.js */
        mobileMode: null, /* string name of mobile view state */
    },
    getters: {
        // eslint-disable-next-line no-unused-vars
        t: state => (key, optArgs) => translate(key, optArgs),
    },
    mutations: {
        publishMessage(state, message) {
            PubSubService.publish(message);
        },
        setMenuOpened(state, value) {
            state.menuOpened = !!value;
        },
        setBlindActive(state, active) {
            state.blindActive = !!active;
        },
        openModal(state, modalName) {
            state.blindActive = !!modalName;
            state.modal = modalName;
        },
        closeModal(state) {
            state.blindActive = false;
            state.modal = null;
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
        /**
         * open a dialog window showing given title and message.
         * types can be info, error or confirm. When type is confirm, optional
         * confirmation and cancellation handler can be passed.
         */
        openDialog(state, { type = 'info', title = '', message = '', confirm = null, cancel = null }) {
            state.dialog = { type, title , message, confirm, cancel };
        },
        closeDialog(state) {
            state.dialog = null;
        },
        /**
         * shows a dialog window stating an Error has occurred.
         */
        showError(state, message) {
            state.dialog = { type: 'error', title: translate('title.error'), message };
        },
        /**
         * shows a notification containing given title and message.
         * multiple notifications can be stacked.
         */
        showNotification(state, { message = '', title = null }) {
            state.notifications.push({ title: title || translate('title.success'), message });
        },
        clearNotifications(state) {
            state.notifications = [];
        },
        /**
         * service hooks
         */
        syncKeyboard() {
            KeyboardService.syncEditorSlot();
        },
        suspendKeyboardService(state, isSuspended) {
            KeyboardService.setSuspended(!!isSuspended);
        },
        /**
         * cache the resize/scroll offsets in the store so
         * components can react to these values instead of maintaining
         * multiple listeners at the expense of DOM trashing/performance hits
         */
        setWindowSize(state, { width, height }) {
            state.windowSize = { width, height };
        },
        setWindowScrollOffset(state, value) {
            state.windowScrollOffset = value;
        },
        setMobileMode(state, mode) {
            state.mobileMode = mode;
        },
    },
    actions: {
        /**
         * Install the services that will listen to the hardware
         * (audio outputs/inputs, keyboard, etc.) connected to the device
         * the application is running on.
         *
         * @param {Object} i18nReference vue-i18n Object instance so we can
         *                 access translations inside Vuex store modules
         */
        setupServices(store, i18nReference) {
            // cheat a little by giving the services access to the root store.
            // when synthesizing audio we need instant access to song events
            // nextTick()-based reactivity is too large of a latency
            const storeReference = this;
            i18n = i18nReference;

            return new Promise(resolve => {
                AudioService.init(storeReference);
                KeyboardService.init(storeReference);
                MIDIService.init(storeReference);
                resolve();
            });
        }
    }
};
