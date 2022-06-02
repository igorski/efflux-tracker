/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2022 - https://www.igorski.nl
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
    <div class="channel-strip">
        <h3>{{ title }}</h3>
        <h4
            class="preset-name"
            @click="openInstrumentEditor()"
        >{{ name }}</h4>
        <div class="wrapper input range volume-wrapper">
            <input
                v-model.number="volume"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value="1"
                class="range"
            />
            <meter
                v-if="performAnalysis"
                :value="output"
                class="meter"
                min="-100"
                max="10"
                low="-100"
                high="-5"
                optimum="0"
            ></meter>
        </div>
        <div class="toggles">
            <button
                class="toggle"
                :class="{ active: instrument.muted }"
                @click="muted = !muted"
            >M</button>
            <button
                class="toggle"
                :class="{ active: instrument.solo }"
                @click="solo = !solo"
            >S</button>
        </div>
        <div class="eq">
            <button
                class="toggle"
                :class="{ active: eqEnabled }"
                @click="eqEnabled = !eqEnabled"
            >EQ</button>
            <eq-control
                v-model.number="eqLow"
                class="eq__knob"
            />
            <eq-control
                v-model.number="eqMid"
                class="eq__knob"
            />
            <eq-control
                v-model.number="eqHigh"
                class="eq__knob"
            />
        </div>
        <div
            v-if="supportsPanning"
            class="wrapper input range panning-wrapper"
        >
            <input
                v-model="panning"
                type="range"
                min="-1"
                max="1"
                step=".01"
                value="0"
                class="range"
                @dblclick="resetPan()"
            />
        </div>
    </div>
</template>

<script>
import { mapState, mapMutations } from "vuex";
import { EQ_LOW, EQ_MID, EQ_HIGH, applyParamChange } from "@/definitions/param-ids";
import ModalWindows from "@/definitions/modal-windows";
import { enqueueState } from "@/model/factories/history-state-factory";
import AudioService, { applyModule } from "@/services/audio-service";
import { supportsAnalysis, getAmplitude } from "@/services/audio/analyser";
import { supports } from "@/services/audio/webaudio-helper";
import { clone } from "@/utils/object-util";
import EqControl from "./eq-control";

