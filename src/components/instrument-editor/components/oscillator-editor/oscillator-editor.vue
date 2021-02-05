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
        <div class="canvas-container" ref="canvasContainer"><!-- x --></div>
        <!-- waveform selection -->
        <div class="oscillator-waveforms">
            <select v-model="oscillatorEnabled"
                    @change="handleOscillatorEnabledChange"
            >
                <option v-t="'enabled'" :value="true"></option>
                <option v-t="'disabled'" :value="false"></option>
            </select>
            <select v-model="oscillatorWaveform"
                    @change="handleOscillatorWaveformChange"
            >
                <option v-t="'sawtooth'" value="SAW"></option>
                <option v-t="'sine'" value="SINE"></option>
                <option v-t="'triangle'" value="TRIANGLE"></option>
                <option v-t="'square'" value="SQUARE"></option>
                <option v-t="'pwm'" value="PWM"></option>
                <option v-t="'noise'" value="NOISE"></option>
                <option v-t="'custom'" value="CUSTOM"></option>
            </select>
        </div>

        <!-- oscillator tuning and volume -->

        <div>
            <div class="oscillator-editor instrument-parameters">
                <h2 v-t="'oscillatorTuning'"></h2>
                <div class="wrapper input range">
                    <label v-t="'detuneLabel'" for="detune"></label>
                    <input v-model.number="oscillatorDetune"
                           type="range" id="detune" min="-50" max="50" step=".1" value="0"
                           @input="handleOscillatorTuningChange('detune')">
                </div>
                <div class="wrapper input range">
                    <label v-t="'octaveShiftLabel'" for="octaveShift"></label>
                    <input v-model.number="oscillatorOctaveShift"
                           type="range" id="octaveShift" min="-2" max="2" step="1" value="0"
                           :disabled="oscillator.waveform === 'NOISE'"
                           @input="handleOscillatorTuningChange('octave')">
                </div>
                <div class="wrapper input range">
                    <label v-t="'fineShiftLabel'" for="fineShift"></label>
                    <input v-model.number="oscillatorFineShift"
                           type="range" id="fineShift" min="-7" max="7" step="1" value="0"
                           :disabled="oscillator.waveform === 'NOISE'"
                           @input="handleOscillatorTuningChange('fine')">
                </div>
                <div class="wrapper input range">
                    <label v-t="'volumeLabel'" for="volume"></label>
                    <input type="range"
                           v-model.number="oscillatorVolume"
                           id="volume" min="0" max="1" step=".01" value="0"
                           @input="handleOscillatorVolumeChange">
                </div>
            </div>

            <!-- envelopes -->

            <div class="envelope-editor instrument-parameters">
                <ul class="tab-list">
                    <li v-t="'amplitude'"
                        :class="{ active: activeEnvelopeTab === 0 }"
                        @click="activeEnvelopeTab = 0">
                    </li>
                    <li v-t="'pitch'"
                        :class="{ active: activeEnvelopeTab === 1 }"
                        @click="activeEnvelopeTab = 1">
                    </li>
                </ul>

                <!-- amplitude envelope -->

                <div id="amplitudeEditor"
                     class="tabbed-content"
                     :class="{ active: activeEnvelopeTab === 0 }"
                >
                    <h2 v-t="'amplitudeEnvelope'"></h2>
                    <div class="wrapper input range">
                        <label v-t="'attack'" for="attack"></label>
                        <input v-model.number="amplitudeAttack"
                               type="range" id="attack" min="0" max="1" step=".01" value="0"
                               @input="invalidate">
                    </div>
                    <div class="wrapper input range">
                        <label v-t="'decay'" for="decay"></label>
                        <input v-model.number="amplitudeDecay"
                               type="range" id="decay" min="0" max="1" step=".01" value="0"
                               @input="invalidate">
                    </div>
                    <div class="wrapper input range">
                        <label v-t="'sustain'" for="sustain"></label>
                        <input v-model.number="amplitudeSustain"
                               type="range" id="sustain" min="0" max="1" step=".01" value=".75"
                               @input="invalidate">
                    </div>
                    <div class="wrapper input range">
                        <label v-t="'release'" for="release"></label>
                        <input v-model.number="amplitudeRelease"
                               type="range" id="release" min="0" max="1" step=".01" value="0"
                               @input="invalidate" />
                    </div>
                </div>

                <!-- pitch envelope -->

                <div id="pitchEditor"
                     class="tabbed-content"
                     :class="{ active: activeEnvelopeTab === 1 }"
                >
                    <h2 v-t="'pitchEnvelope'"></h2>
                    <div class="wrapper input range">
                        <label v-t="'range'" for="pitchRange"></label>
                        <input v-model.number="pitchRange"
                               type="range" id="pitchRange" min="-24" max="24" step="1" value="0"
                               @input="invalidate" />
                    </div>
                    <div class="wrapper input range">
                        <label v-t="'attack'" for="pitchAttack"></label>
                        <input v-model.number="pitchAttack"
                               type="range" id="pitchAttack" min="0" max="1" step=".01" value="0"
                               @input="invalidate" />
                    </div>
                    <div class="wrapper input range">
                        <label v-t="'decay'" for="pitchDecay"></label>
                        <input v-model.number="pitchDecay"
                               type="range" id="pitchDecay" min="0" max="1" step=".01" value="1"
                               @input="invalidate">
                    </div>
                    <div class="wrapper input range">
                        <label v-t="'sustain'" for="pitchSustain"></label>
                        <input v-model.number="pitchSustain"
                               type="range" id="pitchSustain" min="0" max="1" step=".01" value=".75"
                               @input="invalidate">
                    </div>
                    <div class="wrapper input range">
                        <label v-t="'release'" for="pitchRelease"></label>
                        <input v-model.number="pitchRelease"
                               type="range" id="pitchRelease" min="0" max="1" step=".01" value="0"
                               @input="invalidate">
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>
<script>
import { mapState, mapMutations } from 'vuex';
import { canvas } from 'zcanvas';
import Config from '@/config';
import AudioService from '@/services/audio-service';
import InstrumentFactory from '@/model/factory/instrument-factory';
import WaveTableDraw from '../wave-table-draw';
import messages from './messages.json';

