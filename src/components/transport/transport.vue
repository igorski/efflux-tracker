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
    <section class="transport-section">
        <div
            class="transport-controls"
            :class="{
                'settings-mode': mobileMode === 'settings',
                'jam-mode': jamMode,
            }"
        >
            <ul class="transport-controls__buttons">
                <li>
                    <button
                        id="playBTN"
                        type="button"
                        :title="$t( isPlaying ? 'stop' : 'play' )"
                        :class="[ isPlaying ? 'icon-stop' : 'icon-play' ]"
                        @click="setPlaying( !isPlaying )"
                    ></button>
                </li>
                <li v-if="!jamMode">
                    <button
                         id="loopBTN"
                         type="button"
                         :title="$t('loop')"
                         class="icon-loop"
                         :class="{ active: isLooping }"
                         @click="setLooping( !isLooping )"
                     ></button>
                </li>
                <li>
                    <button
                        id="recordBTN"
                        type="button"
                        :title="$t('recordInput')"
                        @click="setRecording( !isRecording )"
                    ><i class="record-icon" :class="{ active: isRecording }"></i></button>
                </li>
                <li>
                    <button
                        type="button"
                        :title="$t('metronome')"
                        class="icon-metronome"
                        :class="{ active: isMetronomeEnabled }"
                        @click="setMetronomeEnabled( !isMetronomeEnabled )"
                    ></button>
                </li>
                <li v-if="!jamMode">
                    <button
                        type="button"
                        class="icon-settings"
                        :title="$t('settings')"
                        @click="handleSettingsToggle()"
                    ></button>
                </li>
                <li class="section-divider"><!-- x --></li>
                <template v-if="!jamMode">
                    <li>
                        <button
                            type="button"
                            class="pattern-back"
                            :title="$t('previousPattern')"
                            @click="gotoPreviousPattern( activeSong )"
                        >&lt;&lt;</button>
                    </li>
                    <li class="current-pattern">
                        <input
                            class="current"
                            ref="currentPatternInput"
                            v-model.number="currentOrderIndex"
                            maxlength="3"
                            @focus="focusPatternInput( true )"
                            @blur="focusPatternInput( false )"
                        />
                        <span class="divider">/</span>
                        <span class="total">{{ activeSong.order.length.toString() }}</span>
                    </li>
                    <li>
                        <button
                            type="button"
                            class="pattern-next"
                            :title="$t('nextPattern')"
                            @click="gotoNextPattern( activeSong )"
                        >&gt;&gt;</button>
                    </li>
                    <li class="section-divider"><!-- x --></li>
                </template>
            </ul>
            <ul class="transport-controls__tempo wrapper input range">
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
                        :min="minTempo"
                        :max="maxTempo"
                        step="0.1"
                    />
                    <input
                        v-if="showTempoInput"
                        ref="tempoInput"
                        :value="tempo"
                        type="number"
                        :min="minTempo"
                        :max="maxTempo"
                        step="0.1"
                        @blur="handleTempoInputBlur()"
                        @keyup.enter="handleTempoInputBlur()"
                    />
                    <span
                        v-else
                        class="value"
                        @click="handleTempoInputShow()"
                    >{{ $t('tempo', { tempo }) }}</span>
                </li>
                <li class="transport-controls__tempo-divider section-divider"><!-- x --></li>
            </ul>
            <pattern-order-list
                v-if="!jamMode && useOrders"
            />
        </div>
    </section>
</template>

