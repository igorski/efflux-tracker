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
    <section class="instrument-oscillator-editor">
        <!-- waveform selection -->
        <div class="oscillator-waveforms">
            <select-box
                v-model="oscillatorWaveform"
                :options="availableWaveforms"
                class="vertical-middle waveform-select"
            />
            <select-box
                v-if="isSampler"
                v-model="selectedSampleName"
                :options="availableSamples"
                class="vertical-middle waveform-select"
            />
            <toggle-button
                v-model="oscillatorEnabled"
                @change="handleOscillatorEnabledChange"
                class="vertical-middle waveform-enable"
                sync
            />
        </div>
        <!-- waveform display -->
        <waveform-display
            class="waveform-container"
            :enabled="oscillatorEnabled"
            :instrument-index="instrumentIndex"
            :oscillator-index="oscillatorIndex"
            @invalidate="invalidate()"
        />
        <!-- oscillator tuning and volume -->
        <div class="tuning-editor instrument-parameters">
            <h2 v-t="'oscillatorTuning'"></h2>
            <div class="wrapper input range padded">
                <label v-t="'detuneLabel'" for="detune"></label>
                <input v-model.number="oscillatorDetune"
                       type="range" id="detune" min="-50" max="50" step=".1" value="0" />
            </div>
            <div class="wrapper input range">
                <label v-t="'octaveShiftLabel'" for="octaveShift"></label>
                <input v-model.number="oscillatorOctaveShift"
                       type="range" id="octaveShift" min="-2" max="2" step="1" value="0"
                       :disabled="oscillator.waveform === 'NOISE'" />
            </div>
            <div class="wrapper input range">
                <label v-t="'fineShiftLabel'" for="fineShift"></label>
                <input v-model.number="oscillatorFineShift"
                       type="range" id="fineShift" min="-7" max="7" step="1" value="0"
                       :disabled="oscillator.waveform === 'NOISE'" />
            </div>
            <div class="wrapper input range">
                <label v-t="'volumeLabel'" for="volume"></label>
                <input type="range"
                       v-model.number="oscillatorVolume"
                       id="volume" min="0" max="1" step=".01" value="0" />
            </div>
        </div>
        <!-- envelopes -->
        <div class="envelope-editor instrument-parameters">
            <ul class="tab-list">
                <li v-t="'amplitudeEnvelope'"
                    :class="{ active: activeEnvelopeTab === 0 }"
                    @click="activeEnvelopeTab = 0">
                </li>
                <li v-t="'pitchEnvelope'"
                    :class="{ active: activeEnvelopeTab === 1 }"
                    @click="activeEnvelopeTab = 1">
                </li>
            </ul>
            <!-- amplitude envelope -->
            <div
                class="tabbed-content adsr-editor"
                :class="{ active: activeEnvelopeTab === 0 }"
            >
                <div class="wrapper input range">
                    <label v-t="'attack'" for="attack"></label>
                    <input v-model.number="amplitudeAttack"
                           type="range" id="attack" min="0" max="1" step=".01" value="0" />
                </div>
                <div class="wrapper input range">
                    <label v-t="'decay'" for="decay"></label>
                    <input v-model.number="amplitudeDecay"
                           type="range" id="decay" min="0" max="1" step=".01" value="0" />
                </div>
                <div class="wrapper input range">
                    <label v-t="'sustain'" for="sustain"></label>
                    <input v-model.number="amplitudeSustain"
                           type="range" id="sustain" min="0" max="1" step=".01" value=".75" />
                </div>
                <div class="wrapper input range">
                    <label v-t="'release'" for="release"></label>
                    <input v-model.number="amplitudeRelease"
                           type="range" id="release" min="0" max="1" step=".01" value="0" />
                </div>
            </div>
            <!-- pitch envelope -->
            <div
                class="tabbed-content adsr-editor"
                :class="{ active: activeEnvelopeTab === 1 }"
            >
                <div class="wrapper input range pitch-range">
                    <label v-t="'range'" for="pitchRange"></label>
                    <input v-model.number="pitchRange"
                           type="range" id="pitchRange" min="-24" max="24" step="1" value="0" />
                </div>
                <div class="wrapper input range">
                    <label v-t="'attack'" for="pitchAttack"></label>
                    <input v-model.number="pitchAttack"
                           type="range" id="pitchAttack" min="0" max="1" step=".01" value="0" />
                </div>
                <div class="wrapper input range">
                    <label v-t="'decay'" for="pitchDecay"></label>
                    <input v-model.number="pitchDecay"
                           type="range" id="pitchDecay" min="0" max="1" step=".01" value="1" />
                </div>
                <div class="wrapper input range">
                    <label v-t="'sustain'" for="pitchSustain"></label>
                    <input v-model.number="pitchSustain"
                           type="range" id="pitchSustain" min="0" max="1" step=".01" value=".75" />
                </div>
                <div class="wrapper input range">
                    <label v-t="'release'" for="pitchRelease"></label>
                    <input v-model.number="pitchRelease"
                           type="range" id="pitchRelease" min="0" max="1" step=".01" value="0" />
                </div>
            </div>
        </div>
    </section>
