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
                <section id="helpSection"><!-- x --></section>
            </div>
        </div>

        <application-footer />

        <div id="blind"><!-- obscuring area used below overlays --></div>
    </div>
</template>

<script>
import { mapState } from 'vuex';
import Pubsub from 'pubsub-js';
import ApplicationHeader from './components/applicationHeader';
import ApplicationFooter from './components/applicationFooter';
import store from './store';

export default {
    name: 'Efflux',
    store,
    components: {
        ApplicationHeader,
        ApplicationFooter
    },
    computed: {
        ...mapState([
            'menuOpened',
        ]),
    },
    watch: {
        menuOpened(isOpen) {
            // prevent scrolling main body when scrolling menu list
            window.document.body.style.overflow = isOpen ? "hidden" : "auto";
        }
    },
    created() {
        window.efflux = Object.assign( window.efflux || {}, {
            Pubsub: Pubsub // expose publishing / subscribe bus to integrate with outside API's
        });
    }
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
</style>
