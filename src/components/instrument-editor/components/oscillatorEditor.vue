/**
* The MIT License (MIT)
*
* Igor Zinken 2016-2019 - https://www.igorski.nl
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
    <section id="instrumentOscillatorEditor">
        <div id="canvasContainer" ref="canvasContainer"><!-- x --></div>
        <!-- waveform selection -->
        <div class="oscillatorWaveforms">
            <select v-model="oscillatorEnabled"
                    @change="handleOscillatorEnabledChange"
            >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
            </select>
            <select v-model="oscillatorWaveform"
                    @change="handleOscillatorWaveformChange"
            >
                <option value="SAW">Sawtooth</option>
                <option value="SINE">Sine</option>
                <option value="TRIANGLE">Triangle</option>
                <option value="SQUARE">Square</option>
                <option value="PWM">PWM</option>
                <option value="NOISE">Noise</option>
                <option value="CUSTOM">Custom</option>
            </select>
        </div>

        <!-- oscillator tuning and volume -->

        <div class="horizontalGroup">
            <div id="oscillatorEditor" class="instrument-parameters">
                <h2>Oscillator tuning</h2>
                <div class="wrapper input range">
                    <label for="detune">Detune</label>
                    <input type="range" id="detune" min="-50" max="50" step=".1" value="0">
                </div>
                <div class="wrapper input range">
                    <label for="octaveShift">Octave shift</label>
                    <input type="range" id="octaveShift" min="-2" max="2" step="1" value="0"
                    :disabled="{ disabled: oscillator.waveform === 'NOISE' }">
                </div>
                <div class="wrapper input range">
                    <label for="fineShift">Fine shift</label>
                    <input type="range" id="fineShift" min="-7" max="7" step="1" value="0"
                           :disabled="{ disabled: oscillator.waveform === 'NOISE' }">
                </div>
                <div class="wrapper input range">
                    <label for="volume">Volume</label>
                    <input type="range"
                           v-model.number="oscillatorVolume"
                           id="volume" min="0" max="1" step=".01" value="0"
                           @input="handleOscillatorVolumeChange">
                </div>
            </div>

            <!-- envelopes -->

            <div id="envelopeEditor" class="instrument-parameters">
                <ul id="envelopeTabs" class="tabList">
                    <li data-type="amplitude" class="active">
                        Amplitude
                    </li>
                    <li data-type="pitch">
                        Pitch
                    </li>
                </ul>

                <!-- amplitude envelope -->

                <div id="amplitudeEditor" class="tabbed-content active">
                    <h2>Amplitude envelope</h2>
                    <div class="wrapper input range">
                        <label for="attack">Attack</label>
                        <input type="range" id="attack" min="0" max="1" step=".01" value="0">
                    </div>
                    <div class="wrapper input range">
                        <label for="decay">Decay</label>
                        <input type="range" id="decay" min="0" max="1" step=".01" value="0">
                    </div>
                    <div class="wrapper input range">
                        <label for="sustain">Sustain</label>
                        <input type="range" id="sustain" min="0" max="1" step=".01" value=".75">
                    </div>
                    <div class="wrapper input range">
                        <label for="release">Release</label>
                        <input type="range" id="release" min="0" max="1" step=".01" value="0">
                    </div>
                </div>

                <!-- pitch envelope -->

                <div id="pitchEditor" class="tabbed-content">
                    <h2>Pitch envelope</h2>
                    <div class="wrapper input range">
                        <label for="pitchRange">Range</label>
                        <input type="range" id="pitchRange" min="-24" max="24" step="1" value="0" />
                    </div>
                    <div class="wrapper input range">
                        <label for="pitchAttack">Attack</label>
                        <input type="range" id="pitchAttack" min="0" max="1" step=".01" value="0">
                    </div>
                    <div class="wrapper input range">
                        <label for="pitchDecay">Decay</label>
                        <input type="range" id="pitchDecay" min="0" max="1" step=".01" value="1">
                    </div>
                    <div class="wrapper input range">
                        <label for="pitchSustain">Sustain</label>
                        <input type="range" id="pitchSustain" min="0" max="1" step=".01" value=".75">
                    </div>
                    <div class="wrapper input range">
                        <label for="pitchRelease">Release</label>
                        <input type="range" id="pitchRelease" min="0" max="1" step=".01" value="0">
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>
<script>
import { mapState, mapGetters, mapMutations } from 'vuex';
import zCanvas from 'zcanvas';
import Config from '../../../config';
import AudioService from '../../../services/AudioService';
import InstrumentFactory from '../../../model/factory/InstrumentFactory';
import WaveTableDraw from './WaveTableDraw';

export default {
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
    computed: {
        ...mapState([
            'windowSize',
        ]),
        oscillator() {
            return this.instrumentRef.oscillators[this.oscillatorIndex];
        },
        oscillatorEnabled: {
            get() {
                return this.oscillator.enabled;
            },
            set(value) {
                this.update('enabled', value);
            }
        },
        oscillatorWaveform: {
            get() {
                return this.oscillator.waveform;
            },
            set(value) {
                this.update('waveform', value);
            }
        },
        oscillatorVolume: {
            get() {
                return this.oscillator.volume;
            },
            set(value) {
                this.update('volume', value);
            }
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
        oscillatorIndex: renderWaveform,
        instrumentRef: renderWaveform,
    },
    mounted() {
        this.canvas = new zCanvas.canvas(512, 200); // 512 equals the size of the wave table (see InstrumentFactory)
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
            'invalidatePresetName',
        ]),
        update(prop, value) {
            this.updateOscillator({ instrumentIndex: this.instrumentId, oscillatorIndex: this.oscillatorIndex, prop, value });
        },
        handleOscillatorEnabledChange() {
            this.cacheOscillator();
            this.invalidatePresetName(this.instrumentRef);
        },
        handleOscillatorWaveformChange() {
            this.renderWaveform(this.oscillator);
            this.cacheOscillator();

            if (!this.oscillator.enabled) {
                this.update('enabled', true);
            }
            this.invalidatePresetName(this.instrumentRef);
        },
        handleOscillatorVolumeChange() {
            AudioService.updateOscillator('volume', this.instrumentId, this.oscillatorIndex, this.oscillator);
            this.invalidatePresetName(this.instrumentRef);
        },
        resizeWaveTableDraw(width = window.innerWidth, height = window.innerHeight) {
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
            this.invalidatePresetName(this.instrumentRef);
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
    }
};
</script>

<style lang="scss">
    @import '@/styles/_layout.scss';

    #instrumentOscillatorEditor {
      @include boxSize();
      .oscillatorWaveforms {

      }
    }

    #oscillatorEditor {
      display: inline-block;
      padding: .5em .75em;
      @include boxSize();
      border: 1px solid #666;
      min-height: 174px;
    }

    #envelopeEditor {
      margin-top: -3em;

      .tabbed-content {
        padding: .5em .75em;
        border: 1px solid #666;
        min-height: 165px;
      }
    }
</style>
 