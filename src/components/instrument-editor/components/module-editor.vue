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
    <section class="module-editor">
        <div class="module-list">
            <fieldset class="instrument-parameters">
                <legend>Mixer</legend>
                <div class="wrapper input range">
                    <label for="instrumentVolume">Volume</label>
                    <input v-model="volume"
                           type="range"
                           id="instrumentVolume"
                           min="0" max="1" step=".01" value="0" />
                </div>
            </fieldset>

            <ul class="modules-tabs tab-list">
                <li :class="{ active: activeModuleTab === 0 }"
                    @click="activeModuleTab = 0">
                    EQ / Filter
                </li>
                <li :class="{ active: activeModuleTab === 1 }"
                    @click="activeModuleTab = 1">
                    Overdrive / Delay
                </li>
            </ul>

            <div class="tabbed-content"
                 :class="{ active: activeModuleTab === 0 }"
             >
                <fieldset id="eqEditor" class="instrument-parameters">
                    <legend>Equalizer</legend>
                    <select v-model="eqEnabled" class="enable-selector">
                        <option :value="true">Enabled</option>
                        <option :value="false">Disabled</option>
                    </select>
                    <div class="wrapper input range">
                        <label for="eqLow">Low</label>
                        <input type="range" id="eqLow" v-model.number="eqLow" min="0" max="1" step=".01" value="1">
                    </div>
                    <div class="wrapper input range">
                        <label for="eqMid">Mid</label>
                        <input type="range" id="eqMid" v-model.number="eqMid" min="0" max="1" step=".01" value="1">
                    </div>
                    <div class="wrapper input range">
                        <label for="eqHigh">High</label>
                        <input type="range" id="eqHigh" v-model.number="eqHigh" min="0" max="1" step=".01" value="1">
                    </div>
                </fieldset>

                <fieldset id="filterEditor" class="instrument-parameters">
                    <legend>Filter</legend>
                    <select v-model="filterEnabled" class="enable-selector">
                        <option :value="true">Enabled</option>
                        <option :value="false">Disabled</option>
                    </select>
                    <div class="wrapper input range">
                        <label for="filterFrequency">Frequency</label>
                        <input type="range" id="filterFrequency" v-model.number="filterFrequency" min="40" max="24000" step=".01" value="880">
                    </div>
                    <div class="wrapper input range">
                        <label for="filterQ">Q</label>
                        <input type="range" id="filterQ" v-model.number="filterQ" min="0" max="40" step="1" value="5">
                    </div>
                    <select v-model="filterLFO">
                        <option value="off">LFO off</option>
                        <option value="sine">Sine</option>
                        <option value="square">Square</option>
                        <option value="sawtooth">Sawtooth</option>
                        <option value="triangle">Triangle</option>
                    </select>
                    <select v-model="filterType">
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
                        <input type="range" id="filterSpeed" v-model.number="filterSpeed" min="0.1" max="25" step=".01" value="0.5">
                    </div>
                    <div class="wrapper input range">
                        <label for="filterDepth">LFO Depth</label>
                        <input type="range" id="filterDepth" v-model.number="filterDepth" min="0" max="100" step=".01" value="50">
                    </div>
                </fieldset>
            </div>
            <div class="tabbed-content"
                 :class="{ active: activeModuleTab === 1 }"
            >
                <fieldset id="odEditor" class="instrument-parameters">
                    <legend>Overdrive</legend>
                    <select v-model="odEnabled" class="enable-selector">
                        <option :value="true">Enabled</option>
                        <option :value="false">Disabled</option>
                    </select>
                    <div class="wrapper input range">
                        <label for="odDrive">Drive</label>
                        <input type="range" id="odDrive" v-model.number="odDrive" min="0" max="1" step=".01" value="0.5">
                    </div>
                    <div class="wrapper input range">
                        <label for="odPreBand">BP (pre)</label>
                        <input type="range" id="odPreBand" v-model.number="odPreBand" min="0" max="1" step=".01" value="0.5">
                    </div>
                    <div class="wrapper input range">
                        <label for="odColor">BP (post)</label>
                        <input type="range" id="odColor" v-model.number="odColor" min="0" max="22050" step="1" value="800">
                    </div>
                    <div class="wrapper input range">
                        <label for="odPostCut">LP (post)</label>
                        <input type="range" id="odPostCut" v-model.number="odPostCut" min="0" max="22050" step=".01" value="3000">
                    </div>
                </fieldset>

                <fieldset id="delayEditor" class="instrument-parameters">
                    <legend>Delay</legend>
                    <select v-model="delayEnabled" class="enable-selector">
                        <option :value="true">Enabled</option>
                        <option :value="false">Disabled</option>
                    </select>
                    <!-- not sure if this offers any flexibility -->
                    <select v-if="false" v-model.number="delayType">
                        <option value="0">Delay 0</option>
                        <option value="1">Delay 1</option>
                        <option value="2">Delay 2</option>
                    </select>
                    <div class="wrapper input range">
                        <label for="delayTime">Delay time</label>
                        <input type="range" id="delayTime" v-model.number="delayTime" min="0" max="2" step=".001" value=".5">
                    </div>
                    <div class="wrapper input range">
                        <label for="delayFeedback">Feedback</label>
                        <input type="range" id="delayFeedback" v-model.number="delayFeedback" min="0" max="1" step=".01" value="0.5">
                    </div>
                    <div class="wrapper input range">
                        <label for="delayCutoff">Cutoff</label>
                        <input type="range" id="delayCutoff" v-model.number="delayCutoff" min="0" max="22050" step="1" value="880">
                    </div>
                    <div class="wrapper input range">
                        <label for="delayOffset">Offset</label>
                        <input type="range" id="delayOffset" v-model.number="delayOffset" min="0" max="1" step=".01" value="0">
                    </div>
                </fieldset>
            </div>
        </div>
    </section>
