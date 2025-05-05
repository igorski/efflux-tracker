/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2019-2025 - https://www.igorski.nl
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
    <section
        class="module-editor"
        :class="{ 'module-editor--maximized': !showTabs }"
    >
        <div class="module-list">
            <ul
                v-if="showTabs"
                class="modules-tabs tab-list"
            >
                <li v-t="'filterTitle'"
                    :class="{ active: activeModuleTab === 0 }"
                    @click="activeModuleTab = 0">
                </li>
                <li v-t="'odDelayTitle'"
                    :class="{ active: activeModuleTab === 1 }"
                    @click="activeModuleTab = 1">
                </li>
            </ul>

            <div
                class="tabbed-content"
                :class="{ active: !showTabs || activeModuleTab === 0 }"
            >
                <fieldset id="eqEditor" class="instrument-parameters">
                    <legend v-t="'eqLegend'"></legend>
                    <assignable-toggle-control
                        v-model="eqEnabled"
                        :param-id="MIDI_ASSIGNABLE.EQ_ENABLED"
                        class="enable-selector"
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
                    <assignable-toggle-control
                        v-model="filterEnabled"
                        :param-id="MIDI_ASSIGNABLE.FILTER_ENABLED"
                        class="enable-selector"
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
            <div
                class="tabbed-content"
                :class="{ active: !showTabs || activeModuleTab === 1 }"
            >
                <fieldset id="odEditor" class="instrument-parameters">
                    <legend v-t="'odLegend'"></legend>
                    <assignable-toggle-control
                        v-model="odEnabled"
                        :param-id="MIDI_ASSIGNABLE.OD_ENABLED"
                        class="enable-selector"
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
                    <assignable-toggle-control
                        v-model="delayEnabled"
                        :param-id="MIDI_ASSIGNABLE.DELAY_ENABLED"
                        class="enable-selector"
                    />
                    <!-- not sure whether this offers any usable flexibility -->
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
                    <div class="wrapper toggle delay-tempo-sync">
                        <label
                            v-t="'tempoSync'"
                            class=""
                        ></label>
                        <toggle-button
                            v-model="delaySync"
                            sync
                        />
                    </div>
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

<script lang="ts">
import { mapState, mapGetters } from "vuex";
import ControllerEditor from "@/components/instrument-editor/mixins/controller-editor";
import ToggleButton from "@/components/third-party/vue-js-toggle-button/ToggleButton.vue";
import { IDEAL_MAXIMIZED_INSTRUMENT_EDITOR_WIDTH } from "@/definitions/layout";
import { enqueueState } from "@/model/factories/history-state-factory";
import SelectBox from "@/components/forms/select-box.vue";
import { applyModule } from "@/services/audio-service";
import { MIDI_ASSIGNABLE, applyParamChange } from "@/services/audio/param-controller";
import { syncIntervalWithBeat } from "@/utils/audio-math";
import { clone } from "@/utils/object-util";
import messages from "./messages.json";

