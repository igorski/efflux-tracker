/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2019 - https://www.igorski.nl
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the 'Software'), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
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
            <header class="application-header"
                    :class="{ expanded: menuOpened }"
            >
                <header-menu />
                <transport />
            </header>
            <!-- actual application -->
            <div class="container">
                <div id="properties">
                    <song-editor />
                    <pattern-editor />
                </div>
            </div>

            <div class="container">
                <div id="editor"
                     :class="{ 'has-help-panel': displayHelp, 'settings-mode': mobileMode === 'settings' }"
                >
                    <track-editor />
                    <pattern-track-list />
                    <help-section v-if="displayHelp" />
                </div>
            </div>
        </template>

        <div class="application-footer">
            <span>
                &copy; <a href="https://www.igorski.nl" rel="noopener" target="_blank">igorski.nl</a> 2016 - 2019
            </span>
        </div>

        <!-- overlays -->
        <div v-if="blindActive" id="blind">
            <template v-if="modal">
                <advanced-pattern-editor
                    v-if="modal === modalWindows.ADVANCED_PATTERN_EDITOR" @close="closeModal"
                />
                <note-entry-editor
                    v-if="modal === modalWindows.NOTE_ENTRY_EDITOR" @close="closeModal"
                />
                <module-param-editor
                    v-if="modal === modalWindows.MODULE_PARAM_EDITOR" @close="closeModal"
                />
                <instrument-editor
                    v-if="modal === modalWindows.INSTRUMENT_EDITOR" @close="closeModal"
                />
                <song-browser
                    v-if="modal === modalWindows.SONG_BROWSER" @close="closeModal"
                />
                <settings-window
                    v-if="modal === modalWindows.SETTINGS_WINDOW" @close="closeModal"
                />
            </template>
        </div>

        <!-- dialog window used for information messages, alerts and confirmations -->
        <dialog-window v-if="dialog"
            :type="dialog.type"
            :title="dialog.title"
            :message="dialog.message"
            :confirm-handler="dialog.confirm"
            :cancel-handler="dialog.cancel"
        />
        <!-- notifications -->
        <notifications />

        <!-- loading animation -->
        <loader v-if="loading" />
    </div>
</template>

<script>
import { mapState, mapGetters, mapMutations, mapActions } from 'vuex';
import Vue from 'vue';
import Vuex from 'vuex';
import VueI18n from 'vue-i18n';

import Bowser from 'bowser';
import Pubsub from 'pubsub-js';
import { Style } from 'zjslib';
import Config from '@/config';
import AdvancedPatternEditor from '@/components/advanced-pattern-editor/advanced-pattern-editor';
import AudioService from '@/services/audio-service';
import DialogWindow from '@/components/dialog-window/dialog-window';
import HeaderMenu from '@/components/header-menu/header-menu';
import HelpSection from '@/components/help-section';
import InstrumentEditor from '@/components/instrument-editor/instrument-editor';
import Loader from '@/components/loader';
import ListenerUtil from '@/utils/listener-util';
import ModalWindows from '@/definitions/modal-windows';
import ModuleParamEditor from '@/components/module-param-editor/module-param-editor';
import NoteEntryEditor from '@/components/note-entry-editor/note-entry-editor';
import Notifications from '@/components/notifications';
import PatternEditor from '@/components/pattern-editor/pattern-editor';
import PatternTrackList from '@/components/pattern-track-list';
import PubSubService from '@/services/pubsub-service';
import PubSubMessages from '@/services/pubsub/messages';
import SettingsWindow from '@/components/settings-window/settings-window';
import SongBrowser from '@/components/song-browser/song-browser';
import SongEditor from '@/components/song-editor/song-editor';
import TrackEditor from '@/components/track-editor';
import Transport from '@/components/transport/transport';
import store from '@/store';
import messages from '@/messages.json';

Vue.use(Vuex);
Vue.use(VueI18n);

// Create VueI18n instance with options
const i18n = new VueI18n({
    messages
});

