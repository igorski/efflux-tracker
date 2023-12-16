/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2023 - https://www.igorski.nl
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
    <div
        class="automation-lane"
        :class="{ 'automation-lane--expanded': !collapsed }"
    >
        <div class="automation-lane__header">
            <h2 v-t="'title'" class="automation-lane__title"></h2>
            <select-box
                v-if="!collapsed"
                v-model="selectedModule"
                :options="availableModules"
                auto-position
                narrow
            />
            <div class="automation-lane__header-actions">
                <button
                    v-if="!collapsed"
                    v-t="'clear'"
                    type="button"
                    class="automation-lane__header-button"
                    @click="$emit('clear')"
                ></button>
                <button
                    v-t="collapsed ? 'expand' : 'collapse'"
                    type="button"
                    class="automation-lane__header-button automation-lane__header-button-toggle"
                    @click="$emit('toggle')"
                ></button>
            </div>
        </div>
        <section
            v-if="!collapsed"
            class="automation-lane__list"
        >
            <automation-lane-entry
                v-for="(automation, index) in formattedAutomations"
                v-model.number="focusedStepValue"
                :key="`automation_${index}`"
                :has-instruction="automation.hasInstruction"
                :height="automation.height"
                :is-editing="editingStep === index"
                :display-value="automation.value"
                class="automation-lane__list-entry"
                @down="handleDrawStart( index, $event )"
                @create="createEvent( index, $event )"
                @delete="deleteEvent( index )"
                @focus="focusStepEditor( index )"
                @blur="blurStepEditor()"
            />
        </section>
    </div>
</template>

<script lang="ts">
import { mapGetters, mapMutations } from "vuex";
import SelectBox from "@/components/forms/select-box.vue";
import {
    DELAY_ENABLED, DELAY_FEEDBACK, DELAY_DRY, DELAY_CUTOFF, DELAY_TIME, DELAY_OFFSET,
    FILTER_ENABLED, FILTER_FREQ, FILTER_Q, FILTER_LFO_ENABLED,
    FILTER_LFO_SPEED, FILTER_LFO_DEPTH,
    PAN_LEFT, PAN_RIGHT, PITCH_UP, PITCH_DOWN,
    VOLUME, NON_PERSISTED_PARAMS,
} from "@/definitions/automatable-parameters";
import addEventParamAutomation from "@/model/actions/event-param-automation-add";
import deleteEventParamAutomation from "@/model/actions/event-param-automation-delete";
import EventFactory from "@/model/factories/event-factory";
import { type EffluxAudioEvent } from "@/model/types/audio-event";
import { getCurrentModuleParamValue } from "@/services/audio-service";
import KeyboardService from "@/services/keyboard-service";
import AutomationLaneEntry from "./automation-lane-entry.vue";
import { type DragListener, NOTE_WIDTH } from "../piano-roll-row/piano-roll-row.vue";
import messages from "./messages.json";

function inverseNormalise( value: number, max = 100 ): number {
    return (( max - value ) / max ) * 100;
}
let orgValue: number;