<script lang="ts">
import { mapState, mapGetters, mapMutations } from "vuex";
import Bowser from "bowser";
import PatternOrderList from "@/components/pattern-order-list/pattern-order-list.vue";
import { enqueueState } from "@/model/factories/history-state-factory";
import KeyboardService from "@/services/keyboard-service";
import { resetPlayState } from "@/utils/song-util";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        PatternOrderList,
    },
    data: () => ({
        tempOrderIndex: 0,
        patternFocused: false,
        originalTempo: 0,
        showTempoInput: false,
    }),
    computed: {
        ...mapState({
            activeSong: state => state.song.activeSong,
            activeOrderIndex: state => state.sequencer.activeOrderIndex,
            midiConnected: state => state.midi.midiConnected,
            mobileMode: state => state.mobileMode,
        }),
        ...mapGetters([
            "activePatternIndex",
            "isPlaying",
            "isLooping",
            "isRecording",
            "isMetronomeEnabled",
            "jamMode",
            "amountOfSteps",
            "useOrders",
        ]),
        canRecord(): boolean {
            // for desktop/laptop devices we enable record mode (for keyboard input)
            // if a MIDI device is connected on a mobile device, it is enabled as well
            const hasKeyboard = !Bowser.ios && !Bowser.android;
            return hasKeyboard || this.midiConnected;
        },
        tempo: {
            get(): number {
                return this.activeSong.meta.tempo;
            },
            set( value: number ): void {
                if ( isNaN( value )) {
                    return;
                }
                value = Math.max( this.minTempo, Math.min( this.maxTempo, parseFloat( value )));
                const { originalTempo } = this;
                const store = this.$store;
                const commit = () => store.commit( "setTempo", value );
                // Actions.TEMPO_CHANGE
                enqueueState( "tc", {
                    undo() {
                        store.commit( "setTempo", originalTempo );
                    },
                    redo: commit
                });
                commit();
                this.originalTempo = value;
            }
        },
        currentOrderIndex: {
            get(): number {
                return ( this.patternFocused ? this.tempOrderIndex : this.activeOrderIndex ) + 1;
            },
            set( index: number ): void {
                // normalize to Array indices (0 == first, not 1)
                const value = Math.min( parseFloat( index.toString() ), this.activeSong.order.length ) - 1;
                if ( value >= 0 && value !== this.activeOrderIndex ) {
                    this.tempOrderIndex = value;
                }
            }
        },
    },
    watch: {
        isPlaying( playing: boolean ): void {
            if ( playing ) {
                this.setPosition({ activeSong: this.activeSong, orderIndex: this.activeOrderIndex });
            } else {
                if ( this.isRecording ) {
                    this.setRecording( false );
                }
                resetPlayState( this.activeSong.patterns ); // unset playing state of existing events
            }
        },
        isRecording( recording: boolean, wasRecording?: boolean ): void {
            if ( wasRecording ) {
                // unflag the recorded state of all the events
                const patterns = this.activeSong.patterns;
                let event, i;

                patterns.forEach( pattern => {
                    pattern.channels.forEach( events => {
                        i = events.length;
                        while ( i-- ) {
                            event = events[ i ];
                            if ( event ) {
                                event.recording = false;
                            }
                        }
                    });
                });
            }
        },
        activePatternIndex: {
            immediate: true,
            handler( value: number ): void {
                const newSteps = this.activeSong.patterns[ value ].steps;
                if ( this.amountOfSteps !== newSteps ) {
                    this.setPatternSteps({
                        pattern: this.activeSong.patterns[ this.activePatternIndex ],
                        steps: newSteps
                    });
                }
            }
        },
        activeSong: {
            immediate: true,
            handler(): void {
                this.originalTempo = this.tempo;
            }
        },
    },
    created(): void {
        this.minTempo = 40;
        this.maxTempo = 300;
    },
    methods: {
        ...mapMutations([
            "gotoPattern",
            "setPlaying",
            "setPosition",
            "setLooping",
            "setRecording",
            "setCurrentStep",
            "setMetronomeEnabled",
            "setTempo",
            "setPatternSteps",
            "suspendKeyboardService",
            "gotoPreviousPattern",
            "gotoNextPattern",
            "setMobileMode",
        ]),
        handleSettingsToggle(): void {
            this.setMobileMode( this.mobileMode ? null : "settings" );
        },
        focusPatternInput( value: boolean ): void {
            KeyboardService.setListener( value ? this.handlePatternInput.bind( this ) : null );
            if ( value ) {
                this.tempOrderIndex = this.activeOrderIndex;
            } else {
                this.gotoPattern({ orderIndex: this.tempOrderIndex, song: this.activeSong });
            }
            this.patternFocused = value;
        },
        blurPatternInput(): void {
            this.$refs.currentPatternInput?.blur();
        },
        handlePatternInput( type: string, keyCode: number, event: KeyboardEvent ): boolean {
            if ( type !== "up" ) {
                return true; // always block when focused
            }
            switch ( keyCode ) {
                default:
                    return false;
                case 13: // enter
                    this.blurPatternInput();
                    break;
                case 27: // esc
                    this.tempOrderIndex = this.activeOrderIndex; // cancel changes
                    this.blurPatternInput();
                    break;
                case 32: // spacebar
                    this.blurPatternInput();
                    this.setPlaying( !this.isPlaying );
                    break;
            }
            event.preventDefault();
            return true;
        },
        async handleTempoInputShow(): Promise<void> {
            this.showTempoInput = true;
            this.suspendKeyboardService( true );
            await this.$nextTick();
            this.$refs.tempoInput.focus();
        },
        handleTempoInputBlur(): void {
            this.tempo = parseFloat( this.$refs.tempoInput.value );
            this.showTempoInput = false;
            this.suspendKeyboardService( false );
        }
    }
};
</script>

