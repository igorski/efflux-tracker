/**
* The MIT License (MIT)
*
* Igor Zinken 2019 - https://www.igorski.nl
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
    <div id="instrumentEditor">
        <div class="header">
            <h2>Instrument editor</h2>
            <button class="help-button"
                    @click="">?</button>
            <button class="close-button"
                    @click="$emit('close')">x</button>
            <select id="instrumentSelect"
                    v-model.number="instrument"
            >
                <option v-for="(instrument, idx) in instrumentAmount"
                        :value="idx"
                >Instrument {{ instrument }}</option>
            </select>
        </div>
        <ul id="oscillatorTabs" class="tabList">
            <li :class="{ active: activeOscillatorIndex === 0 }"
                @click="setActiveOscillatorIndex(0)"
            >
                Oscillator 1
            </li>
            <li :class="{ active: activeOscillatorIndex === 1 }"
                @click="setActiveOscillatorIndex(1)"
            >
                Oscillator 2
            </li>
            <li :class="{ active: activeOscillatorIndex === 2 }"
                @click="setActiveOscillatorIndex(2)"
            >
                Oscillator 3
            </li>
        </ul>
        <div class="horizontalGroup">
            <section id="instrumentOscillatorEditor">
                <div id="canvasContainer" ref="canvasContainer"><!-- x --></div>
                <div class="oscillatorWaveforms">
                    <select id="oscillatorEnabled">
                        <option value="true">Enabled</option>
                        <option value="false">Disabled</option>
                    </select>
                    <select id="oscillatorWaveformSelect">
                        <option value="SAW">Sawtooth</option>
                        <option value="SINE">Sine</option>
                        <option value="TRIANGLE">Triangle</option>
                        <option value="SQUARE">Square</option>
                        <option value="PWM">PWM</option>
                        <option value="NOISE">Noise</option>
                        <option value="CUSTOM">Custom</option>
                    </select>
                </div>
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
                            :disabled="{ disabled: activeOscillator.waveform === 'NOISE' }">
                        </div>
                        <div class="wrapper input range">
                            <label for="fineShift">Fine shift</label>
                            <input type="range" id="fineShift" min="-7" max="7" step="1" value="0"
                                   :disabled="{ disabled: activeOscillator.waveform === 'NOISE' }">
                        </div>
                        <div class="wrapper input range">
                            <label for="volume">Volume</label>
                            <input type="range" id="volume" min="0" max="1" step=".01" value="0">
                        </div>
                    </div>

                    <div id="envelopeEditor" class="instrument-parameters">
                        <ul id="envelopeTabs" class="tabList">
                            <li data-type="amplitude" class="active">
                                Amplitude
                            </li>
                            <li data-type="pitch">
                                Pitch
                            </li>
                        </ul>

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

            <section id="instrumentModulesEditor">

                <div class="module-list">
                    <fieldset class="instrument-parameters">
                        <legend>Mixer</legend>
                        <div class="wrapper input range">
                            <label for="instrumentVolume">Volume</label>
                            <input type="range" id="instrumentVolume" min="0" max="1" step=".01" value="0">
                        </div>
                    </fieldset>

                    <ul id="modulesTabs" class="tabList">
                        <li data-type="page1" class="active">
                            EQ / Filter
                        </li>
                        <li data-type="page2">
                            Overdrive / Delay
                        </li>
                    </ul>

                    <div id="modulesPage1" class="tabbed-content active">
                        <fieldset id="eqEditor" class="instrument-parameters">
                            <legend>Equalizer</legend>
                            <select id="eqEnabled">
                                <option value="true">Enabled</option>
                                <option value="false">Disabled</option>
                            </select>
                            <div class="wrapper input range">
                                <label for="eqLow">Low</label>
                                <input type="range" id="eqLow" min="0" max="1" step=".01" value="1">
                            </div>
                            <div class="wrapper input range">
                                <label for="eqMid">Mid</label>
                                <input type="range" id="eqMid" min="0" max="1" step=".01" value="1">
                            </div>
                            <div class="wrapper input range">
                                <label for="eqHigh">High</label>
                                <input type="range" id="eqHigh" min="0" max="1" step=".01" value="1">
                            </div>
                        </fieldset>

                        <fieldset id="filterEditor" class="instrument-parameters">
                            <legend>Filter</legend>
                            <select id="filterEnabled">
                                <option value="true">Enabled</option>
                                <option value="false">Disabled</option>
                            </select>
                            <div class="wrapper input range">
                                <label for="filterFrequency">Frequency</label>
                                <input type="range" id="filterFrequency" min="40" max="24000" step=".01" value="880">
                            </div>
                            <div class="wrapper input range">
                                <label for="filterQ">Q</label>
                                <input type="range" id="filterQ" min="0" max="40" step="1" value="5">
                            </div>
                            <select id="filterLFO">
                                <option value="off">LFO off</option>
                                <option value="sine">Sine</option>
                                <option value="square">Square</option>
                                <option value="sawtooth">Sawtooth</option>
                                <option value="triangle">Triangle</option>
                            </select>
                            <select id="filterType">
                                <option value="lowpass">Lowpass</option>
                                <option value="highpass">Highpass</option>
                                <option value="bandpass">Bandpass</option>
                                <option value="lowshelf">Lowshelf</option>
                                <option value="highshelf">Highshelf</option>
                                <option value="peaking">Peaking</option>
                                <option value="notch">Notch</option>
                                <option value="allpass">Allpass</option>
                            </select>
                            <div class="wrapper input range">
                                <label for="filterSpeed">LFO Speed</label>
                                <input type="range" id="filterSpeed" min="0.1" max="25" step=".01" value="0.5">
                            </div>
                            <div class="wrapper input range">
                                <label for="filterDepth">LFO Depth</label>
                                <input type="range" id="filterDepth" min="0" max="100" step=".01" value="50">
                            </div>
                        </fieldset>
                    </div>
                    <div id="modulesPage2" class="tabbed-content">
                        <fieldset id="odEditor" class="instrument-parameters">
                            <legend>Overdrive</legend>
                            <select id="odEnabled">
                                <option value="true">Enabled</option>
                                <option value="false">Disabled</option>
                            </select>
                            <div class="wrapper input range">
                                <label for="odDrive">Drive</label>
                                <input type="range" id="odDrive" min="0" max="1" step=".01" value="0.5">
                            </div>
                            <div class="wrapper input range">
                                <label for="odPreBand">BP (pre)</label>
                                <input type="range" id="odPreBand" min="0" max="1" step=".01" value="0.5">
                            </div>
                            <div class="wrapper input range">
                                <label for="odColor">BP (post)</label>
                                <input type="range" id="odColor" min="0" max="22050" step="1" value="800">
                            </div>
                            <div class="wrapper input range">
                                <label for="odPostCut">LP (post)</label>
                                <input type="range" id="odPostCut" min="0" max="22050" step=".01" value="3000">
                            </div>
                        </fieldset>

                        <fieldset id="delayEditor" class="instrument-parameters">
                            <legend>Delay</legend>
                            <select id="delayEnabled">
                                <option value="true">Enabled</option>
                                <option value="false">Disabled</option>
                            </select>
                            <select id="delayType">
                                <option value="0">Delay 0</option>
                                <option value="1">Delay 1</option>
                                <option value="2">Delay 2</option>
                            </select>
                            <div class="wrapper input range">
                                <label for="delayTime">Delay time</label>
                                <input type="range" id="delayTime" min="0" max="2" step=".001" value=".5">
                            </div>
                            <div class="wrapper input range">
                                <label for="delayFeedback">Feedback</label>
                                <input type="range" id="delayFeedback" min="0" max="1" step=".01" value="0.5">
                            </div>
                            <div class="wrapper input range">
                                <label for="delayCutoff">Cutoff</label>
                                <input type="range" id="delayCutoff" min="0" max="22050" step="1" value="880">
                            </div>
                            <div class="wrapper input range">
                                <label for="delayOffset">Offset</label>
                                <input type="range" id="delayOffset" min="0" max="1" step=".01" value="0">
                            </div>
                        </fieldset>
                    </div>
                </div>

            </section>
        </div>

        <section id="instrumentPresets">
            <h2>Presets</h2>
            <select id="presetSelect"></select>
            <div class="save">
                <input type="text" id="presetName" placeholder="preset name" />
                <button id="presetSave">Save preset</button>
            </div>
        </section>
    </div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex';
import zCanvas from 'zcanvas';
import Config from '../../config';
import Manual from '../../definitions/Manual';
import WaveTableDraw from './components/WaveTableDraw';
import InstrumentFactory from '../../model/factory/InstrumentFactory';

export default {
    data: () => ({
        instrumentAmount: Config.INSTRUMENT_AMOUNT,
        instrument: 0,
        canvas: null,
        wtDraw: null,
    }),
    computed: {
        ...mapState([
            'windowSize',
        ]),
        ...mapState({
            activeSong: state => state.song.activeSong,
            instrumentId: state => state.instrument.instrumentId,
            activeOscillatorIndex: state => state.instrument.activeOscillatorIndex,
        }),
        instrumentRef() {
            return this.activeSong.instruments[this.instrumentId];
        },
        activeOscillator() {
            return this.instrumentRef.oscillators[this.activeOscillatorIndex];
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
        activeOscillator(oscillator) {
            if ( oscillator.waveform !== 'CUSTOM' )
                this.wtDraw.generateAndSetTable(oscillator.waveform);
            else
                this.wtDraw.setTable(InstrumentFactory.getTableForOscillator(oscillator));

          //  togglePitchSliders( oscillator.waveform !== "NOISE" ); // no pitch shifting for noise buffer
        },
    },
    mounted() {
        this.canvas = new zCanvas.canvas(512, 200); // 512 equals the size of the wave table (see InstrumentFactory)
        this.canvas.setBackgroundColor('#000000');
        this.canvas.insertInPage(this.$refs.canvasContainer);
        this.wtDraw = new WaveTableDraw(this.canvas.getWidth(), this.canvas.getHeight(), this.handleWaveformUpdate);
        this.resizeWaveTableDraw();
    },
    beforeDestroy() {
        this.canvas.dispose();    
    },
    methods: {
        ...mapMutations([
            'setActiveOscillatorIndex',
        ]),
        resizeWaveTableDraw(width = window.innerWidth, height = window.innerHeight) {
            const ideal       = Config.WAVE_TABLE_SIZE; // equal to the length of the wave table
            const targetWidth = ( width < ideal ) ? width *  0.9: ideal;

            if (this.canvas.getWidth() !== targetWidth ) {
                this.canvas.setDimensions(targetWidth, 200);
                wtDraw._bounds.width = targetWidth;
            }
        },
        handleWaveformUpdate(table) {
            console.warn('update');
            let oscillator;
            if (this.instrumentRef) {
                this.activeOscillator.table = table;

                // when drawing, force the oscillator type to transition to custom
                // and activate the oscillator (to make changes instantly audible)
                if (this.activeOscillator.waveform !== "CUSTOM" ) {
                    Form.setSelectedOption( oscWaveformSelect, "CUSTOM" );
                    if ( !oscillator.enabled ) {
                        oscillator.enabled = true;
                        Form.setSelectedOption( oscEnabledSelect, true );
                    }
                    handleOscillatorWaveformChange( null );
                }
                else
                    listener( self.EVENTS.CACHE_OSC );

                invalidatePresetName();
            }
        },
        handleHelp( aEvent ) {
            window.open(Manual.INSTRUMENT_EDITOR_HELP, '_blank');
        },
    }
};
</script>

<style lang="scss" scoped>
    @import '@/styles/_layout.scss';

    $idealInstrumentEditorWidth: 855px;
    $idealInstrumentEditorHeight: 580px;

    #instrumentEditor
    {
      @include EditorComponent();
      @include Overlay();

      height: auto;

      canvas {
        border-radius: 7px;
        border: 4px solid #666;
      }

      .instrument-parameters {

        display: inline-block;
        vertical-align: top;
        width: 45%;
        margin-right: 1em;

        h2 {
          clear: both;
          padding: .5em 0;
        }

        .wrapper.range {

          width: 100%;
          clear: both;

          label {
            width: 33%;
            vertical-align: middle;
            display: inline-block;
            font-style: italic;
          }

          input {
            width: 50%;
            vertical-align: middle;
            display: inline-block;
          }
        }
      }

      .tabbed-content {
        display: none;
        border-top: 1px solid #666;

        &.active {
          display: block;
        }
      }
    }

    .tabList {

      display: inline-block;
      margin: .5em 0 0;

      li {
        display: inline-block;
        border: 1px solid #666;
        border-bottom: 1px solid #393b40;
        margin-bottom: -1px; /* makes it essentially appear "bottom-less" due to border-bottom colour over background */
        padding: .25em 1em;
        cursor: pointer;
        background-color: #666;
        font-size: 90%;
        font-weight: bold;

        &.active {
          background-color: transparent;
          color: #FFF;
          position: relative;
        }
      }
    }

    #instrumentSelect {
      position: absolute;
      top: .85em;
      right: 6.5em;
    }

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

    #instrumentModulesEditor {

      vertical-align: top;
      padding: 0 1em;
      margin-top: -10px;
      @include boxSize();

      .instrument-parameters {
        width: 100%;
        border-bottom-right-radius: 14px;
        padding-top: 0;
        margin-bottom: .5em;
        @include boxSize();
      }

      .tabbed-content {
        border: 1px solid grey;
        padding: 1em;
        @include boxSize();
      }

      .module-list {
        display: inline-block;
        vertical-align: top;
        width: 100%;
      }
    }

    #modulesTabs {

    }

    #filterEditor {
      margin-bottom: .7em;
    }

    #eqEnabled,
    #odEnabled,
    #filterEnabled,
    #delayEnabled {
      float: right;
      margin-top: -25px;
      margin-right: 10px;
    }

    #canvasContainer {
      margin: 1em 0 0;
    }

    .oscillatorWaveforms {
      padding: .5em 0;
    }

    #instrumentPresets {
      display: inline-block;
      width: 100%;

      .save {
        float: right;
      }
    }

    /* ideal size and above (tablet/desktop) */

    @media screen and ( min-width: $idealInstrumentEditorWidth )
    {
      #instrumentEditor {
        top: 50%;
        left: 50%;
        width: $idealInstrumentEditorWidth;
        margin-left: -$idealInstrumentEditorWidth / 2;
        margin-top: -$idealInstrumentEditorHeight / 2;
      }

      #instrumentOscillatorEditor {
        display: inline-block;
        width: 550px;
        padding: 1em;
        border: 1px solid #666;
        border-top: 1px solid #666;
        border-bottom-left-radius: 7px;
        border-bottom-right-radius: 7px;
      }

      #instrumentModulesEditor {
        display: inline-block;

        .module-list {
          max-width: 260px;
        }
      }
    }

    /* mobile */

    @media screen and ( max-width: $idealInstrumentEditorWidth )
    {
      #instrumentEditor {
        position: absolute;

        .instrument-parameters {
          @include boxSize();
          padding: 1em;
          width: 100%;
          display: block;
          border-radius: 7px;
          border: 1px solid #666;
          margin-bottom: .5em;
        }
      }

      #instrumentModulesEditor {
        width: 100%;
        padding: 0;
      }

      #envelopeEditor {
        margin-top: auto;
      }

      #instrumentSelect {
        top: .25em;
      }

      #instrumentPresets {
        @include boxSize();
        padding: 0 1em;

        h2 {
          width: 100%;
        }
        select {
          display: block;
          width: 100%;
          margin: 0 auto;
        }
        .save {
          float: none;
          margin-top: .5em;
          input {
            width: auto;
          }
          button {
            float: right;
          }
        }
      }
    }
</style>
 