export default {
    i18n: { messages },
    components: {
        AutomationLaneEntry,
        SelectBox,
    },
    props: {
        events: {
            type: Array, // EffluxAudioEvent[]
            required: true,
        },
        selectedInstrument: {
            type: Number,
            required: true,
        },
        activePatternIndex: {
            type: Number,
            required: true,
        },
        collapsed: {
            type: Boolean,
            default: true,
        },
    },
    data: () => ({
        selectedModule: PITCH_UP,
        focusedStepValue: 0,
        editingStep: -1,
    }),
    computed: {
        ...mapGetters([
            "activeSong",
        ]),
        availableModules(): { label: string, value: string }[] {
            return [
                { label: this.$t( "delayOnOff" ),     value: DELAY_ENABLED },
                { label: this.$t( "delayFeedback" ),  value: DELAY_FEEDBACK },
                { label: this.$t( "delayDry" ),       value: DELAY_DRY },
                { label: this.$t( "delayCutoff" ),    value: DELAY_CUTOFF },
                { label: this.$t( "delayTime" ),      value: DELAY_TIME },
                { label: this.$t( "delayOffset" ),    value: DELAY_OFFSET },
                { label: this.$t( "filterOnOff" ),    value: FILTER_ENABLED },
                { label: this.$t( "filterFreq" ),     value: FILTER_FREQ },
                { label: this.$t( "filterQ" ),        value: FILTER_Q },
                { label: this.$t( "filterLfoOnOff" ), value: FILTER_LFO_ENABLED },
                { label: this.$t( "filterLfoSpeed" ), value: FILTER_LFO_SPEED },
                { label: this.$t( "filterLfoDepth" ), value: FILTER_LFO_DEPTH},
                { label: this.$t( "panLeft" ),        value: PAN_LEFT },
                { label: this.$t( "panRight" ),       value: PAN_RIGHT },
                { label: this.$t( "pitchUp" ),        value: PITCH_UP },
                { label: this.$t( "pitchDown" ),      value: PITCH_DOWN },
                { label: this.$t( "volume" ),         value: VOLUME },
            ];
        },
        formattedAutomations(): { value: number, height: string, hasInstruction: boolean }[] {
            const { selectedModule } = this;
            let lastKnownValue = this.getValueAtStep( 0 );

            return this.events.map( event => {
                if ( !event?.mp || event.mp.module !== selectedModule ) {
                    return { value: lastKnownValue.toFixed( 2 ), height: `${lastKnownValue}%`, hasInstruction: false };
                }
                const { value } = event.mp;
                lastKnownValue = NON_PERSISTED_PARAMS.has( selectedModule ) ? NON_PERSISTED_PARAMS.get( selectedModule ) : value;

                return { value: value.toFixed( 2 ), height: `${value}%`, hasInstruction: true };
            });
        },
    },
    watch: {
        selectedModule(): void {
            this.notified = false;
        },
    },
    created(): void {
        for ( const event of this.events ) {
            if ( !event?.mp?.module ) {
                continue;
            }
            this.selectedModule = event.mp.module;
            break;
        }
        this.dragListeners = [] as DragListener[];
        this.isDragging  = false;
        this.dragStartX  = 0;
        this.dragIndex   = -1;
        this.lastCreated = -1;
    },
    beforeDestroy(): void {
        this.removeListeners();
    },
    methods: {
        ...mapMutations([
            "addEventAtPosition",
            "saveState",
            "showNotification",
        ]),
        /* keyboard events */
        async focusStepEditor( step: number ): Promise<void> {
            KeyboardService.setListener( this.handleStepInput.bind( this ));
            this.editingStep = step;
            this.focusedStepValue = orgValue = this.getValueAtStep( step ).toFixed( 2 );
            await this.$nextTick();
            this.$refs.automationInput?.select();
        },
        blurStepEditor(): void {
            const step  = this.editingStep;
            const value = this.focusedStepValue;

            this.$refs.automationInput?.blur();
            KeyboardService.setListener( null );
            this.editingStep = -1;
         
            if ( isNaN( value )) {
                return;
            }
            this.addOrUpdateAutomation( step, value );
        },
        handleStepInput( type: string, keyCode: number, event: KeyboardEvent ): boolean {
            if ( type !== "up" ) {
                return true; // always block when focused
            }
            switch ( keyCode ) {
                default:
                    return false;
                case 13: // enter
                    this.blurStepEditor();
                    break;
                case 27: // esc
                    this.focusedStepValue = orgValue; // cancel changes
                    this.blurStepEditor();
                    break;
            }
            event.preventDefault();
            return true;
        },
        createEvent( index: number, event: PointerEvent | TouchEvent ): void {
            if ( !event.target || this.editingStep > -1 ) {
                return;
            }
            const y = event.touches ? event.touches[ 0 ].clientY : event.pageY;
            const rect  = ( event.target as HTMLElement ).getBoundingClientRect();
            const value = inverseNormalise( y - rect.y, rect.height );

            this.addOrUpdateAutomation( index, value );
        },
        deleteEvent( index: number ): void {
            if ( this.editingStep > -1 ) {
                return;
            }
            this.saveState(
                deleteEventParamAutomation( this.$store, this.activePatternIndex, this.selectedInstrument, index )
            );
        },
        addOrUpdateAutomation( step: number, value: number ): void {
            value = Math.max( 0, Math.min( value, 100 ));
            if ( value === this.getValueAtStep( step ) ) {
                return; // no change
            }
            let event = this.getEventAtStep( step );
            
            // no module param defined yet ? create as duplicate of previously defined property
            let mp = event?.mp ? { ...event.mp } : undefined;
            if ( mp ) {
                if ( mp.module !== this.selectedModule ) {
                    const oldParam = this.availableModules.find(({ value }) => value === mp.module )?.label;
                    if ( oldParam && !this.notified ) {
                        const newParam = this.availableModules.find(({ value }) => value === this.selectedModule ).label;
                        this.showNotification({ message: this.$t( "replacedAutomation", { oldParam, newParam }) });
                        this.notified = true;
                    }
                    mp.module = this.selectedModule;
                }
            } else {
                mp = EventFactory.createModuleParam( this.selectedModule, value, true );
            }

            if ( event ) {
                // a previously existed event will register the mp change in state history
                // (a newly created event is added to state history through its addition to the song)
                this.saveState(
                    addEventParamAutomation( this.$store, this.activePatternIndex, this.selectedInstrument, step, { ...mp, value  })
                );
            } else {
                event = EventFactory.create( this.selectedInstrument );
                event.mp = EventFactory.createModuleParam( this.selectedModule, value, true );
                this.addEventAtPosition({
                    store: this.$store, event,
                    optData: {
                        newEvent          : true,
                        advanceOnAddition : false,
                        patternIndex      : this.activePatternIndex,
                        channelIndex      : this.selectedInstrument,
                        step,
                    }
                });
            }
        },
        getEventAtStep( step: number ): EffluxAudioEvent {
            return this.activeSong
                    .patterns[ this.activePatternIndex ]
                    .channels[ this.selectedInstrument ][ step ];
        },
        getValueAtStep( step: number ): number {
            const event = this.getEventAtStep( step );
            if ( event?.mp?.module === this.selectedModule ) {
                return event.mp.value;
            }
            return getCurrentModuleParamValue( this.activeSong.instruments[ this.selectedInstrument ], this.selectedModule );
        },
        /* pointer events */
        handleDrawStart( index: number, event: PointerEvent ): void {
            this.isDragging  = true;
            this.dragStartX  = event.clientX;
            this.dragIndex   = index;
            this.lastCreated = -1;

            this.dragListeners.push({ element: window, type: "mouseup", handler: this.handleDrawEnd.bind( this ) });
            this.dragListeners.push({ element: window, type: "mousemove", handler: this.handleMouseMove.bind( this ) });
            this.dragListeners.push({ element: window, type: "touchmove", handler: this.handleTouchMove.bind( this ) });
            this.dragListeners.push({ element: event.target, type: "touchcancel", handler: this.handleDrawEnd.bind( this ) });
            this.dragListeners.push({ element: event.target, type: "touchend", handler: this.handleDrawEnd.bind( this ) });
 
            for ( const entry of this.dragListeners ) {
                entry.element.addEventListener( entry.type, entry.handler );
            }
        },
        handleMouseMove( event: MouseEvent ): void {
            this.handleDraw( event.clientX, event );
        },
        handleTouchMove( event: TouchEvent ): void {
            const [ touch ] = event.touches;
            touch && this.handleDraw( touch.pageX, event );
        },
        handleDraw( position: number, event: MouseEvent | TouchEvent ): void {
            const delta = position - this.dragStartX;
            const moved = Math.round( delta / NOTE_WIDTH ); // amount of slot steps we traversed during drag
            const index = this.dragIndex + moved; // current step position of the pointer

            if ( this.lastCreated === index ) {
                return;
            }
            this.createEvent( Math.max( 0, Math.min( index, this.events.length - 1 )), event );
            this.lastCreated = index;
        },
        handleDrawEnd(): void {
            this.isDragging = false;
            this.removeListeners();
        },
        removeListeners(): void {
            for ( const entry of this.dragListeners ) {
                entry.element.removeEventListener( entry.type, entry.handler );
            }
            this.dragListeners.length = 0;
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/_variables";
@import "@/styles/_mixins";

.automation-lane {
    @include mobile() {
        display: none;
    }
    
    &--expanded {
        height: $piano-roll-automation-lane-height;
    }

    &__header {
        display: flex;
        justify-content: space-between;
        height: $spacing-large;
        align-items: center;
        padding: $spacing-small 0;
        height: $piano-roll-automation-lane-height-collapsed;
    }

    &__title {
        @include toolFont();
        margin: 0 0 0 $piano-roll-name-width;
        padding: $spacing-small 0;
    }

    &__header-button {
        @include toolButton( true );

        &-toggle {
            margin-right: ($spacing-large - $spacing-xsmall);
        }
    }

    &__list {
        display: flex;
        height: calc(100% - ($piano-roll-automation-lane-height-collapsed + $spacing-small));
        margin-left: $piano-roll-name-width;
    }

    .vs__selected {
        background-color: purple !important;
    }
}
</style>