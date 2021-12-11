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
                    <assignable-range-control
                        v-model.number="eqLow"
                        :param-id="MIDI_ASSIGNABLE.EQ_LOW"
                        :label="$t('low')"
                    />
                    <assignable-range-control
                        v-model.number="eqMid"
                        :param-id="MIDI_ASSIGNABLE.EQ_MID"
                        :label="$t('mid')"
                    />
                    <assignable-range-control
                        v-model.number="eqHigh"
                        :param-id="MIDI_ASSIGNABLE.EQ_HIGH"
                        :label="$t('high')"
                    />
                </fieldset>

                <fieldset id="filterEditor" class="instrument-parameters">
                    <legend v-t="'filterLegend'"></legend>
                    <toggle-button
                        v-model="filterEnabled"
                        class="enable-selector"
                        sync
                    />
                    <assignable-range-control
                        v-model.number="filterFrequency"
                        :param-id="MIDI_ASSIGNABLE.FILTER_FREQ"
                        :label="$t('frequency')"
                    />
                    <assignable-range-control
                        v-model.number="filterQ"
                        :param-id="MIDI_ASSIGNABLE.FILTER_Q"
                        :label="$t('q')"
                    />
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
                    <assignable-range-control
                        v-model.number="filterSpeed"
                        :param-id="MIDI_ASSIGNABLE.FILTER_LFO_SPEED"
                        :label="$t('lfoSpeed')"
                    />
                    <assignable-range-control
                        v-model.number="filterDepth"
                        :param-id="MIDI_ASSIGNABLE.FILTER_LFO_DEPTH"
                        :label="$t('lfoDepth')"
                    />
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
                    <assignable-range-control
                        v-model.number="odDrive"
                        :param-id="MIDI_ASSIGNABLE.OD_DRIVE"
                        :label="$t('drive')"
                    />
                    <assignable-range-control
                        v-model.number="odPreBand"
                        :param-id="MIDI_ASSIGNABLE.OD_PRE_BAND"
                        :label="$t('bandpassPre')"
                    />
                    <assignable-range-control
                        v-model.number="odColor"
                        :param-id="MIDI_ASSIGNABLE.OD_COLOR"
                        :label="$t('bandpassPost')"
                    />
                    <assignable-range-control
                        v-model.number="odPostCut"
                        :param-id="MIDI_ASSIGNABLE.OD_POST_CUT"
                        :label="$t('lpPost')"
                    />
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
                    <assignable-range-control
                        v-model.number="delayTime"
                        :param-id="MIDI_ASSIGNABLE.DELAY_TIME"
                        :label="$t('delayTime')"
                    />
                    <assignable-range-control
                        v-model.number="delayFeedback"
                        :param-id="MIDI_ASSIGNABLE.DELAY_FEEDBACK"
                        :label="$t('feedback')"
                    />
                    <assignable-range-control
                        v-model.number="delayDry"
                        :param-id="MIDI_ASSIGNABLE.DELAY_DRY"
                        :label="$t('dryMix')"
                    />
                    <assignable-range-control
                        v-model.number="delayCutoff"
                        :param-id="MIDI_ASSIGNABLE.DELAY_CUTOFF"
                        :label="$t('cutoff')"
                    />
                    <assignable-range-control
                        v-model.number="delayOffset"
                        :param-id="MIDI_ASSIGNABLE.DELAY_OFFSET"
                        :label="$t('offset')"
                    />
                </fieldset>
            </div>
        </div>
    </section>
</template>

