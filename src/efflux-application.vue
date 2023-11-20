/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2023 - https://www.igorski.nl
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
<template>
    <div v-if="prepared" id="efflux">
        <!-- message of disappointment in case environment does not support appropriate web API's -->
        <div v-if="!canLaunch"
             class="container"
        >
            <h1 v-t="'unsupported.title'"></h1>
            <p v-t="'unsupported.message'"></p>
            <i18n path="unsupported.download">
                <a v-t="'unsupported.googleChrome'"
                   href="https://www.google.com/chrome" rel="noopener" target="_blank"></a>
            </i18n>
        </div>
        <template v-else>
            <header
                class="application-header"
                :class="{ expanded: menuOpened }"
            >
                <application-menu />
                <transport />
            </header>
            <!-- actual application -->
            <div v-if="!jamMode" class="container">
                <div
                    ref="properties"
                    class="application-properties"
                    :class="{ 'application-properties--expanded' : useOrders }"
                >
                    <pattern-editor />
                </div>
            </div>
            <div
                class="container"
                :class="{
                    'jam-mode': jamMode
                }"
            >
                <div
                    ref="editor"
                    class="application-editor"
                    :class="{
                        'has-help-panel'          : displayHelp,
                        'settings-mode'           : isMobileSettingsMode,
                        'settings-mode--expanded' : isMobileSettingsMode && useOrders,
                        'note-entry-mode'         : showNoteEntry,
                    }"
                >
                    <track-editor />
                    <jam-mode-editor v-if="jamMode" />
                    <pattern-track-list v-else />
                    <help-section v-if="displayHelp" />
                </div>
                <note-entry-editor
                    v-if="showNoteEntry"
                    :style="{ width: centerWidth }"
                />
            </div>
        </template>

        <div class="application-footer">
            <span>
                &copy; <a href="https://www.igorski.nl" rel="noopener" target="_blank">igorski.nl</a> 2023
            </span>
        </div>

        <!-- overlays -->
        <div v-if="blindActive" id="blind">
            <component
                :is="activeModal"
                @close="closeModal()"
            />
        </div>

        <!-- dialog window used for information messages, alerts and confirmations -->
        <dialog-window
            v-if="dialog"
            :type="dialog.type"
            :title="dialog.title"
            :message="dialog.message"
            :confirm-handler="dialog.confirm"
            :cancel-handler="dialog.cancel"
            :hide-actions="dialog.hideActions"
        />
        <!-- notifications -->
        <notifications />

        <!-- loading animation -->
        <loader v-if="isLoading" />
    </div>
</template>

<script lang="ts">
import { mapState, mapGetters, mapMutations, mapActions } from "vuex";
import Vue, { type Component } from "vue";
import Vuex from "vuex";
import VueI18n from "vue-i18n";
import Bowser from "bowser";
import Pubsub from "pubsub-js";
import AudioService, { getAudioContext } from "@/services/audio-service";
import Loader from "@/components/loader.vue";
import ApplicationMenu from "@/components/application-menu/application-menu.vue";
import Notifications from "@/components/notifications.vue";
import ModalWindows from "@/definitions/modal-windows";
import { JAM_MODE } from "@/definitions/url-params";
import SampleFactory from "@/model/factories/sample-factory";
import { type EffluxSong, EffluxSongType} from "@/model/types/song";
import { loadSample } from "@/services/audio/sample-loader";
import PubSubService from "@/services/pubsub-service";
import PubSubMessages from "@/services/pubsub/messages";
import { readClipboardFiles, readDroppedFiles, readTextFromFile } from "@/utils/file-util";
import { deserializePatternFile } from "@/utils/pattern-util";
import store from "@/store";
import messages from "@/messages.json";

Vue.use( Vuex );
Vue.use( VueI18n );

// Create VueI18n instance with options
const i18n = new VueI18n({
    messages
});

// wrapper for loading dynamic components with custom loading states
type IAsyncComponent = { component: Promise<Component>};
function asyncComponent( key: string, importFn: () => Promise<any> ): IAsyncComponent {
    return {
        component: new Promise( async ( resolve, reject ) => {
            Pubsub.publish( PubSubMessages.SET_LOADING_STATE, key );
            try {
                const component = await importFn();
                resolve( component );
            } catch ( e ) {
                // @ts-expect-error 'import.meta' property not allowed, not an issue Vite takes care of it
                if ( import.meta.env.MODE !== "production" ) {
                    console.error( e );
                }
                reject();
            }
            Pubsub.publish( PubSubMessages.UNSET_LOADING_STATE, key );
        })
    };
}

