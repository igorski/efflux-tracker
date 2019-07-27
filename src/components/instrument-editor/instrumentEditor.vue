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
                    @click="openHelp">?</button>
            <button class="close-button"
                    @click="$emit('close')">x</button>

            <!-- selector that switches between available instruments -->
            <select id="instrumentSelect"
                    v-model.number="instrument"
            >
                <option v-for="(instrument, idx) in instrumentAmount"
                        :key="`instrument_${idx}`"
                        :value="idx"
                >Instrument {{ instrument }}</option>
            </select>
        </div>

        <!-- part 1 : oscillator editor -->
        <ul id="oscillatorTabs" class="tab-list">
            <li v-for="(oscillator, idx) in oscillatorAmount"
                :key="`oscillator_${idx}`"
                :class="{ active: activeOscillatorIndex === idx }"
                @click="setActiveOscillatorIndex(idx)"
            >
                Oscillator {{ idx + 1 }}
            </li>
        </ul>
        <div class="horizontalGroup">
            <oscillator-editor
                :instrumentRef="instrumentRef"
                :instrumentId="instrumentId"
                :oscillatorIndex="activeOscillatorIndex"
                @invalidate="invalidatePreset"
            />

            <!-- part 2: modules -->
            <section id="instrumentModulesEditor">
                <div class="module-list">
                    <fieldset class="instrument-parameters">
                        <legend>Mixer</legend>
                        <div class="wrapper input range">
                            <label for="instrumentVolume">Volume</label>
                            <input type="range" id="instrumentVolume" min="0" max="1" step=".01" value="0">
                        </div>
                    </fieldset>

                    <ul id="modulesTabs" class="tab-list">
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
import { mapState, mapMutations } from 'vuex';
import Config from '../../config';
import Manual from '../../definitions/Manual';
import OscillatorEditor from './components/oscillatorEditor';

export default {
    components: {
        OscillatorEditor,
    },
    data: () => ({
        instrumentAmount: Config.INSTRUMENT_AMOUNT,
        oscillatorAmount: Config.OSCILLATOR_AMOUNT,
        canvas: null,
        wtDraw: null,
    }),
    computed: {
        ...mapState({
            activeSong: state => state.song.activeSong,
            activeInstrument: state => state.editor.activeInstrument,
            instrumentId: state => state.instrument.instrumentId,
            activeOscillatorIndex: state => state.instrument.activeOscillatorIndex,
        }),
        instrument: {
            get() {
                return this.instrumentId;
            },
            set(value) {
                this.setInstrumentId(value);
                this.setActiveInstrument(value); // allows live keyboard/MIDI playing to use new instrument
            },
        },
        instrumentRef() {
            return this.activeSong.instruments[this.instrumentId];
        },
    },
    created() {
        this.setInstrumentId(this.activeInstrument);
    },
    methods: {
        ...mapMutations([
            'setActiveInstrument',
            'setActiveOscillatorIndex',
            'setInstrumentId',
            'setPresetName',
        ]),
        openHelp() {
            window.open(Manual.INSTRUMENT_EDITOR_HELP, '_blank');
        },
        invalidatePreset() {
            if (this.instrument.presetName && !this.instrument.presetName.includes('*')) {
                this.setPresetName({ instrument: this.instrument, presetName: `${instrument.presetName}*` });
            }
        },
    }
};
</script>

<style lang="scss" scoped>
    @import '@/styles/_layout.scss';

    #instrumentEditor
    {
      @include EditorComponent();
      @include Overlay();

      height: auto;
    }

    #instrumentSelect {
      position: absolute;
      top: .85em;
      right: 6.5em;
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
      }

      #instrumentModulesEditor {
        width: 100%;
        padding: 0;
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
 