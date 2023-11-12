import type { ActionContext } from "vuex";
import type { IVueI18n } from "vue-i18n";
import editor, { EditorState } from "./modules/editor-module";
import history, { HistoryState } from "./modules/history-module";
import instrument, { InstrumentState } from "./modules/instrument-module";
import midi, { MIDIState } from "./modules/midi-module";
import sample, { SampleState } from "./modules/sample-module";
import selection, { SelectionState } from "./modules/selection-module";
import settings, { SettingsState } from "./modules/settings-module";
import sequencer, { SequencerState } from "./modules/sequencer-module";
import song, { SongState } from "./modules/song-module";
import ModalWindows from "@/definitions/modal-windows";
import { initHistory } from "@/model/factories/history-state-factory";
import AudioService from "@/services/audio-service";
import OutputRecorder from "@/services/audio/output-recorder";
import WaveTables from "@/services/audio/wave-tables";
import KeyboardService from "@/services/keyboard-service";
import MIDIService from "@/services/midi-service";
import PubSubService from "@/services/pubsub-service";
import Messages from "@/services/pubsub/messages";

// cheat a little by exposing the vue-i18n translations directly to the
// store so we can commit translated error/success messages from actions

let i18n: IVueI18n;
const translate = ( key: string, optArgs?: any ): string => i18n && typeof i18n.t === "function" ? i18n.t( key, optArgs ) as string : key;

type IDialogWindow = {
    type: string;
    title: string;
    message: string;
    confirm?: () => void | null;
    cancel?: () => void | null;
    hideActions?: boolean;
};

type INotification = {
    title?: string;
    message?: string;
};

export interface EffluxState {
    menuOpened: boolean;
    blindActive: boolean;
    helpTopic: string;
    loadingStates: string[], // wether one or more long running operations are running
    windowSize: { width: number, height: number },
    dialog: IDialogWindow | null,
    notifications: INotification[],
    modal: ModalWindows | null, /* string name of modal window to open, see modal-windows.js */
    mobileMode: string | null, /* string name of mobile view state */
    dropboxConnected: boolean,
    mediaConnected: boolean,
    applicationFocused: boolean,

    // store sub-module states

    editor: EditorState,
    history: HistoryState,
    instrument: InstrumentState,
    midi: MIDIState,
    sample: SampleState,
    selection: SelectionState,
    sequencer: SequencerState,
    settings: SettingsState,
    song: SongState,
};