export default {
    i18n: { messages },
    props: {
        oscillatorIndex: {
            type: Number,
            required: true,
        },
        instrumentId: {
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
            'windowSize',
        ]),
        oscillator() {
            return this.instrumentRef.oscillators[this.oscillatorIndex];
        },
        // generic oscillator properties
        oscillatorEnabled: {
            get() { return this.oscillator.enabled; },
            set(value) { this.update('enabled', value); }
        },
        oscillatorWaveform: {
            get() { return this.oscillator.waveform; },
            set(value) { this.update('waveform', value); }
        },
        oscillatorVolume: {
            get() { return this.oscillator.volume; },
            set(value) { this.update('volume', value); }
        },
        // oscillator tuning
        oscillatorDetune: {
            get() { return this.oscillator.detune; },
            set(value) { this.update('detune', value); }
        },
        oscillatorOctaveShift: {
            get() { return this.oscillator.octaveShift; },
            set(value) { this.oscillator.octaveShift = value; }
        },
        oscillatorFineShift: {
            get() { return this.oscillator.fineShift; },
            set(value) { this.oscillator.fineShift = value; }
        },
        // oscillator amplitude envelopes
        amplitudeAttack: {
            get() { return this.oscillator.adsr.attack; },
            set(value) { this.update('adsr', { ...this.oscillator.adsr, attack: value }); }
        },
        amplitudeDecay: {
            get() { return this.oscillator.adsr.decay; },
            set(value) { this.update('adsr', { ...this.oscillator.adsr, decay: value }); }
        },
        amplitudeSustain: {
            get() { return this.oscillator.adsr.sustain; },
            set(value) { this.update('adsr', { ...this.oscillator.adsr, sustain: value }); }
        },
        amplitudeRelease: {
            get() { return this.oscillator.adsr.release; },
            set(value) { this.update('adsr', { ...this.oscillator.adsr, release: value }); }
        },
        // oscillator pitch envelopes
        pitchRange: {
            get() { return this.oscillator.pitch.range; },
            set(value) { this.update('pitch', { ...this.oscillator.pitch, range: value }); }
        },
        pitchAttack: {
            get() { return this.oscillator.pitch.attack; },
            set(value) { this.update('pitch', { ...this.oscillator.pitch, attack: value }); }
        },
        pitchDecay: {
            get() { return this.oscillator.pitch.decay; },
            set(value) { this.update('pitch', { ...this.oscillator.pitch, decay: value }); }
        },
        pitchSustain: {
            get() { return this.oscillator.pitch.sustain; },
            set(value) { this.update('pitch', { ...this.oscillator.pitch, sustain: value }); }
        },
        pitchRelease: {
            get() { return this.oscillator.pitch.release; },
            set(value) { this.update('pitch', { ...this.oscillator.pitch, release: value }); }
        },
    },
    watch: {
        windowSize: {
            immediate: true,
            handler({ width, height }) {
                if (this.canvas) {
                    this.resizeWaveTableDraw(width, height);
                }
            },
        },
        oscillatorIndex() { this.renderWaveform(); },
        instrumentRef() { this.renderWaveform(); }
    },
    mounted() {
        this.canvas = new canvas({ width: Config.WAVE_TABLE_SIZE, height: 200 });
        this.canvas.setBackgroundColor('#000000');
        this.canvas.insertInPage(this.$refs.canvasContainer);
        this.wtDraw = new WaveTableDraw(this.canvas.getWidth(), this.canvas.getHeight(), this.handleWaveformUpdate);
        this.canvas.addChild(this.wtDraw);
        this.resizeWaveTableDraw();
        this.renderWaveform();
    },
    beforeDestroy() {
        this.canvas.dispose();
    },
    methods: {
        ...mapMutations([
            'updateOscillator',
        ]),
        update(prop, value) {
            this.updateOscillator({ instrumentIndex: this.instrumentId, oscillatorIndex: this.oscillatorIndex, prop, value });
        },
        handleOscillatorEnabledChange() {
            this.cacheOscillator();
            this.invalidate();
        },
        handleOscillatorWaveformChange() {
            this.renderWaveform(this.oscillator);
            this.cacheOscillator();

            if (!this.oscillator.enabled) {
                this.update('enabled', true);
            }
            this.invalidate();
        },
        handleOscillatorVolumeChange() {
            AudioService.updateOscillator('volume', this.instrumentId, this.oscillatorIndex, this.oscillator);
            this.invalidate();
        },
        handleOscillatorTuningChange() {
            AudioService.updateOscillator('tuning', this.instrumentId, this.oscillatorIndex, this.oscillator);
            this.invalidate();
        },
        resizeWaveTableDraw(width = window.innerWidth) {
            const ideal       = Config.WAVE_TABLE_SIZE; // equal to the length of the wave table
            const targetWidth = ( width < ideal ) ? width *  0.9: ideal;

            if (this.canvas.getWidth() !== targetWidth ) {
                this.canvas.setDimensions(targetWidth, 200);
                this.wtDraw._bounds.width = targetWidth;
            }
        },
        handleWaveformUpdate(table) {
            this.oscillator.table = table;

            // when drawing, force the oscillator type to transition to custom
            // and activate the oscillator (to make changes instantly audible)
            if (this.oscillator.waveform !== 'CUSTOM' ) {
                this.update('waveform', 'CUSTOM');
            } else {
                if (!this.oscillator.enabled) {
                    this.update('enabled', true);
                }
                this.cacheOscillator();
            }
            this.invalidate();
        },
        // render the current oscillators waveform into the WaveTableDraw renderer
        // (is a zCanvas sprite and not part of the Vue component render cycle)
        renderWaveform() {
            if (this.oscillator.waveform !== 'CUSTOM')
                this.wtDraw.generateAndSetTable(this.oscillator.waveform);
            else
                this.wtDraw.setTable(InstrumentFactory.getTableForOscillator(this.oscillator));
        },
        // propagate the changes to the AudioService
        cacheOscillator() {
            AudioService.updateOscillator('waveform', this.instrumentId, this.oscillatorIndex, this.oscillator);
        },
        invalidate() {
            this.$emit('invalidate');
        },
    }
};
</script>

<style lang="scss">
    @import '@/styles/_layout.scss';

    .instrument-oscillator-editor {
      @include boxSize();
      .oscillator-waveforms {

      }
    }

    .canvas-container {
      margin: $spacing-xsmall 0 0;

      canvas {
        border-radius: $spacing-small;
        border: 4px solid #666;
      }
    }

    .oscillator-waveforms {
      padding: $spacing-medium 0;
    }

    .oscillator-editor {
      display: inline-block;
      padding: $spacing-medium $spacing-medium;
      @include boxSize();
      border: 1px solid #666;
      min-height: 174px;
    }

    .envelope-editor {
      margin-top: (-$spacing-xlarge + $spacing-medium);

      .tabbed-content {
        padding: $spacing-medium $spacing-medium;
        border: 1px solid #666;
        min-height: 165px;
      }
    }

    @media screen and ( min-width: $ideal-instrument-editor-width ) {
      .instrument-oscillator-editor {
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
</style>
