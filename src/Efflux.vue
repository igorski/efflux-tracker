<template>
    <div v-if="prepared" id="app">
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
                    <section id="songEditor"></section>
                    <pattern-editor />
                </div>
            </div>

            <div class="container">
                <div id="editor">
                    <section id="trackEditor">
                        <ul class="controls">
                            <li class="addNote"></li>
                            <li class="addOff"></li>
                            <li class="removeNote"></li>
                            <li class="moduleParams"></li>
                            <li class="moduleGlide"></li>
                        </ul>
                    </section>
                    <section id="patternTrackList">
                        <div id="patternTrackListContainer">
                            <div class="wrapper">
                                <!-- HandleBars content appended here -->
                            </div>
                            <div class="highlight"></div>
                        </div>
                    </section>
                    <help-section />
                </div>
            </div>
        </template>

        <application-footer />

        <!-- obscuring area displayed below overlays -->
        <div v-if="blindActive" id="blind"></div>

        <!-- dialog window used for information messages, alerts and confirmations -->
        <dialog-window v-if="dialog"
            :type="dialog.type"
            :title="dialog.title"
            :message="dialog.message"
            :confirm-handler="dialog.confirm"
            :cancel-handler="dialog.cancel"
        />

        <template v-if="overlay">
            <advanced-pattern-editor v-if="overlay === 'ape'" />
            <settings-window v-else-if="overlay === 'settings'" />
        </template>

        <notification v-if="notifications.length" />

        <!-- loading animation -->
        <loader v-if="loading" />
    </div>
</template>

<script>
import { mapState, mapGetters, mapMutations, mapActions } from 'vuex';

import Bowser from 'bowser';
import Pubsub from 'pubsub-js';
import Config from './config';
import ApplicationHeader from './components/applicationHeader';
import ApplicationFooter from './components/applicationFooter';
import AdvancedPatternEditor from './components/advancedPatternEditor';
import PatternEditor from './components/patternEditor';
import HelpSection from './components/helpSection';
import DialogWindow from './components/dialogWindow';
import SettingsWindow from './components/settingsWindow';
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
        PatternEditor,
        HelpSection,
        Loader,
        DialogWindow,
        SettingsWindow,
    },
    data: () => ({
        prepared: false,
    }),
    computed: {
        ...mapState([
            'menuOpened',
            'blindActive',
            'loading',
            'dialog',
            'overlay',
            'notifications',
            'audioController',
        ]),
        ...mapGetters([
            'getCopy',
        ]),
        canLaunch() {
            return this.audioController.isSupported();
        },
    },
    watch: {
        menuOpened(isOpen) {
            // prevent scrolling main body when scrolling menu list
                window.document.body.style.overflow = isOpen ? 'hidden' : 'auto';
        }
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
    },
    methods: {
        ...mapMutations([
            'prepareLinkedList',
            'setActiveSong'
        ]),
        ...mapActions([
            'loadStoredSettings',
            'loadStoredInstruments',
            'loadStoredSongs',
            'createSong'
        ])
    }
};
</script>

<style lang="scss">
    @import '@/styles/_variables.scss';

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
