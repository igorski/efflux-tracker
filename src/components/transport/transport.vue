/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2021 - https://www.igorski.nl
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
    <section class="transport-section">
        <div class="transport-controls"
             :class="{ 'settings-mode': mobileMode === 'settings' }"
        >
            <ul class="inline-block">
                <li id="playBTN"
                    :class="[ isPlaying ? 'icon-stop' : 'icon-play' ]"
                    @click="setPlaying(!isPlaying)"
                ></li>
                <li id="loopBTN" class="icon-loop"
                    :class="{ active: isLooping }"
                    @click="setLooping(!isLooping)"
                ></li>
                <li id="recordBTN"
                    :class="[{ disabled: !canRecord }, isRecording ? 'active' : '' ]"
                    @click="setRecording(!isRecording)"
                ></li>
                <li class="icon-metronome"
                    :class="{ active: isMetronomeEnabled }"
                    @click="setMetronomeEnabled(!isMetronomeEnabled)"
                ></li>
                <li class="icon-settings"
                    @click="handleSettingsToggle"
                ></li>
                <li class="section-divider"><!-- x --></li>
                <li class="pattern-back"
                    @click="gotoPreviousPattern( activeSong )"
                >&lt;&lt;</li>
                <li class="current-pattern">
                    <input
                        class="current"
                        v-model.number="currentPatternValue"
                        maxlength="3"
                        @focus="suspendKeyboardService(true)"
                        @blur="suspendKeyboardService(false)"
                    />
                    <span class="divider">/</span>
                    <span class="total">{{ activeSong.patterns.length.toString() }}</span>
                </li>
                <li class="pattern-next"
                    @click="gotoNextPattern( activeSong )">&gt;&gt;</li>
            </ul>
            <ul class="tempo-control wrapper input range">
                <li class="section-divider"><!-- x --></li>
                <li>
                    <label
                        v-t="'tempoLabel'"
                        for="songTempo"
                    ></label>
                    <input
                        type="range"
                        id="songTempo"
                        name="tempo"
                        v-model="tempo"
                        @change="handleTempoControlChange"
                        min="40"
                        max="300"
                        step="0.1"
                    />
                    <span class="value">{{ $t('tempo', { tempo }) }}</span>
                </li>
            </ul>
        </div>
    </section>
</template>

<script>
import Vue from "vue";
import { mapState, mapGetters, mapMutations } from "vuex";
import Bowser from "bowser";

import { resetPlayState } from "@/utils/song-util";
import messages           from "./messages.json";