export default {
    name: 'Efflux',
    store: new Vuex.Store(store),
    i18n,
    components: {
        AdvancedPatternEditor,
        ModuleParamEditor,
        NoteEntryEditor,
        DialogWindow,
        HeaderMenu,
        HelpSection,
        InstrumentEditor,
        Loader,
        Notifications,
        PatternEditor,
        PatternTrackList,
        SettingsWindow,
        SongBrowser,
        SongEditor,
        TrackEditor,
        Transport
    },
    data: () => ({
        prepared: false,
        scrollPending: false,
        mainSection: null,
        centerSection: null,
        modalWindows: ModalWindows,
        canLaunch: true,
    }),
    computed: {
        ...mapState([
            'menuOpened',
            'blindActive',
            'loading',
            'dialog',
            'modals',
            'modal',
            'mobileMode',
        ]),
        ...mapState({
            displayHelp: state => state.settings._settings[state.settings.PROPERTIES.DISPLAY_HELP] !== false,
            selectedSlot: state => state.editor.selectedSlot
        }),
        ...mapGetters([
            'activeSong'
        ])
    },
    watch: {
        menuOpened(isOpen) {
            // prevent scrolling main body when scrolling menu list
            window.document.body.style.overflow = isOpen ? 'hidden' : 'auto';
        },
        activeSong(song = null) {
            if (song == null)
                return;

            if (AudioService.initialized) {
                AudioService.reset();
                AudioService.cacheCustomTables(song.instruments);
                AudioService.applyModules(song);
            }
            this.resetEditor();
            this.resetHistory();
            this.createLinkedList(song);
            this.setActivePattern(0);
            this.setPlaying(false);
            this.setLooping(false);
            this.clearSelection();

            if (!song.meta.title)
                return;

            this.showNotification({
                title: this.$t('songLoadedTitle'),
                message: this.$t('songLoaded', { name: song.meta.title })
            });
            this.publishMessage(PubSubMessages.SONG_LOADED);
        },
        /**
         * synchronize editor module changes with keyboard service
         */
        selectedSlot() {
            this.syncKeyboard();
        }
    },
    async created() {

        // expose publish / subscribe bus to integrate with outside API's
        window.efflux = { ...window.efflux, Pubsub };
        PubSubService.init(this.$store, window.efflux.Pubsub);

        this.canLaunch = AudioService.isSupported();

        // load both persistent model data as well as data fixtures

        this.loadStoredSettings();
        this.loadStoredInstruments();
        this.loadStoredSongs();

        // prepare model

        this.prepareLinkedList();
        this.setActiveSong(await this.createSong());
        await this.prepareSequencer(this.$store);
        await this.setupServices(i18n);
        this.addListeners();

        this.prepared = true;

        if (!this.canLaunch) {
            return;
        }

        this.publishMessage(PubSubMessages.EFFLUX_READY);

        // show confirmation message on page reload

        if ( !Config.isDevMode() ) {
            const handleUnload = () => this.$t('warningUnload');
            if ( Bowser.ios ) {
                window.addEventListener('popstate', handleUnload);
            }
            else if (typeof window.onbeforeunload !== 'undefined') {
                const prevBeforeUnload = window.onbeforeunload;
                window.onbeforeunload = aEvent => {
                    if (typeof prevBeforeUnload === 'function') {
                        prevBeforeUnload( aEvent );
                    }
                    return handleUnload();
                };
            }
        }
        this.$nextTick(this.calculateDimensions);
    },
    methods: {
        ...mapMutations([
            'prepareLinkedList',
            'createLinkedList',
            'setActiveSong',
            'setActivePattern',
            'setAmountOfSteps',
            'setPlaying',
            'setLooping',
            'setWindowSize',
            'setWindowScrollOffset',
            'setBlindActive',
            'resetEditor',
            'resetHistory',
            'closeModal',
            'showNotification',
            'syncKeyboard',
            'clearSelection',
            'publishMessage',
        ]),
        ...mapActions([
            'setupServices',
            'prepareSequencer',
            'loadStoredSettings',
            'loadStoredInstruments',
            'loadStoredSongs',
            'createSong'
        ]),
        addListeners() {
            // no need to dispose as these will be active during application lifetime
            window.addEventListener( 'resize', this.handleResize );
            ListenerUtil.listen( window,  'scroll', this.handleScroll );
        },
        handleResize() {
            this.setWindowSize({ width: window.innerWidth, height: window.innerHeight });
            this.calculateDimensions();
        },
        handleScroll() {
            // only fire this event on next frame to avoid
            // DOM thrashing by all subscribed listeners

            if ( !this.scrollPending ) {
                this.scrollPending = true;
                this.$nextTick(() => {
                    this.setWindowScrollOffset(window.scrollY);
                    this.scrollPending = false;
                });
            }
        },
        calculateDimensions() {
            /**
             * due to the nature of the table display of the pattern editors track list
             * we need JavaScript to calculate to correct dimensions of the overflowed track list
             */

            // grab references to DOM elements (we do this lazily)
            // TODO: delegate these to the Vue components in question

            this.mainSection   = this.mainSection   || document.querySelector( '#properties' );
            this.centerSection = this.centerSection || document.querySelector( '#editor' );

            // synchronize pattern list width with mainsection width

            this.centerSection.style.width = Style.getStyle( this.mainSection, 'width' );
        }
    }
};
</script>

<style lang="scss">
    /* global page stying */
    html, body {
        height: 100%;
        min-width: 100%;
        background-color: #53565c;
        /* everything should fit on a single screen (unless mobile view) */
        overflow: hidden;
        /* disable navigation back/forward swipe on Chrome */
        overscroll-behavior-x: none;
    }

    body {
        margin: 0;
        padding: 0;
    }
</style>

<style lang="scss" scoped>
    /* component specific stylings should always be scoped */
    @import '@/styles/_layout.scss';

    #efflux {
        @include noSelect();
    }

    .application-header {
      box-shadow: 0 0 5px rgba(0,0,0,.5);
      background-image: linear-gradient(to bottom,#282828 35%,#383838 90%);
      background-repeat: repeat-x;
      padding: $spacing-small 0 0;
      width: 100%;
      position: fixed;
      top: 0;
      z-index: 200;
      border-bottom: 3px solid #53565d;
      @include boxSize();
    }

    #editor {
      @include flex();
    }

    #blind {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,.5);
      z-index: 400; // below overlays (see _variables.scss)
    }

    .application-footer {
      position: absolute;
      bottom: 0;
      background-image: linear-gradient(to bottom,#474747 0,#303030 100%);
      width: 100%;
      height: $footer-height;
      color: #EEE;
      font-family: Montserrat, Helvetica, Verdana;

      span {
        width: auto;
        margin: 0 auto;
        text-align: center;
        display: block;
        margin-top: $spacing-medium;
      }
    }

    /* ideal app width and up */

    @media screen and ( min-width: $app-width ) {
        .application-footer span {
            width: $app-width;
        }
    }

    /* mobile view */

    @media screen and ( max-width: $mobile-width ) {
        .application-header {
            height: $transport-height;
            &.expanded {
                height: 100%;
            }
        }
        .application-footer {
            padding: 0 $spacing-large;
            z-index: 11;
            @include boxSize;
        }
        /* when mobileMode is 'settings' we show the tempo control and song editor by expanding these */
        #properties {
            margin: 125px auto 0;
        }
        #editor.settings-mode {
            top: 260px !important;
        }
    }
</style>
