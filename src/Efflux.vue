<template>
    <div id="app">
        <application-header />
        <div class="container">
            <div id="properties">
                <section id="songEditor"></section>
                <section id="patternEditor">
                    <h2>Pattern</h2>
                    <ul>
                        <li>
                            <button id="patternClear">clear</button>
                        </li>
                        <li>
                            <button id="patternCopy">copy</button>
                        </li>
                        <li>
                            <button id="patternPaste">paste</button>
                        </li>
                        <li>
                            <button id="patternAdd">add</button>
                        </li>
                        <li>
                            <button id="patternDelete">delete</button>
                        </li>
                        <li>
                            <select id="patternSteps">
                                <option value="16">16 steps</option>
                                <option value="32">32 steps</option>
                                <option value="64">64 steps</option>
                                <option value="128">128 steps</option>
                            </select>
                        </li>
                        <li>
                            <button id="patternAdvanced">advanced</button>
                        </li>
                    </ul>
                </section>
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

        <application-footer />

        <!-- obscuring area displayed below overlays -->
        <div v-if="overlayOpened" id="blind"></div>
        <!-- dialog window used for information messages, alerts and confirmations -->
        <dialog-window v-if="dialog"
            :type="dialog.type"
            :title="dialog.title"
            :message="dialog.message"
            :confirm-handler="dialog.confirm"
            :cancel-handler="dialog.cancel"
        />
        <loader v-if="loading" />
    </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import Bowser from 'bowser';
import Pubsub from 'pubsub-js';
import Config from './config/Config';
import ApplicationHeader from './components/applicationHeader';
import ApplicationFooter from './components/applicationFooter';
import HelpSection from './components/helpSection';
import DialogWindow from './components/dialogWindow';
import Loader from './components/loader';
import store from './store';

export default {
    name: 'Efflux',
    store,
    components: {
        ApplicationHeader,
        ApplicationFooter,
        HelpSection,
        Loader,
        DialogWindow,
    },
    computed: {
        ...mapState([
            'menuOpened',
            'overlayOpened',
            'loading',
            'dialog'
        ]),
        ...mapGetters([
            'getCopy'
        ]),
    },
    watch: {
        menuOpened(isOpen) {
            // prevent scrolling main body when scrolling menu list
                window.document.body.style.overflow = isOpen ? 'hidden' : 'auto';
        }
    },
    created() {
        // expose publishing / subscribe bus to integrate with outside API's

        window.efflux = Object.assign( window.efflux || {}, {
            Pubsub: Pubsub
        });

        // show confirmation message on page reload

        if ( !Config.isDevMode() ) {
            const handleUnload = () => this.getCopy('WARNING_UNLOAD');
            if ( Bowser.ios ) {
                window.addEventListener( 'popstate', handleUnload );
            }
            else if ( typeof window.onbeforeunload !== 'undefined' ) {
                const prevBeforeUnload = window.onbeforeunload;
                window.onbeforeunload = ( aEvent ) => {
                    if ( prevBeforeUnload ) {
                        prevBeforeUnload( aEvent );
                    }
                    return handleUnload();
                };
            }
        }
    },
};
</script>

<style lang="scss">
    @import "./styles/_variables.scss";

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