export default {
    emits: [ "invalidate" ],
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
        tabbed: {
            type: Boolean,
            default: true,
        },
    },
    data: () => ({
        activeModuleTab: 0,
    }),
    computed: {
        ...mapState([
            "windowSize",
        ]),
        ...mapGetters([
            "activeSong",
        ]),
        showTabs(): boolean {
            return this.tabbed || this.windowSize.width < IDEAL_MAXIMIZED_INSTRUMENT_EDITOR_WIDTH;
        },
        /* EQ */
        eqEnabled: {
            get(): boolean {
                return this.instrumentRef.eq.enabled;
            },
            set( value: boolean ): void {
                this.update( "eq", { ...this.instrumentRef.eq, enabled: value });
            }
        },
        eqLow: {
            get(): number {
                return this.instrumentRef.eq.lowGain;
            },
            set( value: number ): void {
                this.updateParamChange( MIDI_ASSIGNABLE.EQ_LOW, value, this.eqLow );
            }
        },
        eqMid: {
            get(): number {
                return this.instrumentRef.eq.midGain;
            },
            set( value: number ): void {
                this.updateParamChange( MIDI_ASSIGNABLE.EQ_MID, value, this.eqMid );
            }
        },
        eqHigh: {
            get(): number {
                return this.instrumentRef.eq.highGain;
            },
            set( value: number ): void {
                this.updateParamChange( MIDI_ASSIGNABLE.EQ_HIGH, value, this.eqHigh );
            }
        },
        /* Filter */
        filterEnabled: {
            get(): boolean {
                return this.instrumentRef.filter.enabled;
            },
            set( value: boolean ): void {
                this.update( "filter", { ...this.instrumentRef.filter, enabled: value });
            }
        },
        filterFrequency: {
            get(): number {
                return this.instrumentRef.filter.frequency;
            },
            set( value: number ): void {
                this.updateParamChange( MIDI_ASSIGNABLE.FILTER_FREQ, value, this.filterFrequency );
            }
        },
        filterQ: {
            get(): number {
                return this.instrumentRef.filter.q;
            },
            set( value: number ): void {
                this.updateParamChange( MIDI_ASSIGNABLE.FILTER_Q, value, this.filterQ );
            }
        },
        filterType: {
            get(): string {
                return this.instrumentRef.filter.type;
            },
            set( value: string ): void {
                this.update( "filter", { ...this.instrumentRef.filter, type: value });
            }
        },
        filterLFO: {
            get(): string {
                return this.instrumentRef.filter.lfoType;
            },
            set( value: string ): void {
                this.update( "filter", { ...this.instrumentRef.filter, lfoType: value });
            }
        },
        filterSpeed: {
            get(): number {
                return this.instrumentRef.filter.speed;
            },
            set( value: number ): void {
                this.updateParamChange( MIDI_ASSIGNABLE.FILTER_LFO_SPEED, value, this.filterSpeed );
            }
        },
        filterDepth: {
            get(): number {
                return this.instrumentRef.filter.depth;
            },
            set( value: number ): void {
                this.updateParamChange( MIDI_ASSIGNABLE.FILTER_LFO_DEPTH, value, this.filterDepth );
            }
        },
        /* Overdrive */
        odEnabled: {
            get(): boolean {
                return this.instrumentRef.overdrive.enabled;
            },
            set( value: boolean ): void {
                this.update( "overdrive", { ...this.instrumentRef.overdrive, enabled: value });
            }
        },
        odDrive: {
            get(): number {
                return this.instrumentRef.overdrive.drive;
            },
            set( value: number ): void {
                this.updateParamChange( MIDI_ASSIGNABLE.OD_DRIVE, value, this.odDrive );
            }
        },
        odPreBand: {
            get(): number {
                return this.instrumentRef.overdrive.preBand;
            },
            set( value: number ): void {
                this.updateParamChange( MIDI_ASSIGNABLE.OD_PRE_BAND, value, this.odPreBand );
            }
        },
        odColor: {
            get(): number {
                return this.instrumentRef.overdrive.color;
            },
            set( value: number ): void {
                this.updateParamChange( MIDI_ASSIGNABLE.OD_COLOR, value, this.odColor );
            }
        },
        odPostCut: {
            get(): number {
                return this.instrumentRef.overdrive.postCut;
            },
            set( value: number ): void {
                this.updateParamChange( MIDI_ASSIGNABLE.OD_POST_CUT, value, this.odPostCut );
            }
        },
        /* Delay */
        delayEnabled: {
            get(): boolean {
                return this.instrumentRef.delay.enabled;
            },
            set( value: boolean ): void {
                this.update( "delay", { ...this.instrumentRef.delay, enabled: value });
            }
        },
        delayType: {
            get(): number {
                return this.instrumentRef.delay.type;
            },
            set( value: number ): void {
                this.update( "delay", { ...this.instrumentRef.delay, type: value });
            }
        },
        delayTime: {
            get(): number {
                return this.instrumentRef.delay.time;
            },
            set( value: number ): void {
                if ( this.delaySync ) {
                    value = syncIntervalWithBeat( value, this.activeSong.meta.timing );
                }
                this.updateParamChange( MIDI_ASSIGNABLE.DELAY_TIME, value, this.delayTime );
            }
        },
        delaySync: {
            get(): boolean {
                return this.instrumentRef.delay.sync;
            },
            set( value: boolean ): void {
                this.update( "delay", { ...this.instrumentRef.delay, sync: value });
                if ( value ) {
                    this.delayTime = this.delayTime;
                }
            }
        },
        delayFeedback: {
            get(): number {
                return this.instrumentRef.delay.feedback;
            },
            set( value: number ): void {
                this.updateParamChange( MIDI_ASSIGNABLE.DELAY_FEEDBACK, value, this.delayFeedback );
            }
        },
        delayDry: {
            get(): number {
                return this.instrumentRef.delay.dry;
            },
            set( value: number ): void {
                this.updateParamChange( MIDI_ASSIGNABLE.DELAY_DRY, value, this.delayDry );
            }
        },
        delayCutoff: {
            get(): number {
                return this.instrumentRef.delay.cutoff;
            },
            set( value: number ): void {
                this.updateParamChange( MIDI_ASSIGNABLE.DELAY_CUTOFF, value, this.delayCutoff );
            }
        },
        delayOffset: {
            get(): number {
                return this.instrumentRef.delay.offset;
            },
            set( value: number ): void {
                this.updateParamChange( MIDI_ASSIGNABLE.DELAY_OFFSET, value, this.delayOffset );
            }
        },
        filterOptions(): { label: string, value: string }[] {
            return [
                { label: this.$t( "lfoOff" ),   value : "off" },
                { label: this.$t( "sine" ),     value : "sine" },
                { label: this.$t( "square" ),   value : "square" },
                { label: this.$t( "sawtooth" ), value : "sawtooth" },
                { label: this.$t( "triangle" ), value : "triangle" }
            ];
        },
        filterTypeOptions(): { label: string, value: string }[] {
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
        assignable(): boolean {
            return this.midiConnected;
        },
    },
    created(): void {
        this.MIDI_ASSIGNABLE = MIDI_ASSIGNABLE;
    },
    methods: {
        // TODO: use updateParamChange
        update( prop: string, value: any ): void {
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
        updateParamChange( paramId: string, value: any, orgValue: any ): void {
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
        invalidate(): void {
            this.$emit( "invalidate" );
        },
    }
};
</script>

<style lang="scss" scoped>
@use "@/styles/_mixins";
@use "@/styles/_variables";
@use "@/styles/tabs";
@use "@/styles/instrument-editor";
@use "@/styles/forms";

$large-height: 800px;

.select {
    width: 100px;
    margin: variables.$spacing-medium 0;

    &.first {
        width: 95px;
        margin-right: variables.$spacing-small;
    }
}

.module-editor {
    vertical-align: top;
    @include mixins.boxSize();

    @include mixins.mobile() {
        width: 100%;
        padding: 0;
    }

    .modules-tabs {
        margin: 0;
    }

    .instrument-parameters {
        @include mixins.boxSize();
        width: 100%;
        border-bottom-right-radius: variables.$spacing-medium;
        padding: variables.$spacing-small 0 variables.$spacing-small variables.$spacing-medium;
        margin-bottom: variables.$spacing-medium;
    }

    .enable-selector {
        position: absolute;
        margin-top: -( variables.$spacing-large );
        margin-left: 152px;
    }

    .tabbed-content {
        @include mixins.boxSize();

        border: 1px solid grey;
        padding: variables.$spacing-medium;

        &.active {
            @include mixins.large() {
                @include mixins.minWidthFallback( variables.$ideal-instrument-editor-width ) {
                    display: flex;
                }
            }
        }
    }

    .module-list {
        display: inline-block;
        vertical-align: top;
        width: 100%;

        @include mixins.large() {
            margin-top: -( variables.$spacing-large );
        }

        @include mixins.minHeight( $large-height ) {
            margin-top: variables.$spacing-small;
        }
    }

    .delay-tempo-sync {
        display: flex;
        align-items: center;
    }
}

#filterEditor {
    margin-bottom: variables.$spacing-medium;
}

/* ideal size and above (tablet/desktop) */

@media screen and ( min-width: variables.$ideal-instrument-editor-width ) {
    .module-editor {
        display: inline-block;

        .module-list {
            max-width: 260px;
        }

        &--maximized {
            .module-list {
                display: inline-flex;
                flex-direction: column;
                max-width: initial;
                margin-top: -( variables.$spacing-large );
            }

            .tabbed-content {
                border: 0;
                display: flex;

                padding: variables.$spacing-medium 0 0 0;
            }

            .instrument-parameters {
                max-width: 250px;
            }
        }
    }
}
</style>