</template>

<script>
import { mapMutations } from 'vuex';
import AudioService from '../../../services/audio-service';

export default {
    props: {
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
        activeModuleTab: 0,
    }),
    computed: {
        volume: {
            get() {
                return this.instrumentRef.volume;
            },
            set(value) {
                this.updateInstrument({ instrumentIndex: this.instrumentId, prop: 'volume', value });
                AudioService.adjustInstrumentVolume(this.instrumentId, value);
                this.invalidate();
            }
        },
        /* EQ */
        eqEnabled: {
            get() { return this.instrumentRef.eq.enabled },
            set(value) { this.update('eq', { ...this.instrumentRef.eq, enabled: value }); }
        },
        eqLow: {
            get() { return this.instrumentRef.eq.lowGain },
            set(value) { this.update('eq', { ...this.instrumentRef.eq, lowGain: value }); }
        },
        eqMid: {
            get() { return this.instrumentRef.eq.midGain },
            set(value) { this.update('eq', { ...this.instrumentRef.eq, midGain: value }); }
        },
        eqHigh: {
            get() { return this.instrumentRef.eq.highGain },
            set(value) { this.update('eq', { ...this.instrumentRef.eq, highGain: value }); }
        },
        /* Filter */
        filterEnabled: {
            get() { return this.instrumentRef.filter.enabled },
            set(value) { this.update('filter', { ...this.instrumentRef.filter, enabled: value }); }
        },
        filterFrequency: {
            get() { return this.instrumentRef.filter.frequency },
            set(value) { this.update('filter', { ...this.instrumentRef.filter, frequency: value }); }
        },
        filterQ: {
            get() { return this.instrumentRef.filter.q },
            set(value) { this.update('filter', { ...this.instrumentRef.filter, q: value }); }
        },
        filterType: {
            get() { return this.instrumentRef.filter.type },
            set(value) { this.update('filter', { ...this.instrumentRef.filter, type: value }); }
        },
        filterLFO: {
            get() { return this.instrumentRef.filter.lfoType },
            set(value) { this.update('filter', { ...this.instrumentRef.filter, lfoType: value }); }
        },
        filterSpeed: {
            get() { return this.instrumentRef.filter.speed },
            set(value) { this.update('filter', { ...this.instrumentRef.filter, speed: value }); }
        },
        filterDepth: {
            get() { return this.instrumentRef.filter.depth },
            set(value) { this.update('filter', { ...this.instrumentRef.filter, depth: value }); }
        },
        /* Overdrive */
        odEnabled: {
            get() { return this.instrumentRef.overdrive.enabled },
            set(value) { this.update('overdrive', { ...this.instrumentRef.overdrive, enabled: value }); }
        },
        odDrive: {
            get() { return this.instrumentRef.overdrive.drive },
            set(value) { this.update('overdrive', { ...this.instrumentRef.overdrive, drive: value }); }
        },
        odPreBand: {
            get() { return this.instrumentRef.overdrive.preBand },
            set(value) { this.update('overdrive', { ...this.instrumentRef.overdrive, preBand: value }); }
        },
        odColor: {
            get() { return this.instrumentRef.overdrive.color },
            set(value) { this.update('overdrive', { ...this.instrumentRef.overdrive, color: value }); }
        },
        odPostCut: {
            get() { return this.instrumentRef.overdrive.postCut },
            set(value) { this.update('overdrive', { ...this.instrumentRef.overdrive, postCut: value }); }
        },
        /* Delay */
        delayEnabled: {
            get() { return this.instrumentRef.delay.enabled },
            set(value) { this.update('delay', { ...this.instrumentRef.delay, enabled: value }); }
        },
        delayType: {
            get() { return this.instrumentRef.delay.type },
            set(value) { this.update('delay', { ...this.instrumentRef.delay, type: value }); }
        },
        delayTime: {
            get() { return this.instrumentRef.delay.time },
            set(value) { this.update('delay', { ...this.instrumentRef.delay, time: value }); }
        },
        delayFeedback: {
            get() { return this.instrumentRef.delay.feedback },
            set(value) { this.update('delay', { ...this.instrumentRef.delay, feedback: value }); }
        },
        delayCutoff: {
            get() { return this.instrumentRef.delay.cutoff },
            set(value) { this.update('delay', { ...this.instrumentRef.delay, cutoff: value }); }
        },
        delayOffset: {
            get() { return this.instrumentRef.delay.offset },
            set(value) { this.update('delay', { ...this.instrumentRef.delay, offset: value }); }
        },
    },
    methods: {
        ...mapMutations([
            'updateInstrument',
        ]),
        update(prop, value) {
            this.updateInstrument({ instrumentIndex: this.instrumentId, prop, value }); // update Vuex model
            AudioService.applyModule(prop, this.instrumentId, value); // update AudioService
            this.invalidate();  // invalidate current preset (marks it as changed)
        },
        invalidate() {
            this.$emit('invalidate');
        },
    }
};
</script>

