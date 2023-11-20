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

<script lang="ts">
import { mapState, mapMutations } from "vuex";
import { EQ_LOW, EQ_MID, EQ_HIGH } from "@/definitions/param-ids";
import ModalWindows from "@/definitions/modal-windows";
import muteChannel from "@/model/actions/channel-mute";
import soloChannel from "@/model/actions/channel-solo";
import { type Instrument } from "@/model/types/instrument";
import { enqueueState } from "@/model/factories/history-state-factory";
import AudioService, { applyModule } from "@/services/audio-service";
import { applyParamChange } from "@/services/audio/param-controller";
import { supportsAnalysis, getAmplitude } from "@/services/audio/analyser";
import { supports } from "@/services/audio/webaudio-helper";
import { clone } from "@/utils/object-util";
import { getInstrumentName } from "@/utils/string-util";
import EqControl from "./eq-control.vue";

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
        instrument(): Instrument {
            return this.activeSong.instruments[ this.instrumentIndex ];
        },
        name(): string {
            return getInstrumentName( this.instrument );
        },
        volume: {
            get(): number {
                return this.instrument.volume;
            },
            set( value: number ): void {
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
            get(): boolean {
                return !!this.instrument.muted;
            },
            set( value: boolean ): void {
                enqueueState( `param_${this.instrumentIndex}_muted`,
                    muteChannel( this.$store, this.instrumentIndex, value )
                );
            }
        },
        solo: {
            get(): boolean {
                return !!this.instrument.solo;
            },
            set( value: boolean ): void {
                enqueueState( `param_${this.instrumentIndex}_solo`,
                    soloChannel( this.$store, this.instrumentIndex, value )
                );
            }
        },
        panning: {
            get(): number {
                return this.instrument.panning;
            },
            set( value: number ): void {
                const index = this.instrumentIndex;
                this.update( "panning", value, newValue => {
                    AudioService.adjustInstrumentPanning( index, newValue );
                });
            }
        },
        /* EQ */
        eqEnabled: {
            get(): boolean {
                return this.instrument.eq.enabled;
            },
            set( value: boolean ): void {
                this.update( "eq", { ...this.instrument.eq, enabled: value });
            }
        },
        eqLow: {
            get(): number {
                return this.instrument.eq.lowGain;
            },
            set( value: number ): void {
                this.updateParamChange( EQ_LOW, value, this.eqLow );
            }
        },
        eqMid: {
            get(): number {
                return this.instrument.eq.midGain;
            },
            set( value: number ): void {
                this.updateParamChange( EQ_MID, value, this.eqMid );
            }
        },
        eqHigh: {
            get(): number {
                return this.instrument.eq.highGain;
            },
            set( value: number ): void {
                this.updateParamChange( EQ_HIGH, value, this.eqHigh );
            }
        },
        performAnalysis(): boolean {
            return supportsAnalysis( this.analyser );
        },
    },
    created(): void {
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
    destroyed(): void {
        cancelAnimationFrame( this.renderCycle );
    },
    methods: {
        ...mapMutations([
            "openModal",
            "setSelectedInstrument",
            "updateInstrument",
        ]),
        openInstrumentEditor(): void {
            this.setSelectedInstrument( this.instrumentIndex );
            this.openModal( ModalWindows.INSTRUMENT_EDITOR );
        },
        hasSolo(): boolean {
            // whether one or more of the other channels in the songs instrument list has solo enabled
            return this.activeSong.instruments.find(( instrument, index ) => index !== this.instrumentIndex && instrument.solo );
        },
        resetPan(): void {
            this.panning = 0;
        },
        update( prop: string, value: any, optChangeHandler: ( value: any ) => void ): void {
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
        updateParamChange( paramId: string, value: number, orgValue: number ): void {
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
