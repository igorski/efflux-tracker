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
        <!-- waveform displays -->
        <div v-if="isSampler" class="waveform-container">
            <sample-display
                :sample="selectedSample"
                :color="instrumentColor"
                class="waveform-canvas"
            />
            <button
                v-t="'editSample'"
                type="button"
                class="waveform-container__action-button"
                @click="openSampleEditor()"
            ></button>
        </div>
        <div v-show="!isSampler" class="waveform-container" ref="canvasContainer"><!-- x --></div>
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
<script>
import { mapState, mapGetters, mapMutations } from "vuex";
import { canvas }        from "zcanvas";
import { ToggleButton }  from "vue-js-toggle-button";
import Config            from "@/config";
import OscillatorTypes   from "@/definitions/oscillator-types";
import ModalWindows      from "@/definitions/modal-windows";
import AudioService      from "@/services/audio-service";
import { enqueueState }  from "@/model/factories/history-state-factory";
import InstrumentFactory from "@/model/factories/instrument-factory";
import SampleFactory     from "@/model/factories/sample-factory";
import SelectBox         from "@/components/forms/select-box";
import SampleDisplay     from "@/components/sample-display/sample-display";
import { clone }         from "@/utils/object-util";
import WaveTableDraw     from "../wave-table-draw";
import messages          from "./messages.json";

const TUNING_PROPERTIES = [ "detune", "octaveShift", "fineShift" ];

// see colors.scss
const INSTRUMENT_COLORS = [
    "#b25050", "#b28050", "#a9b250", "#60b250", "#50b292", "#5071b2", "#8850b2", "#FF813D"
];