export default
{
    modules: {
        editor,
        history,
        instrument,
        sample,
        selection,
        settings,
        sequencer,
        song,
        midi
    },
    // @ts-expect-error sub module states are injected by Vuex on store creation
    state: (): EffluxState => ({
        menuOpened: false,
        blindActive: false,
        helpTopic: "general",
        loadingStates: [], // wether one or more long running operations are running
        windowSize: { width: window.innerWidth, height: window.innerHeight },
        dialog: null,
        notifications: [],
        modal: null, /* string name of modal window to open, see modal-windows.js */
        mobileMode: null, /* string name of mobile view state */
        dropboxConnected: false,
        mediaConnected: false,
        applicationFocused: true,
    }),
    getters: {
        // @ts-expect-error state is defined, but its value is never read
        t: ( state: EffluxState ) => ( key: string, optArgs?: any ): string => translate( key, optArgs ),
        isLoading: ( state: EffluxState ) => state.loadingStates.length > 0,
    },
    mutations: {
        // @ts-expect-error state is defined, but its value is never read
        publishMessage( state: EffluxState, message: string ): void {
            PubSubService.publish( message );
        },
        setMenuOpened( state: EffluxState, value: boolean ): void {
            state.menuOpened = !!value;
        },
        setBlindActive( state: EffluxState, active: boolean ): void {
            state.blindActive = !!active;
        },
        openModal( state: EffluxState, modal: ModalWindows | null ): void {
            state.blindActive = modal !== null;
            state.modal = modal;
        },
        closeModal( state: EffluxState ): void {
            state.blindActive = false;
            state.modal = null;
        },
        setHelpTopic( state: EffluxState, topic: string ): void {
            if ( typeof topic === "string" ) {
                // we slightly delay showing the new help text (scenario: user is moving
                // the mouse to helpSection to scroll its currently displayed help text)
                //const now = Date.now();
                //if (( now - lastHelpRequest ) > DELAY ) {
                state.helpTopic = topic;
            }
        },
        setLoading( state: EffluxState, key: string ): void {
            if ( !state.loadingStates.includes( key )) {
                state.loadingStates.push( key );
            }
        },
        unsetLoading( state: EffluxState, key: string ): void {
            const idx = state.loadingStates.indexOf( key );
            if ( idx > -1 ) {
                state.loadingStates.splice( idx, 1 );
            }
        },
        /**
         * open a dialog window showing given title and message.
         * types can be info, error or confirm. When type is confirm, optional
         * confirmation and cancellation handler can be passed.
         */
        openDialog( state: EffluxState, dialogWindow: IDialogWindow ): void {
            const { type = "info", title = "", message = "", confirm = null, cancel = null, hideActions = false } = dialogWindow;
            state.dialog = { type, title , message, confirm, cancel, hideActions };
        },
        closeDialog( state: EffluxState ): void {
            state.dialog = null;
        },
        /**
         * shows a dialog window stating an Error has occurred.
         */
        showError( state: EffluxState, message: string ): void {
            state.dialog = { type: "error", title: translate( "title.error" ), message };
        },
        /**
         * shows a notification containing given title and message.
         * multiple notifications can be stacked.
         */
        showNotification( state: EffluxState, notification: INotification ): void {
            const { message = "", title = null } = notification;
            state.notifications.push({ title: title || translate( "title.success" ), message });
        },
        clearNotifications( state: EffluxState ): void {
            state.notifications = [];
        },
        /**
         * service hooks
         */
        syncKeyboard(): void {
            KeyboardService.syncEditorSlot();
        },
        // @ts-expect-error state is defined, but its value is never read
        suspendKeyboardService( state: EffluxState, isSuspended: boolean ): void {
            KeyboardService.setSuspended( !!isSuspended );
        },
        /**
         * cache the resize/scroll offsets in the store so
         * components can react to these values instead of maintaining
         * multiple listeners at the expense of DOM trashing/performance hits
         */
        setWindowSize( state: EffluxState, { width, height }: { width: number, height: number }): void {
            state.windowSize = { width, height };
        },
        setMobileMode( state: EffluxState, mode: string ): void {
            state.mobileMode = mode;
        },
        setDropboxConnected( state: EffluxState, value: boolean ): void {
            state.dropboxConnected = value;
        },
        setMediaConnected( state: EffluxState, value: boolean ): void {
            state.mediaConnected = value;
        },
        setApplicationFocused( state: EffluxState, value: boolean ): void {
            state.applicationFocused = value;
        },
    },
    actions: {
        /**
         * Install the services that will listen to the hardware
         * (audio outputs/inputs, keyboard, etc.) connected to the device
         * the application is running on.
         */
        setupServices( store: ActionContext<EffluxState, any>, i18nReference: IVueI18n ): Promise<void> {
            // cheat a little by giving the services access to the root store.
            // when synthesizing audio we need instant access to song events
            // nextTick()-based reactivity is too large of a latency
            const storeReference = this;
            i18n = i18nReference;

            return new Promise( resolve => {
                // audioContext initialization is async, on user interaction
                AudioService
                    .init( storeReference, WaveTables, OutputRecorder )
                    .then(() => {
                        store.commit( "publishMessage", Messages.AUDIO_CONTEXT_READY );
                    });
                KeyboardService.init( storeReference );
                MIDIService.init( storeReference );
                initHistory( storeReference );
                resolve();
            });
        }
    }
};