export default {
    components: {
        EqControl
    },
    props: {
        instrumentIndex: {
            type: Number,
            required: true,
        },
        analyser: {
            type: AnalyserNode,
            required: false,
        },
    },
    data: vm => ({
        title: `# ${vm.instrumentIndex + 1}`,
        output: -100,
        renderCycle: 0,
    }),
    computed: {
        ...mapState({
            activeSong: state => state.song.activeSong,
        }),
        instrument() {
            return this.activeSong.instruments[ this.instrumentIndex ];
        },
        name() {
            const { name, presetName } = this.instrument;
            if ( !name.startsWith( "Instrument ")) {
                // instrument has a non-default name set
                return name;
            }
            // instrument has preset, use its name
            return ( presetName || name || "" ).replace( "FACTORY ", "" );
        },
        volume: {
            get() {
                return this.instrument.volume;
            },
            set( value ) {
                const store = this.$store;
                const instrumentIndex = this.instrumentIndex;
                const wasMuted = this.instrument.muted;
                const curValue = this.instrument.volume;
                this.update( "volume", value, newValue => {
                    AudioService.adjustInstrumentVolume( instrumentIndex, newValue );
                    // adjusting volume always deactivates the muted state
                    if ( wasMuted ) {
                        const isMuted = newValue === curValue;
                        store.commit( "updateInstrument", { instrumentIndex, prop: "muted", value: isMuted });
                        AudioService.adjustInstrumentVolume( instrumentIndex, isMuted ? 0 : newValue );
                    }
                });
            }
        },
        muted: {
            get() {
                return !!this.instrument.muted;
            },
            set( value ) {
                const instrumentIndex = this.instrumentIndex;
                const store    = this.$store;
                const wasMuted = !!this.instrument.muted;
                const wasSolod = this.instrument.solo;
                const volume   = this.instrument.volume;
                const hadExistingSolo = this.hasSolo(); // implying another instrument was solod

                this.update( "muted", value, newValue => {
                    let targetVolume = newValue ? 0 : volume;
                    const isUndo = newValue === wasMuted;
                    if ( newValue ) {
                        if ( wasSolod ) {
                            // activating mute always unsolos instrument
                            store.commit( "updateInstrument", { instrumentIndex, prop: "solo", value: false });
                        }
                    } else if ( hadExistingSolo && isUndo ) {
                        targetVolume = 0;
                    }
                    AudioService.adjustInstrumentVolume( instrumentIndex, targetVolume );
                });
            }
        },
        solo: {
            get() {
                return !!this.instrument.solo;
            },
            set( value ) {
                const store = this.$store;
                const instrumentIndex = this.instrumentIndex;
                const { instruments } = this.activeSong;
                const volume   = this.instrument.volume;
                const wasSolod = this.instrument.solo;
                const wasMuted = this.muted;

                const instrumentStates = instruments.reduce(( acc, instrument, index ) => {
                    acc[ index ] = {
                        muted : instrument.muted,
                        solo  : instrument.solo
                    };
                    return acc;
                }, []);
                // whether another instrument also has solo mode activated
                const hadExistingSolo = instrumentStates.some(({ solo }, index ) => index !== instrumentIndex && !!solo );

                this.update( "solo", value, newValue => {
                    const isUndo = newValue === wasSolod;
                    // update volumes of all other instruments
                    instruments.forEach(( instrument, index ) => {
                        if ( index === instrumentIndex ) {
                            return;
                        }
                        const oldState = instrumentStates[ index ];
                        let volume = 0;
                        if ( !oldState.muted ) {
                            if ( newValue ) {
                                volume = oldState.solo ? instrument.volume : 0;
                            } else {
                                volume = oldState.solo || !hadExistingSolo ? instrument.volume : 0;
                            }
                        }
                        if ( isUndo ) {
                            store.commit( "updateInstrument", { instrumentIndex: index, prop: "solo", value: oldState.solo });
                        }
                        AudioService.adjustInstrumentVolume( index, volume );
                    });
                    // update volume of this instrument
                    if ( newValue ) {
                        if ( wasMuted ) {
                            // activating solo always unmutes instrument
                            store.commit( "updateInstrument", { instrumentIndex, prop: "muted", value: false });
                        }
                        // as multiple channels can enable solo, force volume on for this channel
                        AudioService.adjustInstrumentVolume( instrumentIndex, volume );
                    } else {
                        if ( wasMuted ) {
                            store.commit( "updateInstrument", { instrumentIndex, prop: "muted", value: true });
                        }
                        AudioService.adjustInstrumentVolume( instrumentIndex, wasMuted || hadExistingSolo ? 0 : volume );
                    }
                });
            }
        },
        panning: {
            get() {
                return this.instrument.panning;
            },
            set( value ) {
                const index = this.instrumentIndex;
                this.update( "panning", value, newValue => {
                    AudioService.adjustInstrumentPanning( index, newValue );
                });
            }
        },
        /* EQ */
        eqEnabled: {
            get() {
                return this.instrument.eq.enabled;
            },
            set( value ) {
                this.update( "eq", { ...this.instrument.eq, enabled: value });
            }
        },
        eqLow: {
            get() {
                return this.instrument.eq.lowGain;
            },
            set( value ) {
                this.updateParamChange( EQ_LOW, value, this.eqLow );
            }
        },
        eqMid: {
            get() {
                return this.instrument.eq.midGain;
            },
            set( value ) {
                this.updateParamChange( EQ_MID, value, this.eqMid );
            }
        },
        eqHigh: {
            get() {
                return this.instrument.eq.highGain;
            },
            set( value ) {
                this.updateParamChange( EQ_HIGH, value, this.eqHigh );
            }
        },
        performAnalysis() {
            return supportsAnalysis( this.analyser );
        },
    },
    created() {
        this.supportsPanning = supports( "panning" );

        if ( !this.performAnalysis ) {
            return;
        }
        // if an AnalyserNode is provided, start the render loop to update the meter

        // eslint-disable-next-line vue/no-mutating-props
        this.analyser.fftSize = 2048;
        const sampleBuffer    = new Float32Array( this.analyser.fftSize );

        const renderLoop = () => {
            this.output      = getAmplitude( this.analyser, sampleBuffer );
            this.renderCycle = requestAnimationFrame( renderLoop );
        };
        renderLoop();
    },
    destroyed() {
        cancelAnimationFrame( this.renderCycle );
    },
    methods: {
        ...mapMutations([
            "openModal",
            "setSelectedInstrument",
            "updateInstrument",
        ]),
        openInstrumentEditor() {
            this.setSelectedInstrument( this.instrumentIndex );
            this.openModal( ModalWindows.INSTRUMENT_EDITOR );
        },
        hasSolo() {
            // whether one or more of the other channels in the songs instrument list has solo enabled
            return this.activeSong.instruments.find(( instrument, index ) => index !== this.instrumentIndex && instrument.solo );
        },
        resetPan() {
            this.panning = 0;
        },
        update( prop, value, optChangeHandler ) {
            const store    = this.$store;
            const orgValue = clone( this.instrument[ prop ] );
            const instrumentIndex = this.instrumentIndex;
            const commit = () => {
                store.commit( "updateInstrument", { instrumentIndex, prop, value });
                if ( optChangeHandler ) {
                    optChangeHandler( value );
                } else {
                    applyModule( prop, instrumentIndex, value );
                }
            };
            commit();
            enqueueState( `param_${instrumentIndex}_${prop}`, {
                undo() {
                    store.commit( "updateInstrument", { instrumentIndex, prop, value: orgValue });
                    if ( optChangeHandler ) {
                        optChangeHandler( orgValue );
                    } else {
                        applyModule( prop, instrumentIndex, orgValue );
                    }
                },
                redo: commit
            });
        },
        updateParamChange( paramId, value, orgValue ) {
            const store = this.$store;
            const instrumentIndex = this.instrumentIndex;
            const commit = () => {
                applyParamChange( paramId, value, instrumentIndex, store );
            };
            commit();
            enqueueState( `param_${instrumentIndex}_${paramId}`, {
                undo() {
                    applyParamChange( paramId, orgValue, instrumentIndex, store );
                },
                redo: commit
            });
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";
@import "@/styles/forms";

$width: 80px;

.channel-strip {
    width: $width;
    display: inline-block;
    padding: 0 0 $spacing-medium $spacing-medium;
    border-right: 1px solid #666;
    position: relative;
}

.preset-name {
    @include toolFont();
    @include truncate();
    cursor: pointer;
    margin-left: -$spacing-medium;
    font-size: 85%;
    text-align: center;
    height: 1.5em;
    background-color: $color-2;
    padding: 5px;
    color: #000;

    &:hover {
        background-color: $color-1;
    }
}

.range {
    width: 125px;
    height: 25px;
}

.meter {
    position: relative;
    transform-origin: 0;
    top: -$spacing-small;
    margin: 0 $spacing-small 0;
    width: 109px;
    height: 22px;

    // hot signals display as red, otherwise green

    &:-moz-meter-sub-optimum::-moz-meter-bar {
        background: #00BB00;
    }
    &::-webkit-meter-suboptimum-value {
        background: #00BB00;
    }

    &:-moz-meter-optimum::-moz-meter-bar {
        background: red;
    }
    &::-webkit-meter-optimum-value {
        background: red;
    }
}

.volume-title {
    margin-left: $spacing-small;
}

.volume-wrapper {
    transform: rotate(-90deg);
    transform-origin: 0;
    margin: 130px 0 0 16px;
}

.panning-wrapper {
    width: 70px;
    text-align: center;
}

.toggle {
    display: inline;
    font-size: 80%;
    padding: $spacing-xsmall $spacing-small;
    margin: 0 0 0 $spacing-small;

    &.active {
        background-color: $color-2;
    }
}

.eq {
    margin-top: $spacing-medium;

    &__knob {
        display: inline;
    }

    .toggle {
        position: relative;
        top: -12px;
        margin: 0 5px;
    }
}
</style>