<style lang="scss" scoped>
@use "@/styles/_colors";
@use "@/styles/_mixins";
@use "@/styles/_variables";
@use "@/styles/forms";
@use "@/styles/transporter";
@use "@/styles/typography";

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
    background-color: colors.$color-editor-background;
}

.transport-controls {
    display: flex;
    align-items: center;
    @include typography.titleFont();
    border: none;
    border-radius: 0;
    margin: 0 auto;
    min-width: 100%;
    max-width: variables.$ideal-width;
    min-height: 44px;

    &.jam-mode {
        min-width: auto;
        max-width: variables.$ideal-menu-width-jam-mode;
    }

    &__buttons,
    &__tempo {
        @include mixins.list();
        padding-left: variables.$spacing-small * 2;
        display: flex;
        align-items: center;

        li {
            display: inline;
            margin: variables.$spacing-small 0;
            padding: 0;
            font-weight: bold;
        }
    }

    &__buttons {
        li {
            /* measure indicator */
            &.current-pattern {
                display: inline-block;
                padding: 0;
                color: #FFF;

                .current {
                    width: variables.$spacing-xlarge; /* fits "333" */
                    height: variables.$spacing-large;
                    border: 1px solid #999;
                    font-weight: bold;
                    margin: 0 variables.$spacing-small;
                    color: #FFF;
                    background-color: transparent;
                    text-align: center;
                }

                .total {
                    background-color: #333;
                    height: variables.$spacing-large;
                    text-align: center;
                    padding: variables.$spacing-small variables.$spacing-medium;
                    margin: 0 variables.$spacing-small;
                    @include typography.toolFont();
                }
            }
        }

        button {
            @include transporter.sequencerButtons();

            &#loopBTN:before {
                margin-left: variables.$spacing-xxsmall;
            }

            &#recordBTN {
                padding-left: variables.$spacing-xsmall;
            }

            /* pattern jump buttons */
            &.pattern-next,
            &.pattern-back {
                @include typography.titleFont();
            }

            &.pattern-next {
                padding-left: 0;
            }

            &.icon-metronome.active {
                color: #FFF;
            }

            &.icon-settings {
                display: none; /* mobile only (see below) */
                padding: 0 variables.$spacing-small;
                &:before {
                    margin-left: -( variables.$spacing-small );
                }
            }

            &.enabled {
                color: red;
            }
        }
    }

    /* tempo control */

    &__tempo {
        padding: 0;
    
        label {
            margin-right: variables.$spacing-small;
            display: inline-block;
            @include typography.toolFont();
        }

        input {
            display: inline-block;
            margin: 0 variables.$spacing-small 0 0;
            vertical-align: middle;
        }

        .value {
            display: inline-block;
            @include typography.toolFont();
            cursor: pointer;
        }
    }

    #songTempo {
        width: 150px;
    }
}

/* ideal view */

@include mixins.ideal() {
    .transport-controls {
        min-width: auto;
    }
}

/* everything above median app size */

@media screen and ( min-width: variables.$app-width ) {
    .transport-controls {
        .section-divider {
            padding: 0 variables.$spacing-medium;
            margin: 0;
            height: variables.$transport-height;

            &:before {
                position: absolute;
                z-index: 1;
                content: "";
                border-left: 1px solid #666;
                height: inherit;
            }
        }
    }
}

@include mixins.mobile() {
    .transport-controls {
        background-color: inherit;
        margin-top: (variables.$transport-height - variables.$spacing-small);

        label {
            display: none !important;
        }

        .current-pattern {
            width: auto;
        }

        &__tempo,
        .pattern-order-list {
            display: none;
        }

        &__buttons button.icon-settings {
            display: inline;
        }

        &.jam-mode .transport-controls__tempo {
            display: initial;
        }
    }

    .settings-mode {
        display: flex;
        flex-direction: column;
        align-items: normal;

        .transport-controls__tempo {
            display: inline-block;
            margin: 0 variables.$spacing-small variables.$spacing-small;
            padding: 0 0 0 variables.$spacing-small;
        }

        .pattern-order-list {
            display: inline-flex;
            margin: 0 variables.$spacing-medium;
        }
    }
}
</style>