export default {
    name: "Efflux",
    store: new Vuex.Store( store ),
    i18n,
    components: {
        DialogWindow: () => asyncComponent( "dw", () => import( "@/components/dialog-window/dialog-window.vue" )),
        ApplicationMenu, // sync as it should be ready when EFFLUX_READY is broadcast over pubsub
        HelpSection: () => asyncComponent( "hs", () => import( "@/components/help-section/help-section.vue" )),
        Loader,
        Notifications,
        NoteEntryEditor: () => asyncComponent( "ne", () => import( "@/components/note-entry-editor/note-entry-editor.vue" )),
        PatternEditor: () => asyncComponent( "pe", () => import( "@/components/pattern-editor/pattern-editor.vue" )),
        PatternTrackList: () => asyncComponent( "ptl", () => import( "@/components/pattern-track-list/pattern-track-list.vue" )),
        JamModeEditor: () => asyncComponent( "jm", () => import( "@/components/jam-mode-editor/jam-mode-editor.vue" )),
        TrackEditor: () => asyncComponent( "te", () => import( "@/components/track-editor/track-editor.vue" )),
        Transport: () => asyncComponent( "tp", () => import( "@/components/transport/transport.vue" )),
    },
    data: () => ({
        prepared: false,
        canLaunch: true,
        centerWidth: 0,
    }),
    computed: {
        ...mapState([
            "menuOpened",
            "blindActive",
            "dialog",
            "modals",
            "modal",
            "mobileMode",
        ]),
        ...mapState({
            selectedSlot: state => state.editor.selectedSlot,
            showNoteEntry: state => state.editor.showNoteEntry,
        }),
        ...mapGetters([
            "activeSong",
            "displayHelp",
            "displayWelcome",
            "hasChanges",
            "isLoading",
            "jamMode",
            "useOrders",
        ]),
        activeModal(): null | (() => IAsyncComponent) {
            let loadFn;
            switch ( this.modal ) {
                default:
                    return null;
                case ModalWindows.SONG_CREATION_WINDOW:
                    loadFn = () => import( "@/components/song-creation-window/song-creation-window.vue" );
                    break;
                case ModalWindows.ADVANCED_PATTERN_EDITOR:
                    loadFn = () => import( "@/components/advanced-pattern-editor/advanced-pattern-editor.vue" );
                    break;
                case ModalWindows.MODULE_PARAM_EDITOR:
                    loadFn = () => import( "@/components/module-param-editor/module-param-editor.vue" );
                    break;
                case ModalWindows.INSTRUMENT_EDITOR:
                    loadFn = () => import( "@/components/instrument-editor/instrument-editor.vue" );
                    break;
                case ModalWindows.SAMPLE_EDITOR:
                    loadFn = () => import( "@/components/sample-editor/sample-editor.vue" );
                    break;
                case ModalWindows.INSTRUMENT_MANAGER:
                    loadFn = () => import( "@/components/instrument-manager/instrument-manager.vue" );
                    break;
                case ModalWindows.MIXER:
                    loadFn = () => import( "@/components/mixer/mixer.vue" );
                    break;
                case ModalWindows.SONG_BROWSER:
                    loadFn = () => import( "@/components/song-browser/song-browser.vue" );
                    break;
                case ModalWindows.SONG_SAVE_WINDOW:
                    loadFn = () => import( "@/components/song-save-window/song-save-window.vue" );
                    break;
                case ModalWindows.SETTINGS_WINDOW:
                    loadFn = () => import( "@/components/settings-window/settings-window.vue" );
                    break;
                case ModalWindows.WELCOME_WINDOW:
                    loadFn = () => import( "@/components/welcome-window/welcome-window.vue" );
                    break;
                case ModalWindows.DROPBOX_FILE_SELECTOR:
                    loadFn = () => import( "@/components/dropbox-file-selector/dropbox-file-selector.vue" );
                    break;
                case ModalWindows.WELCOME_SHARED_SONG:
                    loadFn = () => import( "@/components/shared-song-window/shared-song-window.vue" );
                    break;
                case ModalWindows.MIDI_EXPORT_WINDOW:
                    loadFn = () => import( "@/components/midi-export-window/midi-export-window.vue" );
                    break;
                case ModalWindows.MIDI_PRESET_MANAGER:
                    loadFn = () => import( "@/components/midi-preset-manager/midi-preset-manager.vue" );
                    break;
                case ModalWindows.TRANSPOSITION_EDITOR:
                    loadFn = () => import( "@/components/transposition-editor/transposition-editor.vue" );
                    break;
                case ModalWindows.OPTIMIZATION_WINDOW:
                    loadFn = () => import( "@/components/optimization-window/optimization-window.vue" );
                    break;
                case ModalWindows.CHORD_GENERATOR_WINDOW:
                    loadFn = () => import( "@/components/chord-generator-window/chord-generator-window.vue" );
                    break;
                case ModalWindows.JAM_MODE_INSTRUMENT_EDITOR:
                    loadFn = () => import( "@/components/jam-mode-instrument-editor/jam-mode-instrument-editor.vue" );
                    break;
                case ModalWindows.JAM_MODE_PIANO_ROLL:
                    loadFn = () => import( "@/components/jam-mode-editor/components/piano-roll/piano-roll.vue" );
                    break;
                case ModalWindows.PATTERN_MANAGER:
                    loadFn = () => import( "@/components/pattern-manager/pattern-manager.vue" );
                    break;
                case ModalWindows.PATTERN_ORDER_WINDOW:
                    loadFn = () => import( "@/components/pattern-order-window/pattern-order-window.vue" );
                    break;
                case ModalWindows.PATTERN_TO_ORDER_CONVERSION_WINDOW:
                    loadFn = () => import( "@/components/pattern-to-order-conversion-window/pattern-to-order-conversion-window.vue" );
                    break;
            }
            return () => asyncComponent( "mw", loadFn );
        },
        isMobileSettingsMode(): boolean {
            return !this.jamMode && this.mobileMode === "settings";
        },
    },
    watch: {
        menuOpened( isOpen: boolean ): void {
            // prevent scrolling main body when scrolling menu list
            window.document.body.style.overflow = isOpen ? "hidden" : "auto";
        },
        activeSong( song?: EffluxSong ): void {
            if ( !song ) {
                return;
            }

            if ( AudioService.initialized ) {
                AudioService.reset();
                AudioService.cacheCustomTables( song.instruments );
                AudioService.applyModules( song, this.jamMode );
            }
            this.resetEditor();
            this.resetHistory();
            this.cachePatternNames();
            this.gotoPattern({ orderIndex: 0, song });
            this.setPlaying( false );
            this.setLooping( false );
            this.clearSelection();

            this.$nextTick().then(() => this.calculateDimensions() );

            if ( this.useOrders && song.version < 4 && song.order.length === song.patterns.length ) {
                return this.openModal( ModalWindows.PATTERN_TO_ORDER_CONVERSION_WINDOW );
            }
            this.publishMessage( PubSubMessages.SONG_LOADED );

            if ( !song.meta.title ) {
                return;
            }
            this.showNotification({
                title   : this.$t( "songLoadedTitle" ),
                message : this.$t( "songLoaded", { name: song.meta.title })
            });
        },
        /**
         * synchronize editor module changes with keyboard service
         */
        selectedSlot(): void {
            this.syncKeyboard();
        },
    },
    async created(): Promise<void> {

        // expose publish / subscribe bus to integrate with outside API"s
        window.efflux = { ...window.efflux, Pubsub };
        PubSubService.init( this.$store, window.efflux.Pubsub );

        this.canLaunch = AudioService.isSupported();

        // load both persistent model data as well as data fixtures

        await this.loadStoredSettings();
        this.loadStoredInstruments();
        this.loadStoredSongs();

        // prepare model

        const urlParams = new URLSearchParams( window.location.search );
        this.openSong( await this.createSong( urlParams.has( JAM_MODE ) ? EffluxSongType.JAM : EffluxSongType.TRACKER ));
        await this.prepareSequencer( this.$store );
        await this.setupServices( i18n );

        this.prepared = true;

        if ( !this.canLaunch ) {
            return;
        }

        // if File content is dragged or pasted into the application, parse and load supported files within
        const loadFiles = async ({ instruments, patterns, projects, sounds }) => {
            for ( const instrument of instruments ) {
                this.loadInstrumentFromFile( instrument );
            }
            for ( const file of patterns ) {
                const deserializedPatterns = deserializePatternFile( await readTextFromFile( file ));
                if ( deserializedPatterns ) {
                    this.pastePatternsIntoSong({ patterns: deserializedPatterns, insertIndex: this.activeSong.patterns.length });
                } else {
                    this.showNotification({ title: this.$t( "title.error" ), message: this.$t( "errors.patternImport" )});
                }
            }
            for ( const file of projects ) {
                const confirm = () => {
                    this.loadSong({ file });
                    this.closeModal();
                };
                if ( this.hasChanges ) {
                    this.openDialog({
                        type: "confirm",
                        message: this.$t( "warnings.loadNewPendingChanges" ),
                        confirm
                    });
                } else {
                    confirm();
                }
            }
            for ( const file of sounds ) {
                try {
                    const buffer = await loadSample( file, getAudioContext());
                    if ( !buffer ) {
                        throw new Error();
                    }
                    const sample = SampleFactory.create( file, buffer, file.name );
                    this.addSample( sample );
                    this.setCurrentSample( sample );
                    this.openModal( ModalWindows.SAMPLE_EDITOR );
                } catch {
                    this.showNotification({ title: this.$t( "title.error" ), message: this.$t( "errors.audioImport" ) });
                }
            }
        };

        // one time listeners for feature detection
        const touchHandler = (): void => {
            this.setSupportsTouch( "true" );
            window.removeEventListener( "touchstart", touchHandler );
        };
        window.addEventListener( "touchstart", touchHandler );

        // browser events we listen to during the entire application lifetime
        const handlers: Record<string, ( event: Event ) => void> = {
            resize: this.handleResize.bind( this ),
            paste: event => {
                loadFiles( readClipboardFiles(( event as ClipboardEvent )?.clipboardData ));
            },
            dragover: event => {
                event.stopPropagation();
                event.preventDefault();
                ( event as DragEvent ).dataTransfer!.dropEffect = "copy";
            },
            drop: event => {
                loadFiles( readDroppedFiles(( event as DragEvent ).dataTransfer ));
                event.preventDefault();
                event.stopPropagation();
            },
            focus: event => {
                this.setApplicationFocused( true );
            },
            blur: event => {
                this.setApplicationFocused( false );
            },
        };

        Object.entries( handlers ).forEach(([ event, handler ]) => {
            window.addEventListener( event, handler, false );
        });

        // show confirmation message on page reload

        // @ts-expect-error 'import.meta' property not allowed, not an issue Vite takes care of it
        if ( import.meta.env.MODE === "production" ) {
            const handleUnload = () => this.$t( "warnings.unload" );
            if ( Bowser.ios ) {
                window.addEventListener( "popstate", handleUnload );
            }
            else if ( typeof window.onbeforeunload !== "undefined" ) {
                const prevBeforeUnload = window.onbeforeunload;
                window.onbeforeunload = event => {
                    event.preventDefault();
                    if ( typeof prevBeforeUnload === "function" ) {
                        prevBeforeUnload( event );
                    }
                    return handleUnload();
                };
            }
        }
        await this.handleReady();

        if ( urlParams.has( JAM_MODE )) {
            this.openModal( ModalWindows.JAM_MODE_INSTRUMENT_EDITOR );
        }
    },
    methods: {
        ...mapMutations([
            "addSample",
            "cachePatternNames",
            "gotoPattern",
            "setAmountOfSteps",
            "setApplicationFocused",
            "setBlindActive",
            "setCurrentSample",
            "setPlaying",
            "setLooping",
            "setSupportsTouch",
            "setWindowSize",
            "resetEditor",
            "resetHistory",
            "openDialog",
            "openModal",
            "closeModal",
            "showNotification",
            "syncKeyboard",
            "clearSelection",
            "publishMessage",
        ]),
        ...mapActions([
            "setupServices",
            "loadSong",
            "openSong",
            "pastePatternsIntoSong",
            "prepareSequencer",
            "loadStoredSettings",
            "loadStoredInstruments",
            "loadInstrumentFromFile",
            "loadStoredSongs",
            "createSong",
        ]),
        async handleReady(): Promise<void> {
            this.openModal( this.displayWelcome ? ModalWindows.WELCOME_WINDOW : ModalWindows.SONG_CREATION_WINDOW );
            await this.$nextTick();
            this.calculateDimensions();
            this.publishMessage( PubSubMessages.EFFLUX_READY );
        },
        handleResize(): void {
            this.setWindowSize({ width: window.innerWidth, height: window.innerHeight });
            this.calculateDimensions();
        },
        /**
         * due to the nature of the table display of the pattern editors track list
         * we need JavaScript to calculate to correct dimensions of the overflowed track list
         */
        calculateDimensions(): void {
            if ( this.$refs.properties ) {
                // synchronize center section width with properties section width
                this.centerWidth = `${this.$refs.properties.offsetWidth}px`;
            } else {
                this.centerWidth = "100%";
            }

            // note we do not bind a :style property onto the element inside the template as it
            // interferes with keyboard interactions done within (offsets keep jumping to center) !!

            if ( this.$refs.editor ) {
                this.$refs.editor.style.width = this.centerWidth;
            }
        },
    }
};
</script>

<style lang="scss">
/* global styles */
@import "@/styles/_global";
</style>

<style lang="scss" scoped>
/* component specific styling */
@import "@/styles/layout";
</style>
