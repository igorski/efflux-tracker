/**
* The MIT License (MIT)
*
* Igor Zinken 2019-2021 - https://www.igorski.nl
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
            <ul class="modules-tabs tab-list">
                <li v-t="'filterTitle'"
                    :class="{ active: activeModuleTab === 0 }"
                    @click="activeModuleTab = 0">
                </li>
                <li v-t="'odDelayTitle'"
                    :class="{ active: activeModuleTab === 1 }"
                    @click="activeModuleTab = 1">
                </li>
            </ul>

            <div class="tabbed-content"
                 :class="{ active: activeModuleTab === 0 }"
             >
                <fieldset id="eqEditor" class="instrument-parameters">
                    <legend v-t="'eqLegend'"></legend>
                    <toggle-button
                        v-model="eqEnabled"
                        class="enable-selector"
                        sync
                    />
                    <div class="wrapper input range">
                        <label v-t="'low'" for="eqLow"></label>
                        <input type="range" id="eqLow" v-model.number="eqLow" min="0" max="1" step=".01" value="1">
                    </div>
                    <div class="wrapper input range">
                        <label v-t="'mid'" for="eqMid"></label>
                        <input type="range" id="eqMid" v-model.number="eqMid" min="0" max="1" step=".01" value="1">
                    </div>
                    <div class="wrapper input range">
                        <label v-t="'high'" for="eqHigh"></label>
                        <input type="range" id="eqHigh" v-model.number="eqHigh" min="0" max="1" step=".01" value="1">
                    </div>
                </fieldset>

                <fieldset id="filterEditor" class="instrument-parameters">
                    <legend v-t="'filterLegend'"></legend>
                    <toggle-button
                        v-model="filterEnabled"
                        class="enable-selector"
                        sync
                    />
                    <div class="wrapper input range">
                        <label v-t="'frequency'" for="filterFrequency"></label>
                        <input type="range" id="filterFrequency" v-model.number="filterFrequency" min="40" max="24000" step=".01" value="880">
                    </div>
                    <div class="wrapper input range">
                        <label v-t="'q'" for="filterQ"></label>
                        <input type="range" id="filterQ" v-model.number="filterQ" min="0" max="40" step="1" value="5">
                    </div>
                    <select-box
                        v-model="filterLFO"
                        :options="filterOptions"
                        class="select first"
                    />
                    <select-box
                        v-model="filterType"
                        :options="filterTypeOptions"
                        class="select"
                    />
                    <div class="wrapper input range">
                        <label v-t="'lfoSpeed'" for="filterSpeed"></label>
                        <input type="range" id="filterSpeed"
                               v-model.number="filterSpeed" min="0.1" max="25" step=".01" value="0.5">
                    </div>
                    <div class="wrapper input range">
                        <label v-t="'lfoDepth'" for="filterDepth"></label>
                        <input type="range" id="filterDepth"
                               v-model.number="filterDepth" min="0" max="100" step=".01" value="50">
                    </div>
                </fieldset>
            </div>
            <div class="tabbed-content"
                 :class="{ active: activeModuleTab === 1 }"
            >
                <fieldset id="odEditor" class="instrument-parameters">
                    <legend v-t="'odLegend'"></legend>
                    <toggle-button
                        v-model="odEnabled"
                        class="enable-selector"
                        sync
                    />
                    <div class="wrapper input range">
                        <label v-t="'drive'" for="odDrive"></label>
                        <input type="range" id="odDrive"
                               v-model.number="odDrive" min="0" max="1" step=".01" value="0.5">
                    </div>
                    <div class="wrapper input range">
                        <label v-t="'bandpassPre'" for="odPreBand"></label>
                        <input type="range" id="odPreBand"
                               v-model.number="odPreBand" min="0" max="1" step=".01" value="0.5">
                    </div>
                    <div class="wrapper input range">
                        <label v-t="'bandpassPost'" for="odColor"></label>
                        <input type="range" id="odColor"
                               v-model.number="odColor" min="0" max="22050" step="1" value="800">
                    </div>
                    <div class="wrapper input range">
                        <label v-t="'lpPost'" for="odPostCut"></label>
                        <input type="range" id="odPostCut"
                               v-model.number="odPostCut" min="0" max="22050" step=".01" value="3000">
                    </div>
                </fieldset>

                <fieldset id="delayEditor" class="instrument-parameters">
                    <legend v-t="'delayLegend'"></legend>
                    <toggle-button
                        v-model="delayEnabled"
                        class="enable-selector"
                        sync
                    />
                    <!-- not sure if this offers any flexibility -->
                    <select v-if="false" v-model.number="delayType">
                        <option v-t="'delay0'" value="0"></option>
                        <option v-t="'delay1'" value="1"></option>
                        <option v-t="'delay2'" value="2"></option>
                    </select>
                    <div class="wrapper input range">
                        <label v-t="'delayTime'" for="delayTime"></label>
                        <input type="range" id="delayTime" v-model.number="delayTime" min="0" max="1" step=".001" value=".5">
                    </div>
                    <div class="wrapper input range">
                        <label v-t="'feedback'" for="delayFeedback"></label>
                        <input type="range" id="delayFeedback" v-model.number="delayFeedback" min="0" max="1" step=".01" value="0.5">
                    </div>
                    <div class="wrapper input range">
                        <label v-t="'cutoff'" for="delayCutoff"></label>
                        <input type="range" id="delayCutoff" v-model.number="delayCutoff" min="0" max="22050" step="1" value="880">
                    </div>
                    <div class="wrapper input range">
                        <label v-t="'offset'" for="delayOffset"></label>
                        <input type="range" id="delayOffset" v-model.number="delayOffset" min="-0.5" max="0.5" step=".01" value="0">
                    </div>
                </fieldset>
            </div>
        </div>
    </section>
</template>

<script>
import { mapMutations } from "vuex";
import { ToggleButton } from "vue-js-toggle-button";
import SelectBox from "@/components/forms/select-box";
import AudioService from "@/services/audio-service";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        SelectBox,
        ToggleButton,
    },
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
        filterOptions() {
            return [
                { label: this.$t( "lfoOff" ),   value : "off" },
                { label: this.$t( "sine" ),     value : "sine" },
                { label: this.$t( "square" ),   value : "square" },
                { label: this.$t( "sawtooth" ), value : "sawtooth" },
                { label: this.$t( "triangle" ), value : "triangle" }
            ];
        },
        filterTypeOptions() {
            return [
                { label: this.$t( "lowpass" ),   value: "lowpass" },
                { label: this.$t( "highpass" ),  value: "highpass" },
                { label: this.$t( "bandpass" ),  value: "bandpass" },
                { label: this.$t( "lowshelf" ),  value: "lowshelf" },
                { label: this.$t( "highshelf" ), value: "highshelf" },
                { label: this.$t( "peaking" ),   value: "peaking" },
                { label: this.$t( "notch" ),     value: "notch" },
                { label: this.$t( "allpass" ),   value: "allpass" },
            ];
        }
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
@import "@/styles/_mixins";
@import "@/styles/tabs";
@import "@/styles/instrument-editor";
@import "@/styles/forms";

.select {
    width: 100px;
    margin: $spacing-medium 0;

    &.first {
        width: 95px;
        margin-right: $spacing-small;
    }
}

.module-editor {
    vertical-align: top;
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
        position: absolute;
        margin-top: -$spacing-large;
        margin-left: 152px;
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
        margin-top: $spacing-xlarge;
    }
}
</style>