export default {
    i18n: { messages },
    data: () => ({
        originalTempo: 0,
    }),
    computed: {
        ...mapState({
            activeSong: state => state.song.activeSong,
            activePattern: state => state.sequencer.activePattern,
            midiConnected: state => state.midi.midiConnected,
            mobileMode: state => state.mobileMode,
        }),
        ...mapGetters([
            "isPlaying",
            "isLooping",
            "isRecording",
            "isMetronomeEnabled",
            "amountOfSteps"
        ]),
        canRecord() {
            // for desktop/laptop devices we enable record mode (for keyboard input)
            // if a MIDI device is connected on a mobile device, it is enabled as well
            const hasKeyboard = !Bowser.ios && !Bowser.android;
            return hasKeyboard || this.midiConnected;
        },
        tempo: {
            get() {
                return this.activeSong.meta.tempo;
            },
            set( value ) {
                this.setTempo( value );
            }
        },
        currentPatternValue: {
            get() {
                return this.activePattern + 1;
            },
            set( patternValue ) {
                // normalize to Array indices (0 == first, not 1)
                const value = Math.min( patternValue, this.activeSong.patterns.length ) - 1;
                if ( value >= 0 && value !== this.activePattern ) {
                    this.setActivePattern( value );
                }
            }
        },
    },
    watch: {
        isPlaying(playing) {
            if (playing) {
                this.setPosition({ activeSong: this.activeSong, pattern: this.activePattern });
            } else {
                if (this.isRecording) {
                    this.setRecording(false);
                }
                resetPlayState(this.activeSong.patterns); // unset playing state of existing events
            }
        },
        isRecording(recording, wasRecording) {
            if (wasRecording) {
                // unflag the recorded state of all the events
                const patterns = this.activeSong.patterns;
                let event, i;

                patterns.forEach(pattern => {
                    pattern.channels.forEach(events => {
                        i = events.length;
                        while ( i-- ) {
                            event = events[ i ];
                            if ( event )
                                Vue.set(event, "recording", false);
                        }
                    });
                });
            }
        },
        activePattern: {
            immediate: true,
            handler(value) {
                const newSteps = this.activeSong.patterns[value].steps;
                if (this.amountOfSteps !== newSteps) {
                    this.setPatternSteps({ pattern: this.activeSong.patterns[this.activePattern], steps: newSteps });
                }
            }
        },
        activeSong: {
            immediate: true,
            handler() {
                this.originalTempo = this.tempo;
            }
        },
    },
    methods: {
        ...mapMutations([
            "setPlaying",
            "setPosition",
            "setLooping",
            "setRecording",
            "setCurrentStep",
            "setMetronomeEnabled",
            "setTempo",
            "setActivePattern",
            "setPatternSteps",
            "suspendKeyboardService",
            "gotoPreviousPattern",
            "gotoNextPattern",
            "setMobileMode",
            "saveState",
        ]),
        handleSettingsToggle() {
            this.setMobileMode( this.mobileMode ? null : "settings" );
        },
        handleTempoControlChange({ target }) {
            const { originalTempo } = this;
            const newTempo = parseFloat( target.value );
            const store = this.$store;
            // Actions.TEMPO_CHANGE
            this.saveState({
                undo() {
                    store.commit( "setTempo", originalTempo );
                },
                redo() {
                    store.commit( "setTempo", newTempo );
                }
            });
            this.originalTempo = newTempo;
        }
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";
@import "@/styles/forms";
@import "@/styles/transporter";

/* generated font for all transporter icons */

@font-face {
    font-family: "transporter";
    src: url("../../assets/fonts/transporter.eot");
    src: url("../../assets/fonts/transporter.eot#iefix") format("embedded-opentype"),
    url("../../assets/fonts/transporter.woff") format("woff"),
    url("../../assets/fonts/transporter.ttf") format("truetype"),
    url("../../assets/fonts/transporter.svg#transporter") format("svg");
    font-weight: normal;
    font-style: normal;
}

.transport-section {
    background-color: $color-editor-background;;
}

.transport-controls {
    font-family: "Montserrat", Helvetica, Verdana, sans-serif;
    border: none;
    border-radius: 0;
    margin: 0 auto;
    min-width: 100%;
    max-width: $ideal-width;

    ul {
        @include list();
        padding-left: $spacing-medium;

        li {
            display: inline;
            margin: $spacing-small 0;
            padding: 0;
            font-weight: bold;
            cursor: pointer;

            @include large() {
                &:first-child {
                    padding-left: $spacing-xsmall;
                }
            }

            /* play button */
            &#playBTN:before {
                margin-right: 0;
                @include mobile() {
                    margin: 0;
                }
            }

            /* record button */
            &#recordBTN {
                background-color: #d00e57;
                padding: 0 9px;
                border-radius: 50%;
                margin-left: $spacing-small;

                &.active {
                    background-color: #FFF;
                }

                &.disabled {
                    display: none;
                }
            }

            /* measure indicator */
            &.current-pattern {
                display: inline-block;
                padding: 0;
                color: #FFF;

                .current {
                    width: $spacing-xlarge; /* fits "333" */
                    height: $spacing-large;
                    border: 1px solid #999;
                    font-weight: bold;
                    margin: 0 $spacing-small;
                    color: #FFF;
                    background-color: transparent;
                    text-align: center;
                }

                .total {
                    background-color: #333;
                    height: $spacing-large;
                    text-align: center;
                    padding: $spacing-small $spacing-medium;
                    margin: 0 $spacing-small;
                    @include toolFont();
                }
            }

            /* pattern jump buttons */
            &.pattern-next {
                padding-left: 0;
            }

            &.icon-metronome.active {
                color: #FFF;
            }

            &.icon-settings {
                display: none; /* mobile only (see below) */
            }

            &.icon-settings {
                padding: 0 $spacing-small;
            }

            &.enabled {
                color: red;
            }
        }
    }

    /* tempo control */

    .tempo-control {
        padding: $spacing-medium 0 0 $spacing-small;
        display: inline;

        label {
            margin-right: $spacing-medium;
            display: inline-block;
            @include toolFont();
        }

        input {
            display: inline-block;
            margin: 0 $spacing-medium 0 0;
            vertical-align: middle;
        }

        .value {
            display: inline-block;
            @include toolFont();
        }
    }

    #songTempo {
        width: 150px;
    }
}

/* ideal view */

@include ideal() {
    .transport-controls {
        min-width: auto;
    }
}

/* everything above median app size */

@media screen and ( min-width: $app-width ) {
    .transport-controls {
        .section-divider {
            padding: 0 $spacing-medium $spacing-xsmall;

            &:before {
                position: absolute;
                z-index: 1;
                content: "";
                border-left: 1px solid #666;
                height: $transport-height;
            }
        }
    }
}

@include mobile() {
    .transport-controls {
        background-color: inherit;
        margin-top: ($transport-height - $spacing-small);

        label {
            display: none !important;
        }
        .current-pattern {
            width: auto;
        }
        .tempo-control {
            display: none;
        }
        &.settings-mode .tempo-control {
            display: inline-block;
            margin: 0 $spacing-small $spacing-small;
            padding: 0 0 0 $spacing-small;
        }
        ul li.icon-settings {
            display: inline;
        }
    }
}
</style>