export default {
    i18n: { messages },
    components: {
        SampleDisplay,
        SelectBox,
        ToggleButton,
    },
    props: {
        oscillatorIndex: {
            type: Number,
            required: true,
        },
        instrumentIndex: {
            type: Number,
            required: true,
        },
        instrumentRef: {
            type: Object,
            required: true,
        },
    },
    data: () => ({
        activeEnvelopeTab: 0,
        canvas: null,
        wtDraw: null,
    }),
    computed: {
        ...mapState([
            "windowSize",
        ]),
        ...mapGetters([
            "samples",
        ]),
        oscillator() {
            return this.instrumentRef.oscillators[ this.oscillatorIndex ];
        },
        // generic oscillator properties
        oscillatorEnabled: {
            get() { return this.oscillator.enabled; },
            set( value ) { this.update( "enabled", value ); }
        },
        oscillatorWaveform: {
            get() { return this.oscillator.waveform; },
            set( value ) {
                this.update( "waveform", value );
                if ( value === OscillatorTypes.SAMPLE && !this.oscillator.sample ) {
                    this.selectedSampleName = this.samples?.length ? this.samples[ 0 ].name : "";
                }
            }
        },
        oscillatorVolume: {
            get() { return this.oscillator.volume; },
            set( value ) { this.update( "volume", value ); }
        },
        // oscillator tuning
        oscillatorDetune: {
            get() { return this.oscillator.detune; },
            set( value ) { this.update( "detune", value ); }
        },
        oscillatorOctaveShift: {
            get() { return this.oscillator.octaveShift; },
            set( value ) { this.update( "octaveShift", value ); }
        },
        oscillatorFineShift: {
            get() { return this.oscillator.fineShift; },
            set( value ) { this.update( "fineShift", value ); }
        },
        // oscillator amplitude envelopes
        amplitudeAttack: {
            get() { return this.oscillator.adsr.attack; },
            set( value ) { this.update( "adsr", { ...this.oscillator.adsr, attack: value }); }
        },
        amplitudeDecay: {
            get() { return this.oscillator.adsr.decay; },
            set( value ) { this.update( "adsr", { ...this.oscillator.adsr, decay: value }); }
        },
        amplitudeSustain: {
            get() { return this.oscillator.adsr.sustain; },
            set( value ) { this.update( "adsr", { ...this.oscillator.adsr, sustain: value }); }
        },
        amplitudeRelease: {
            get() { return this.oscillator.adsr.release; },
            set( value ) { this.update( "adsr", { ...this.oscillator.adsr, release: value }); }
        },
        // oscillator pitch envelopes
        pitchRange: {
            get() { return this.oscillator.pitch.range; },
            set( value ) { this.update( "pitch", { ...this.oscillator.pitch, range: value }); }
        },
        pitchAttack: {
            get() { return this.oscillator.pitch.attack; },
            set( value ) { this.update( "pitch", { ...this.oscillator.pitch, attack: value }); }
        },
        pitchDecay: {
            get() { return this.oscillator.pitch.decay; },
            set( value ) { this.update( "pitch", { ...this.oscillator.pitch, decay: value }); }
        },
        pitchSustain: {
            get() { return this.oscillator.pitch.sustain; },
            set( value ) { this.update( "pitch", { ...this.oscillator.pitch, sustain: value }); }
        },
        pitchRelease: {
            get() { return this.oscillator.pitch.release; },
            set( value ) { this.update( "pitch", { ...this.oscillator.pitch, release: value }); }
        },
        availableWaveforms() {
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
        isSampler() {
            return this.oscillator.waveform === OscillatorTypes.SAMPLE;
        },
        availableSamples() {
            return this.samples.map(({ name }) => ({ label: name, value: name }));
        },
        selectedSampleName: {
            get() {
                return this.oscillator.sample;
            },
            set( name ) {
                this.update( "sample", name );
            }
        },
        selectedSample() {
            const sample = this.samples.find(({ name }) => name === this.selectedSampleName );
            if ( !sample ) {
                return null;
            }
            return {
                ...sample,
                buffer: SampleFactory.getBuffer( sample, AudioService.getAudioContext() )
            };
        },
        instrumentColor() {
            return INSTRUMENT_COLORS[ this.instrumentIndex ];
        }
    },
    watch: {
        windowSize: {
            immediate: true,
            handler({ width, height }) {
                if ( this.canvas ) {
                    this.resizeWaveTableDraw(width, height);
                }
            },
        },
        oscillatorEnabled: {
            immediate: true,
            handler( enabled ) {
                if ( this.canvas ) {
                    this.canvas.setBackgroundColor( enabled ? "#000" : "#333" );
                    this.wtDraw.setEnabled( enabled );
                }
            }
        },
        oscillatorWaveform() { this.renderWaveform(); },
        oscillatorIndex() { this.renderWaveform(); },
        instrumentRef() { this.renderWaveform(); },
        instrumentIndex() {
            this.wtDraw.setColor( this.instrumentColor );
            this.canvas.invalidate();
        }
    },
    mounted() {
        this.canvas = new canvas({ width: Config.WAVE_TABLE_SIZE, height: 200 });
        this.canvas.setBackgroundColor( "#000000" );
        this.canvas.insertInPage( this.$refs.canvasContainer );
        this.canvas.getElement().className = "waveform-canvas";
        this.wtDraw = new WaveTableDraw(
            this.canvas.getWidth(),
            this.canvas.getHeight(),
            this.handleWaveformUpdate,
            this.oscillatorEnabled,
            this.instrumentColor
        );
        this.canvas.addChild( this.wtDraw );
        this.resizeWaveTableDraw();
        this.renderWaveform();
    },
    beforeDestroy() {
        this.canvas.dispose();
    },
    methods: {
        ...mapMutations([
            "openModal",
            "setCurrentSample",
        ]),
        update( prop, value ) {
            const store     = this.$store;
            const component = this;
            const { oscillatorIndex, instrumentIndex } = this;
            const orgValue = clone( this.oscillator?.[ prop ] || "" );

            const applyUpdate = () => {
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
            const commit = () => {
                store.commit( "updateOscillator", {
                    instrumentIndex, oscillatorIndex, prop, value
                });
                applyUpdate();
            };
            commit();
            this.invalidate();

            enqueueState( `osc_${instrumentIndex}_${oscillatorIndex}_${prop}`, {
                undo() {
                    store.commit( "updateOscillator", {
                        instrumentIndex, oscillatorIndex, prop, value: orgValue
                    });
                    applyUpdate();
                },
                redo: commit,
            });
        },
        handleOscillatorEnabledChange() {
            this.cacheOscillator();
            this.invalidate();
        },
        resizeWaveTableDraw( width = window.innerWidth ) {
            const ideal       = Config.WAVE_TABLE_SIZE; // equal to the length of the wave table
            const targetWidth = ( width < ideal ) ? width * 0.9: ideal;

            if ( this.canvas.getWidth() !== targetWidth ) {
                this.canvas.setDimensions( targetWidth, 200 );
                this.wtDraw._bounds.width = targetWidth;
            }
        },
        // invoked when drawing inside the wave-table-draw component
        handleWaveformUpdate( table ) {
            const orgTable    = clone( this.oscillator.table );
            const orgWaveform = this.oscillator.waveform;

            const store = this.$store;
            const { oscillatorIndex, instrumentIndex } = this;

            const commit = () => {
                const oscillator = store.getters.activeSong.instruments[ instrumentIndex ].oscillators[ oscillatorIndex ];
                oscillator.table    = table;
                oscillator.waveform = OscillatorTypes.CUSTOM;
                AudioService.updateOscillator( "waveform", instrumentIndex, oscillatorIndex, oscillator );
            };
            commit();

            // when drawing, force the oscillator type to transition to custom
            // and activate the oscillator (to make changes instantly audible)

            if ( this.oscillator.waveform !== OscillatorTypes.CUSTOM ) {
                this.update( "waveform", OscillatorTypes.CUSTOM );
            } else {
                if ( !this.oscillator.enabled ) {
                    this.update( "enabled", true );
                }
            }
            this.invalidate();
            const component = this;

            enqueueState( `wtable_${instrumentIndex}_${oscillatorIndex}`, {
                undo() {
                    const oscillator = store.getters.activeSong.instruments[ instrumentIndex ].oscillators[ oscillatorIndex ];
                    oscillator.table    = orgTable;
                    oscillator.waveform = orgWaveform;
                    AudioService.updateOscillator( "waveform", instrumentIndex, oscillatorIndex, oscillator );
                    !component._destroyed && component.renderWaveform();
                },
                redo: () => {
                    commit();
                    !component._destroyed && component.renderWaveform();
                }
            }, 5000 ); // longer timeout as a lot of events can fire while drawing the waveform
        },
        // render the current oscillators waveform into the WaveTableDraw renderer
        // (is a zCanvas sprite and not part of the Vue component render cycle)
        renderWaveform() {
            if ( this.oscillator.waveform !== OscillatorTypes.CUSTOM ) {
                this.wtDraw.generateAndSetTable( this.oscillator.waveform );
            } else {
                // note we use a clone as the table references can be updated
                // by stepping through the state history
                this.wtDraw.setTable( clone( InstrumentFactory.getTableForOscillator( this.oscillator )));
            }
        },
        // propagate the changes to the AudioService
        cacheOscillator() {
            AudioService.updateOscillator( "waveform", this.instrumentIndex, this.oscillatorIndex, this.oscillator );
        },
        openSampleEditor() {
            const name = this.oscillator.sample;
            if ( name ) {
                this.setCurrentSample( this.samples.find( sample => sample.name === name ));
            }
            this.openModal( ModalWindows.SAMPLE_EDITOR );
        },
        invalidate() {
            this.$emit( "invalidate" );
        },
    }
};
</script>

<style lang="scss">
@import "@/styles/_variables";
// global because zCanvas injection is outside of component scope
.waveform-canvas {
    border-radius: $spacing-small;
}
</style>

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

.waveform-container {
    position: relative;
    margin: $spacing-xsmall 0 $spacing-medium;

    &__action-button {
        position: absolute;
        right: 0;
        bottom: $spacing-medium;
    }
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