</template>

<script lang="ts">
import { mapGetters } from "vuex";
import { ToggleButton } from "vue-js-toggle-button";
import OscillatorTypes from "@/definitions/oscillator-types";
import AudioService from "@/services/audio-service";
import { enqueueState } from "@/model/factories/history-state-factory";
import type { InstrumentOscillator } from "@/model/types/instrument";
import type { Sample } from "@/model/types/sample";
import SelectBox from "@/components/forms/select-box.vue";
import WaveformDisplay from "@/components/waveform-display/waveform-display.vue";
import { clone } from "@/utils/object-util";
import messages from "./messages.json";

const TUNING_PROPERTIES = [ "detune", "octaveShift", "fineShift" ];

export default {
    i18n: { messages },
    components: {
        SelectBox,
        ToggleButton,
        WaveformDisplay,
    },
    props: {
        instrumentIndex: {
            type: Number,
            required: true,
        },
        oscillatorIndex: {
            type: Number,
            required: true,
        },
    },
    data: () => ({
        activeEnvelopeTab: 0,
    }),
    computed: {
        ...mapGetters([
            "activeSong",
            "samples",
        ]),
        oscillator(): InstrumentOscillator {
            return this.activeSong.instruments[ this.instrumentIndex ].oscillators[ this.oscillatorIndex ];
        },
        isSampler(): boolean {
            return this.oscillator.waveform === OscillatorTypes.SAMPLE;
        },
        // generic oscillator properties
        oscillatorEnabled: {
            get(): boolean { return this.oscillator.enabled; },
            set( value: boolean ): void { this.update( "enabled", value ); }
        },
        oscillatorWaveform: {
            get(): boolean {
                return this.oscillator.waveform;
            },
            set( value: OscillatorTypes ): void {
                this.update( "waveform", value );
                if ( value === OscillatorTypes.SAMPLE && !this.oscillator.sample ) {
                    this.selectedSampleName = this.samples?.length ? this.samples[ 0 ].name : "";
                }
            }
        },
        oscillatorVolume: {
            get(): number { return this.oscillator.volume; },
            set( value: number ): void { this.update( "volume", value ); }
        },
        // oscillator tuning
        oscillatorDetune: {
            get(): number { return this.oscillator.detune; },
            set( value: number ) { this.update( "detune", value ); }
        },
        oscillatorOctaveShift: {
            get(): number { return this.oscillator.octaveShift; },
            set( value: number ): void { this.update( "octaveShift", value ); }
        },
        oscillatorFineShift: {
            get(): number { return this.oscillator.fineShift; },
            set( value: number ): void { this.update( "fineShift", value ); }
        },
        // oscillator amplitude envelopes
        amplitudeAttack: {
            get(): number { return this.oscillator.adsr.attack; },
            set( value: number ): void { this.update( "adsr", { ...this.oscillator.adsr, attack: value }); }
        },
        amplitudeDecay: {
            get(): number { return this.oscillator.adsr.decay; },
            set( value: number ): void { this.update( "adsr", { ...this.oscillator.adsr, decay: value }); }
        },
        amplitudeSustain: {
            get(): number { return this.oscillator.adsr.sustain; },
            set( value: number ): void { this.update( "adsr", { ...this.oscillator.adsr, sustain: value }); }
        },
        amplitudeRelease: {
            get(): number { return this.oscillator.adsr.release; },
            set( value: number ): void { this.update( "adsr", { ...this.oscillator.adsr, release: value }); }
        },
        // oscillator pitch envelopes
        pitchRange: {
            get(): number { return this.oscillator.pitch.range; },
            set( value: number ): void { this.update( "pitch", { ...this.oscillator.pitch, range: value }); }
        },
        pitchAttack: {
            get(): number { return this.oscillator.pitch.attack; },
            set( value: number ): void { this.update( "pitch", { ...this.oscillator.pitch, attack: value }); }
        },
        pitchDecay: {
            get(): number { return this.oscillator.pitch.decay; },
            set( value: number ): void { this.update( "pitch", { ...this.oscillator.pitch, decay: value }); }
        },
        pitchSustain: {
            get(): number { return this.oscillator.pitch.sustain; },
            set( value: number ): void { this.update( "pitch", { ...this.oscillator.pitch, sustain: value }); }
        },
        pitchRelease: {
            get(): number { return this.oscillator.pitch.release; },
            set( value: number ): void { this.update( "pitch", { ...this.oscillator.pitch, release: value }); }
        },
        availableWaveforms(): { label: string, value: OscillatorTypes }[] {
            return [
                { label: this.$t( "sawtooth" ), value: OscillatorTypes.SAW },
                { label: this.$t( "sine" ),     value: OscillatorTypes.SINE },
                { label: this.$t( "triangle" ), value: OscillatorTypes.TRIANGLE },
                { label: this.$t( "square" ),   value: OscillatorTypes.SQUARE },
                { label: this.$t( "pwm" ),      value: OscillatorTypes.PWM },
                { label: this.$t( "noise" ),    value: OscillatorTypes.NOISE },
                { label: this.$t( "custom" ),   value: OscillatorTypes.CUSTOM },
                { label: this.$t( "sample" ),   value: OscillatorTypes.SAMPLE }
            ];
        },
        availableSamples(): Sample[] {
            return this.samples.map(({ name }) => ({ label: name, value: name }));
        },
        selectedSampleName: {
            get(): string {
                return this.oscillator.sample;
            },
            set( name: string ): void {
                this.update( "sample", name );
            }
        },
    },
    methods: {
        update( prop: string, value: any ): void {
            const store     = this.$store;
            const component = this;
            const { oscillatorIndex, instrumentIndex } = this;
            const orgValue = clone( this.oscillator?.[ prop ] || "" );

            const applyUpdate = (): void => {
                const oscillator = store.getters.activeSong.instruments[ instrumentIndex ].oscillators[ oscillatorIndex ];
               
                if ( TUNING_PROPERTIES.includes( prop )) {
                    AudioService.updateOscillator( "tuning", instrumentIndex, oscillatorIndex, oscillator );
                } else if ( prop === "volume" ) {
                    AudioService.updateOscillator( "volume", instrumentIndex, oscillatorIndex, oscillator  );
                } else if ( prop === "waveform" ) {
                    if ( !component._isDestroyed && !oscillator.enabled ) {
                        component.update( "enabled", true );
                    }
                    AudioService.updateOscillator( "waveform", instrumentIndex, oscillatorIndex, oscillator );
                }
            };
            const commit = (): void => {
                store.commit( "updateOscillator", { instrumentIndex, oscillatorIndex, prop, value });
                applyUpdate();
            };
            commit();
            this.invalidate();

            enqueueState( `osc_${instrumentIndex}_${oscillatorIndex}_${prop}`, {
                undo(): void {
                    store.commit( "updateOscillator", { instrumentIndex, oscillatorIndex, prop, value: orgValue });
                    applyUpdate();
                },
                redo: commit,
            });
        },
        handleOscillatorEnabledChange(): void {
            this.cacheOscillator();
            this.invalidate();
        },
        // propagate the changes to the AudioService
        cacheOscillator(): void {
            AudioService.updateOscillator( "waveform", this.instrumentIndex, this.oscillatorIndex, this.oscillator );
        },
        invalidate(): void {
            this.$emit( "invalidate" );
        },
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";
@import "@/styles/tabs";
@import "@/styles/instrument-editor";
@import "@/styles/forms";

.instrument-oscillator-editor {
    @include boxSize();
    position: relative;
    padding-top: $spacing-large;

    @media screen and ( min-width: $ideal-instrument-editor-width ) {
        display: inline-block;
        width: 550px;
        padding: ($spacing-large - $spacing-medium);
        border: 1px solid #666;
        border-top: 1px solid #666;
        border-bottom-left-radius: $spacing-small;
        border-bottom-right-radius: $spacing-small;
        border-right-style: dashed;
    }
}

.waveform-select {
    width: 178px;
    margin-right: $spacing-small;
}

.waveform-enable {
    float: right;
    margin-top: $spacing-xsmall;
}

.oscillator-waveforms {
    padding: $spacing-xsmall 0 $spacing-medium;
}

.tuning-editor {
    display: inline-block;
    padding: 10px $spacing-medium 21px;
    @include boxSize();
    border: 1px solid #666;
    min-height: 174px;

    .padded {
        margin-top: $spacing-small;
    }
}

.envelope-editor {
    position: relative;
    margin-top: -$spacing-medium;

    .tabbed-content {
        padding: $spacing-medium $spacing-medium;
        border: 1px solid #666;
        min-height: 165px;
    }

    @media screen and ( min-width: $ideal-instrument-editor-width ) {
        .adsr-editor {
            padding-bottom: 0;
        }

        .pitch-range {
            width: 85% !important;
            position: absolute;
            right: -175px;
            top: 234px;
            transform: rotate(-90deg);
            transform-origin: 0;

            label {
                text-align: right;
                margin-right: $spacing-xsmall;
            }
        }
    }
}
</style>
