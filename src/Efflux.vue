<template>
    <div v-if="prepared" id="efflux">
        <application-header />
        <!-- message of disappointment in case environment does not support appropriate web API's -->
        <template v-if="!canLaunch">
            <h1>Whoops...</h1>
            <p>
                Either the WebAudio API is not supported in this browser or it does not match the
                required standards. Sadly, Efflux depends on these standards in order to actually output sound!
            </p>
            <p>
                Luckily, you can get a web browser that offers support for free.
                We recommend <a href="https://www.google.com/chrome" rel="noopener" target="_blank">Google Chrome</a> for an
                optimal experience.
            </p>
        </template>
        <template v-else>
            <!-- actual application -->
            <div class="container">
                <div id="properties">
                    <song-editor />
                    <pattern-editor />
                </div>
            </div>

            <div class="container">
                <div id="editor">
                    <track-editor />
                    <pattern-track-list />
                    <help-section />
                </div>
            </div>
        </template>

        <application-footer />

        <!-- overlays -->
        <div v-if="blindActive" id="blind">
            <template v-if="overlay">
                <advanced-pattern-editor v-if="overlay === 'ape'" @close="closeOverlay" />
                <song-browser v-if="overlay === 'sngbr'" @close="closeOverlay" />
                <settings-window v-if="overlay === 'settings'" @close="closeOverlay" />
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
        <notification />

        <!-- loading animation -->
        <loader v-if="loading" />
    </div>
</template>

<script>
import { mapState, mapGetters, mapMutations, mapActions } from 'vuex';

import Bowser from 'bowser';
import Pubsub from 'pubsub-js';
import Config from './config';
import ListenerUtil from './utils/ListenerUtil';
import AudioService from './services/AudioService';
import { Style } from 'zjslib';
import ApplicationHeader from './components/applicationHeader';
import ApplicationFooter from './components/applicationFooter';
import AdvancedPatternEditor from './components/advancedPatternEditor';
import PatternEditor from './components/patternEditor';
import PatternTrackList from './components/patternTrackList';
import TrackEditor from './components/trackEditor';
import HelpSection from './components/helpSection';
import DialogWindow from './components/dialogWindow';
import SettingsWindow from './components/settingsWindow';
import SongBrowser from './components/songBrowser';
import SongEditor from './components/songEditor';
import Notification from './components/notification';
import Loader from './components/loader';
import store from './store';

export default {
    name: 'Efflux',
    store,
    components: {
        ApplicationHeader,
        ApplicationFooter,
        AdvancedPatternEditor,
        DialogWindow,
        HelpSection,
        Loader,
        Notification,
        PatternEditor,
        PatternTrackList,
        SettingsWindow,
        SongBrowser,
        SongEditor,
        TrackEditor,
    },
    data: () => ({
        prepared: false,
        scrollPending: false,
        mainSection: null,
        centerSection: null,
    }),
    computed: {
        ...mapState([
            'menuOpened',
            'blindActive',
            'loading',
            'dialog',
            'overlay',
        ]),
        ...mapGetters([
            'getCopy',
            'activeSong',
            'activeSlot',
        ]),
        canLaunch() {
            return AudioService.isSupported();
        },
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
            }
            this.resetEditor();
            this.resetHistory();
            this.createLinkedList(song);
            this.setActiveInstrument(0);
            this.setActivePattern(0);
            this.setActiveStep(0);
            this.setPlaying(false);

            if (!song.meta.title)
                return;

            this.showNotification({
                title: this.getCopy('SONG_LOADED_TITLE'),
                message: this.getCopy('SONG_LOADED', song.meta.title)
            });
        },
        /**
         * synchronize editor module changes with keyboard service
         */
        activeSlot() {
            this.syncKeyboard();
        },
    },
    async created() {
        // expose publish / subscribe bus to integrate with outside API's

        window.efflux = { ...window.efflux, Pubsub };

        // load both persistent model data as well as data fixtures

        this.loadStoredSettings();
        this.loadStoredInstruments();
        this.loadStoredSongs();

        // prepare model

        this.prepareLinkedList();
        this.setActiveSong(await this.createSong());
        await this.prepareSequencer(this.$store);
        await this.setupServices();
        this.addListeners();

        this.prepared = true;

        // show confirmation message on page reload

        if ( !Config.isDevMode() ) {
            const handleUnload = () => this.getCopy('WARNING_UNLOAD');
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
            'setActiveInstrument',
            'setActivePattern',
            'setActiveStep',
            'setActiveInstrument',
            'setAmountOfSteps',
            'setPlaying',
            'setWindowSize',
            'setWindowScrollOffset',
            'setBlindActive',
            'resetEditor',
            'resetHistory',
            'closeDialog',
            'showNotification',
            'syncKeyboard',
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
            window.addEventListener( "resize", this.handleResize );
            ListenerUtil.listen( window,  "scroll", this.handleScroll );
        },
        handleResize(event) {
            this.setWindowSize({ width: window.innerWidth, height: window.innerHeight });
            this.calculateDimensions();
        },
        handleScroll(event) {
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

            this.mainSection   = this.mainSection   || document.querySelector( "#properties" );
            this.centerSection = this.centerSection || document.querySelector( "#editor" );

            // synchronize pattern list width with mainsection width

            this.centerSection.style.width = Style.getStyle( this.mainSection, "width" );
        },
        closeOverlay() {
            this.setBlindActive(false);
            this.closeDialog();
        }
    }
};
</script>

<style lang="scss">
    @import '@/styles/_layout.scss';

    html, body {
        height: 100%;
        min-width: 100%; // fullscreen mode
        background-color: #53565c;
        // everything should fit on a single screen (not always though, see grid.less)
        overflow: hidden;
    }

    body {
        margin: 0;
        padding: 0;
        @include noSelect;
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
</style>