<style lang="scss" scoped>
    @import '@/styles/_layout.scss';

    .module-editor {
      vertical-align: top;
      padding: 0 $spacing-large;
      margin-top: -$spacing-medium;
      @include boxSize();

      .modules-tabs {
        margin: 0;
      }

      .instrument-parameters {
        @include boxSize();
        width: 100%;
        border-bottom-right-radius: $spacing-medium;
        padding: $spacing-small 0 $spacing-small $spacing-medium;
        margin-bottom: $spacing-medium;
      }

      .enable-selector {
        margin-top: -($spacing-large + $spacing-xsmall);
        margin-left: 95px;
      }

      .tabbed-content {
        border: 1px solid grey;
        padding: $spacing-medium;
        @include boxSize();
      }

      .module-list {
        display: inline-block;
        vertical-align: top;
        width: 100%;
        margin-top: -$spacing-large;
      }
    }

    #filterEditor {
      margin-bottom: $spacing-medium;
    }

    /* ideal size and above (tablet/desktop) */

    @media screen and ( min-width: $ideal-instrument-editor-width ) {
      .module-editor {
        display: inline-block;

        .module-list {
          max-width: 260px;
        }
      }
    }

    /* mobile */

    @media screen and ( max-width: $ideal-instrument-editor-width ) {
      .module-editor {
        width: 100%;
        padding: 0;
      }
    }

</style>
 