<script>
import { ToggleButton } from "vue-js-toggle-button";
import ControllerEditor from "@/components/instrument-editor/mixins/controller-editor";
import { enqueueState } from "@/model/factories/history-state-factory";
import SelectBox from "@/components/forms/select-box";
import { MIDI_ASSIGNABLE, applyParamChange } from "@/definitions/param-ids";
import { applyModule } from "@/services/audio-service";
import { clone } from "@/utils/object-util";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        SelectBox,
        ToggleButton,
    },
    mixins: [
        ControllerEditor
    ],
    props: {
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
        activeModuleTab: 0,
    }),
    computed: {
        /* EQ */
        eqEnabled: {
            get() {
                return this.instrumentRef.eq.enabled;
            },
            set( value ) {
                this.update( "eq", { ...this.instrumentRef.eq, enabled: value });
            }
        },
        eqLow: {
            get() {
                return this.instrumentRef.eq.lowGain;
            },
            set( value ) {
                this.updateParamChange( MIDI_ASSIGNABLE.EQ_LOW, value, this.eqLow );
            }
        },
        eqMid: {
            get() {
                return this.instrumentRef.eq.midGain;
            },
            set( value ) {
                this.updateParamChange( MIDI_ASSIGNABLE.EQ_MID, value, this.eqMid );
            }
        },
        eqHigh: {
            get() {
                return this.instrumentRef.eq.highGain;
            },
            set( value ) {
                this.updateParamChange( MIDI_ASSIGNABLE.EQ_HIGH, value, this.eqHigh );
            }
        },
        /* Filter */
        filterEnabled: {
            get() {
                return this.instrumentRef.filter.enabled;
            },
            set( value ) {
                this.update( "filter", { ...this.instrumentRef.filter, enabled: value });
            }
        },
        filterFrequency: {
            get() {
                return this.instrumentRef.filter.frequency;
            },
            set( value ) {
                this.updateParamChange( MIDI_ASSIGNABLE.FILTER_FREQ, value, this.filterFrequency );
            }
        },
        filterQ: {
            get() {
                return this.instrumentRef.filter.q;
            },
            set( value ) {
                this.updateParamChange( MIDI_ASSIGNABLE.FILTER_Q, value, this.filterQ );
            }
        },
        filterType: {
            get() {
                return this.instrumentRef.filter.type;
            },
            set( value ) {
                this.update( "filter", { ...this.instrumentRef.filter, type: value });
            }
        },
        filterLFO: {
            get() {
                return this.instrumentRef.filter.lfoType;
            },
            set( value ) {
                this.update( "filter", { ...this.instrumentRef.filter, lfoType: value });
            }
        },
        filterSpeed: {
            get() {
                return this.instrumentRef.filter.speed;
            },
            set( value ) {
                this.updateParamChange( MIDI_ASSIGNABLE.FILTER_LFO_SPEED, value, this.filterSpeed );
            }
        },
        filterDepth: {
            get() {
                return this.instrumentRef.filter.depth;
            },
            set( value ) {
                this.updateParamChange( MIDI_ASSIGNABLE.FILTER_LFO_DEPTH, value, this.filterDepth );
            }
        },
        /* Overdrive */
        odEnabled: {
            get() {
                return this.instrumentRef.overdrive.enabled;
            },
            set( value ) {
                this.update( "overdrive", { ...this.instrumentRef.overdrive, enabled: value });
            }
        },
        odDrive: {
            get() {
                return this.instrumentRef.overdrive.drive;
            },
            set( value ) {
                this.updateParamChange( MIDI_ASSIGNABLE.OD_DRIVE, value, this.odDrive );
            }
        },
        odPreBand: {
            get() {
                return this.instrumentRef.overdrive.preBand;
            },
            set( value ) {
                this.updateParamChange( MIDI_ASSIGNABLE.OD_PRE_BAND, value, this.odPreBand );
            }
        },
        odColor: {
            get() {
                return this.instrumentRef.overdrive.color;
            },
            set( value ) {
                this.updateParamChange( MIDI_ASSIGNABLE.OD_COLOR, value, this.odColor );
            }
        },
        odPostCut: {
            get() {
                return this.instrumentRef.overdrive.postCut;
            },
            set( value ) {
                this.updateParamChange( MIDI_ASSIGNABLE.OD_POST_CUT, value, this.odPostCut );
            }
        },
        /* Delay */
        delayEnabled: {
            get() {
                return this.instrumentRef.delay.enabled;
            },
            set( value ) {
                this.update( "delay", { ...this.instrumentRef.delay, enabled: value });
            }
        },
        delayType: {
            get() {
                return this.instrumentRef.delay.type;
            },
            set( value ) {
                this.update( "delay", { ...this.instrumentRef.delay, type: value });
            }
        },
        delayTime: {
            get() {
                return this.instrumentRef.delay.time;
            },
            set( value ) {
                this.updateParamChange( MIDI_ASSIGNABLE.DELAY_TIME, value, this.delayTime );
            }
        },
        delayFeedback: {
            get() {
                return this.instrumentRef.delay.feedback;
            },
            set( value ) {
                this.updateParamChange( MIDI_ASSIGNABLE.DELAY_FEEDBACK, value, this.delayFeedback );
            }
        },
        delayDry: {
            get() {
                return this.instrumentRef.delay.dry;
            },
            set( value ) {
                this.updateParamChange( MIDI_ASSIGNABLE.DELAY_DRY, value, this.delayDry );
            }
        },
        delayCutoff: {
            get() {
                return this.instrumentRef.delay.cutoff;
            },
            set( value ) {
                this.updateParamChange( MIDI_ASSIGNABLE.DELAY_CUTOFF, value, this.delayCutoff );
            }
        },
        delayOffset: {
            get() {
                return this.instrumentRef.delay.offset;
            },
            set( value ) {
                this.updateParamChange( MIDI_ASSIGNABLE.DELAY_OFFSET, value, this.delayOffset );
            }
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
        },
        assignable() {
            return this.midiConnected;
        },
    },
    created() {
        this.MIDI_ASSIGNABLE = MIDI_ASSIGNABLE;
    },
    methods: {
        // TODO: use updateParamChange
        update( prop, value ) {
            const store    = this.$store;
            const orgValue = clone( this.instrumentRef[ prop ] );
            const instrumentIndex = this.instrumentIndex;
            const commit = () => {
                store.commit( "updateInstrument", { instrumentIndex, prop, value });
                applyModule( prop, instrumentIndex, value ); // update AudioService
            };

            commit();
            this.invalidate(); // invalidate current preset (marks it as changed)

            enqueueState( `param_${instrumentIndex}_${prop}`, {
                undo() {
                    store.commit( "updateInstrument", { instrumentIndex, prop, value: orgValue });
                    applyModule( prop, instrumentIndex, orgValue );
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
            this.invalidate(); // invalidate current preset (marks it as changed)

            enqueueState( `param_${instrumentIndex}_${paramId}`, {
                undo() {
                    applyParamChange( paramId, orgValue, instrumentIndex, store );
                },
                redo: commit
            });
        },
        invalidate() {
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
