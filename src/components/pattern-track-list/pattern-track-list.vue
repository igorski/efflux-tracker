/**
* The MIT License (MIT)
*
* Igor Zinken 2016-2023 - https://www.igorski.nl
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
    <section class="pattern-track-list">
        <div
            ref="container"
            class="pattern-track-list-container"
            :class="{ follow: mustFollow }"
        >
            <div class="wrapper"
                 ref="wrapper"
                 @mousedown="handleInteraction"
                 @dblclick="handleInteraction"
                 @touchstart.passive="handleInteraction"
                 @touchend.passive="handleInteraction"
            >
                <ul
                    class="indices"
                    :class="{ fixed: mustFollow }"
                >
                    <template v-if="mustFollow && stepCentered">
                        <li
                            v-for="index in prevIndices"
                            :key="`prev_index_${index}`"
                            class="index next"
                        >{{ index }}</li>
                    </template>
                    <li
                        v-for="(step, index) in amountOfSteps"
                        :key="`index_${index}`"
                        class="index"
                    >{{ index }}</li>
                    <template v-if="mustFollow">
                        <li
                            v-for="index in nextIndices"
                            :key="`next_index_${index}`"
                            class="index next"
                        >{{ index }}</li>
                    </template>
                </ul>
                <ul
                    v-for="(channel, channelIndex) in activeSongPattern.channels"
                    :key="`channel_${channelIndex}`"
                    class="pattern"
                    ref="pattern"
                >
                    <template v-if="mustFollow && stepCentered">
                        <!-- to keep playback center based, while playing in follow mode, pad list top -->
                        <pattern-event
                            v-for="(event, stepIndex) in previousPatternChannels[ channelIndex ]"
                            :key="`prevchannel_${channelIndex}_${stepIndex}`"
                            :event="event"
                            :selected-slot="stepIndex === selectedStep && channelIndex === selectedInstrument ? selectedSlot : -1"
                            :formatted-param="formatModuleParam( event.mp )"
                            class="pattern-row"
                            :class="{ spacer: activeOrderIndex === 1 }"
                        />
                    </template>
                    <pattern-event
                        v-for="(event, stepIndex) in channel"
                        :key="`channel_${channelIndex}_${stepIndex}`"
                        :event="event"
                        :selected-slot="stepIndex === selectedStep && channelIndex === selectedInstrument ? selectedSlot : -1"
                        :formatted-param="formatModuleParam( event.mp )"
                        :active="stepIndex === selectedStep && channelIndex === selectedInstrument"
                        :selected="isStepSelected( channelIndex, stepIndex )"
                        :playing="stepIndex === playingStep"
                        class="pattern-row"
                    />
                    <template v-if="mustFollow">
                        <!-- to keep playback center based, while playing in follow mode, pad list bottom -->
                        <pattern-event
                            v-for="(event, stepIndex) in nextPatternChannels[ channelIndex ]"
                            :key="`nextchannel_${channelIndex}_${stepIndex}`"
                            :event="event"
                            :selected-slot="stepIndex === selectedStep && channelIndex === selectedInstrument ? selectedSlot : -1"
                            :formatted-param="formatModuleParam( event.mp )"
                            class="pattern-row"
                            :class="{ spacer: activeOrderIndex === activeSong.order.length - 1 }"
                        />
                    </template>
                </ul>
            </div>
        </div>
    </section>
</template>

<script lang="ts">
import { mapState, mapGetters, mapMutations } from "vuex";
import type { EffluxAudioEventModuleParams } from "@/model/types/audio-event";
import type { EffluxChannel } from "@/model/types/channel";
import type { EffluxPattern } from "@/model/types/pattern";
import PatternEvent from "./pattern-event.vue";
import KeyboardService from "@/services/keyboard-service";

const STEP_WIDTH  = 150;
const STEP_HEIGHT = 32;
const MAX_PADDING = 8; // min top padding when followPlayback is active on high resolutions
const DOUBLE_STEP_HEIGHT = STEP_HEIGHT * 2;
let NEXT_EVENTS = [];

export default {
    components: { PatternEvent },
    data: () => ({
        container: null,
        wrapper: null,
        playingStep: 0,
        containerWidth: 0,
        containerHeight: 0,
        interactionData: { offset: 0, time: 0 },
        pContainerSteps: [], // will cache DOM elements for interation events
        prevEvents: 0,
        nextEvents: 0,
        stepCentered: false, // whether active step is aligned to center of screen (in followPlayback mode)
    }),
    computed: {
        ...mapState({
            activeSong: state => state.song.activeSong,
            currentStep: state => state.sequencer.currentStep,
            selectedInstrument: state => state.editor.selectedInstrument,
            selectedStep: state => state.editor.selectedStep,
            selectedSlot: state => state.editor.selectedSlot,
            stepPrecision: state => state.sequencer.stepPrecision,
            selectedChannels: state => state.selection.selectedChannels,
            minSelectedStep: state => state.selection.minSelectedStep,
            firstSelectedChannel: state => state.selection.firstSelectedChannel,
            windowSize: state => state.windowSize,
        }),
        ...mapGetters([
            "activePatternIndex",
            "activeOrderIndex",
            "amountOfSteps",
            "hasSelection",
            "followPlayback",
            "paramFormat",
            "isPlaying"
        ]),
        activeSongPattern(): EffluxPattern {
            return this.activeSong.patterns[ this.activePatternIndex ];
        },
        prevPatternIndex(): number {
            return this.activeSong.order[ this.activeOrderIndex - 1 ] ?? - 1;
        },
        nextPatternIndex(): number {
            return this.activeSong.order[ this.activeOrderIndex + 1 ] ?? this.activeSong.order[ 0 ] ;
        },
        previousPatternChannels(): EffluxChannel[] | null {
            if ( !this.mustFollow ) {
                return null;
            }
            const lastPatternIndex = this.activeSong.order[ this.activeSong.order.length - 1 ];
            const prevIndex = this.prevPatternIndex < 0 ? lastPatternIndex : this.prevPatternIndex;
            return this.activeSong.patterns[ prevIndex ].channels.map( channel => {
                return channel.slice(( channel.length - 1 ) - this.prevEvents );
            });
        },
        nextPatternChannels(): EffluxChannel[] | null {
            if ( !this.mustFollow ) {
                return null;
            }
            const amountOfPatterns = this.activeSong.order.length;
            // also provide lookahead for the pattern(s) coming after the next one for a seamless scrolling list
            const nextOrderIndex   = this.activeOrderIndex + 1;
            const nextPatternIndex = this.activeSong.order[ nextOrderIndex ] ?? this.activeSong.order[ 0 ];
            let nextNextIndex = nextOrderIndex;

            // the amount of events we require to visualize the next pattern(s) at the current resolution
            let sliceAmount = this.visibleSteps - this.prevEvents;
            return this.activeSong.patterns[ nextPatternIndex ].channels.map(( channelEvents, channelIndex ) => {
                const out = [ ...channelEvents ];
                while ( out.length < sliceAmount ) {
                    if ( ++nextNextIndex >= amountOfPatterns ) {
                        nextNextIndex = 0;
                    }
                    let nextChannelEvents = NEXT_EVENTS;
                    if ( nextNextIndex !== 0 ) {
                        nextChannelEvents = this.activeSong.patterns[ this.activeSong.order[ nextNextIndex ]].channels[ channelIndex ];
                    }
                    out.push( ...nextChannelEvents );
                }
                return out.slice( 0, sliceAmount );
            });
        },
        prevIndices(): number[] {
            const out: number[] = [];
            const lastPatternAmount = this.activeSong.patterns[ this.prevPatternIndex ]?.steps || this.activeSongPattern.steps;
            for ( let i = lastPatternAmount - this.prevEvents; i <= lastPatternAmount; ++i ) {
                out.push( i );
            }
            return out;
        },
        nextIndices(): number[] {
            const out: number[] = new Array( this.nextEvents );
            for ( let i = 0; i < this.nextEvents; ++i ) {
                out[ i ] = i;
            }
            return out;
        },
        mustFollow(): boolean {
            return this.followPlayback && this.isPlaying;
        },
    },
    watch: {
        activePatternIndex(): void {
            this.clearSelection();
            this.setSelectedSlot( -1 );
            this.pContainerSteps = [];
        },
        currentStep( step: number ): void {
            const stepsInPattern = this.activeSongPattern.steps;
            const diff = this.stepPrecision / stepsInPattern;

            this.playingStep = Math.floor( step / diff ) % stepsInPattern;

            if ( !this.mustFollow ) {
                return;
            }

            if ( !this.stepCentered ) {
                if ( this.playingStep >= this.prevEvents ) {
                    this.stepCentered = true;
                } else {
                    return;
                }
            }
            // following activated, ensure the list auto scrolls
            this.$refs.container.scrollTop = ( this.playingStep * STEP_HEIGHT ) + DOUBLE_STEP_HEIGHT;
        },
        windowSize(): void {
            this.cacheDimensions();
        },
        isPlaying( value: boolean ): void {
            if ( !this.followPlayback ) {
                return;
            }
            if ( value ) {
                 this.stepCentered = false;
            }
            this.$refs.container.scrollTop = 0;
        },
        selectedStep(): void { this.focusActiveStep() },
        selectedSlot(): void { this.focusActiveStep() },
    },
    mounted(): void {
        this.$nextTick(() => {
            this.container = this.$refs.container;
            this.wrapper = this.$refs.wrapper;
            this.cacheDimensions();
        });
    },
    methods: {
        ...mapMutations([
            "setSelectedInstrument",
            "setSelectedSlot",
            "setSelectedStep",
            "setHelpTopic",
            "clearSelection",
            "setSelectionChannelRange",
            "setSelection",
            "addEventAtPosition",
            "setShowNoteEntry",
        ]),
        cacheDimensions(): void {
            this.containerWidth  = this.container.offsetWidth;
            this.containerHeight = this.container.offsetHeight;

            // the amount of events we can fit vertically on the screen
            this.visibleSteps = Math.ceil( this.containerHeight / STEP_HEIGHT );

            const padding   = Math.round(( this.containerHeight / 2 ) / STEP_HEIGHT );
            this.prevEvents = Math.min( MAX_PADDING, padding );
            this.nextEvents = this.visibleSteps - this.prevEvents;

            if ( NEXT_EVENTS.length !== this.nextEvents ) {
                NEXT_EVENTS = new Array( this.nextEvents ).fill( 0 );
            }
        },
        isStepSelected( channelIndex: number, stepIndex: number ): boolean {
            return this.selectedChannels[ channelIndex ]?.includes( stepIndex );
        },
        /**
         * ensure the currently active step (after a keyboard navigation)
         * is visible on screen
         */
        focusActiveStep(): void {
            const top        = this.container.scrollTop;
            const left       = this.container.scrollLeft;
            const bottom     = top + this.containerHeight;
            const right      = left + this.containerWidth;
            const slotLeft   = this.selectedInstrument * STEP_WIDTH;
            const slotRight  = ( this.selectedInstrument + 1 ) * STEP_WIDTH;
            const slotTop    = this.selectedStep * STEP_HEIGHT;
            const slotBottom = ( this.selectedStep + 1 ) * STEP_HEIGHT;

            if ( slotBottom >= bottom ) {
                this.container.scrollTop = slotBottom - this.containerHeight;
            }
            else if ( slotTop < top ) {
                this.container.scrollTop = slotTop;
            }
            if ( slotRight >= right ) {
                this.container.scrollLeft = ( slotRight - this.containerWidth ) + STEP_WIDTH;
            }
            else if ( slotLeft < left ) {
                this.container.scrollLeft = slotLeft;
            }
        },
        formatModuleParam( eventMpData?: EffluxAudioEventModuleParams ): { param: string, value: number } | null {
            if ( !eventMpData ) {
                return null;
            }
            let param = eventMpData.glide ? "G " : "";

            if ( eventMpData.module ) {
                param += eventMpData.module.charAt( 0 ).toUpperCase();
                param += eventMpData.module.match(/([A-Z]?[^A-Z]*)/g)[1].charAt( 0 );
            }
            let value;
            // show parameter value in either hex or percentages
            // TODO there is a bit of code duplication with NumberUtil here...
            if ( this.paramFormat === "pct" )
                value = Math.min( 99, parseInt( eventMpData.value, 10 )).toString();
            else {
                value = Math.round( eventMpData.value * ( 255 / 100 )).toString( 16 ).toUpperCase();
            }
            value = value.length === 1 ? ` 0${value}` : ` ${value}`;
            return { param, value };
        },
        handleInteraction( event: PointerEvent ): void {
            // for touch interactions, we record some data as soon as touch starts so we can evaluate it on end
            if ( event.type === "touchstart" ) {
                this.interactionData.offset = window.scrollY;
                this.interactionData.time   = Date.now();
                return;
            }
            // check if we interacted with a <pattern-event />
            if (( event.target as HTMLElement ).nodeName === "LI" ) {
                this.handleSlotClick( event );
            }
            this.setHelpTopic( "tracker" );
        },
        /**
         * handle the event when the user clicks/taps a slot within the pattern
         * WHY are we doing difficult manual calculations ? The easiest thing would be to
         * add the listener directly on the slots themselves, but consider the excessive
         * amount of event listeners that would be attached to a large amount of DOM elements...
         */
        handleSlotClick( event: PointerEvent ): void {
            const pContainers = this.$refs.pattern;
            const shiftDown   = KeyboardService.hasShift();
            let selectionChannelStart = this.selectedInstrument,
                selectionStepStart    = this.selectedStep;

            let found = false;

            if ( this.hasSelection ) {
                selectionChannelStart = this.firstSelectedChannel;
                selectionStepStart    = this.minSelectedStep;
            }

            for ( let i = 0, l = pContainers.length; i < l; ++i ) {
                if ( found ) {
                    break;
                }
                const pContainer = pContainers[ i ];
                const items = this.grabPatternContainerStepFromTemplate( pContainer, i );

                let j = items.length;
                while ( j-- ) {
                    if ( items[ j ] === event.target ) {
                        if ( i !== this.selectedInstrument ) {
                            this.setSelectedInstrument(i); // when entering a new channel lane, make default instrument match index
                        }

                        // if shift was held down, we're making a selection
                        if ( shiftDown ) {
                            this.setSelectionChannelRange({ firstChannel: selectionChannelStart, lastChannel: i });
                            this.setSelection({ selectionStart: selectionStepStart, selectionEnd: j });
                        }
                        else {
                            this.clearSelection();
                        }
                        this.setSelectedStep( j );
                        this.setSelectedSlot( -1 );

                        // when using a mouse, select the clicked slot. on touch screens there is no benefit in slot selection
                        if ( !shiftDown && event.type === "mousedown" ) {
                            this.selectSlotWithinClickedStep( event );
                        }
                        if ( event.type === "dblclick" ) {
                            event.preventDefault();
                            this.setShowNoteEntry( true );
                            found = true;
                        }
                        break;
                    }
                }
            }
        },
        selectSlotWithinClickedStep( event: PointerEvent ) {
            const { clientX, clientY } = event;
            let el = document.caretRangeFromPoint?.( clientX, clientY )?.startContainer;
            let slot = 0;
            if ( el ) {
                if ( !( el instanceof Element && el.parentElement instanceof Element )) {
                    el = el.parentElement;
                }
            } else {
                // likely no caretRangeFromPoint support (available in Safari, but broken...)
                // let's do some manual work...
                for ( const node of ( event.target as HTMLElement )?.childNodes ) {
                    const rect = node.getBoundingClientRect();
                    if ( clientX >= rect.left && clientX <= rect.right ) {
                        el = node;
                        break;
                    }
                }
            }
            if ( el.classList.contains( "module-value" )) {
                slot = 3;
            } else if ( el.classList.contains( "module-param" )) {
                slot = 2;
            } else if ( el.classList.contains( "instrument" )) {
                slot = 1;
            }
            this.setSelectedSlot( slot );
        },
        /**
         * maintain a cache for step slots within a single pattern container
         * this is a little more work for us, but prevents repeated DOM thrashing during heavy editing
         */
        grabPatternContainerStepFromTemplate( container: HTMLElement, step: number ): HTMLElement {
            const stepElement = this.pContainerSteps[ step ] || container.querySelectorAll( "li" );
            this.pContainerSteps[ step ] = stepElement;
            return stepElement;
        },
    }
};
</script>

<style lang="scss">
@use "@/styles/_colors";
@use "@/styles/_mixins";
@use "@/styles/_variables";
@use "@/styles/typography";

$patternWidth: 150px;
$indicesWidth: 30px;
$fullPatternListWidth: ( 8 * $patternWidth ) + $indicesWidth;
$stepHeight: 32px;

.pattern-track-list-container {
    position: relative;
    overflow: auto;
    background-color: colors.$color-form-background;

    @include mixins.ideal() {
        overflow-x: hidden; // no need to show scroll
    }

    /* when the view should be following the sequencer, we disable the odd/even pattern */
    /* of the list for less eye strain (only the instructions will seem to be scrolling) */
    &.follow {
        overflow-y: hidden; // no vertical scrollbar during playback

        .pattern li {
            background-color: colors.$color-pattern-even;
            border-top-color: #000;
            border-bottom-color: colors.$color-pattern-odd;
            // the below effectively cancel out selection outlines during playback
            border-left: none;
            border-right: none;
        }
    }
}

.pattern-track-list {
    @include mixins.inlineFlex();
    background-color: colors.$color-editor-background;

    .wrapper {
        width: $fullPatternListWidth;
    }

    .indices, .pattern {
        @include mixins.list();
        position: relative;
        display: inline-block;
    }

    @include mixins.ideal() {
        width: $fullPatternListWidth !important;
    }

    @include mixins.mobile() {
        padding-left: (variables.$spacing-large + variables.$spacing-medium); /* to make up for fixed position pattern editor */
    }
}

.indices {
    width: $indicesWidth;

    &.fixed {
        vertical-align: top;
    }
}

.index {
    @include typography.titleFont();
    display: block;
    font-weight: bold;
    text-align: center;
    border-top: 2px solid #000;
    padding: variables.$spacing-xsmall 0;
    border-bottom: 2px solid #323234;
    height: $stepHeight;
    @include mixins.noEvents();
    @include mixins.noSelect();
    @include mixins.boxSize();

    &.active {
        color: #FFF;
    }

    &.next {
        color: #666;
    }
}

.pattern {
    width: $patternWidth;
    background-color: colors.$color-pattern-even;

    &:before {
        position: absolute;
        content: "";
        border-right: 1px solid #000;
        height: 100%;
        top: 0;
        right: 0;
    }

    &:last-of-type:before {
        border: none;
    }

    &:nth-child(2) {
        .note, .module-value {
            color: colors.$color-instrument-1;
        }
    }

    &:nth-child(3) {
        .note, .module-value {
            color: colors.$color-instrument-2;
        }
    }

    &:nth-child(4) {
        .note, .module-value {
            color: colors.$color-instrument-3;
        }
    }

    &:nth-child(5) {
        .note, .module-value {
            color: colors.$color-instrument-4;
        }
    }

    &:nth-child(6) {
        .note, .module-value {
            color: colors.$color-instrument-5;
        }
    }

    &:nth-child(7) {
        .note, .module-value {
            color: colors.$color-instrument-6;
        }
    }

    &:nth-child(8) {
        .note, .module-value {
            color: colors.$color-instrument-7;
        }
    }
}

.pattern-row {
    display: block;
    cursor: pointer;
    border-top: 2px solid #000;
    border-bottom: 2px solid #000;
    font-weight: bold;
    height: $stepHeight;
    @include mixins.boxSize();
    //@include mixins.animate(background-color, 0.75s); /* animated background highlight during playback */

    span.empty {
        @include mixins.animate(color, 0.25s); /* animated text highlight during playback */
    }

    &.playing {
        //transition: none;
        background-color: rgba(255,255,255,.15) !important;
        span {
            color: #000 !important;
            background-color: colors.$color-5;
            transition: none;
        }
    }

    &:nth-child(odd) {
        background-color: colors.$color-pattern-odd;
        border-color: colors.$color-pattern-odd;
    }

    &.spacer {
        background-color: colors.$color-pattern-even;
        border-color: #000;
        border-top: transparent;
    }

    &.active, &:hover {
        border: 2px solid colors.$color-1;
        z-index: 1;
    }

    &.selected {
        transition: none;
        background-color: colors.$color-2;
        border-color: colors.$color-2;
        color: #000 !important;

        span {
            color: #000 !important;
            transition: none;
        }
    }

    span {
        display: inline-block;
        padding: variables.$spacing-xsmall;
        white-space: nowrap;
        @include mixins.boxSize();
        @include mixins.noEvents();

        &.active {
            background-color: colors.$color-1;
            color: #000 !important;
        }

        &.full {
            width: 100%;
        }

        &.note {
            width: 33%;
            text-transform: uppercase;
            text-align: right;
            color: colors.$color-instrument-8;

            &.empty {
                color: #b6b6b6;
            }
        }

        &.instrument {
            width: 10%;
            color: #FFF;
        }

        &.module-param,
        &.module-value {
            width: 30%;
            color: #999;
            text-align: center;

            &.empty {
                color: #666;
            }
        }

        &.module-value {
            width: 26%;
            color: colors.$color-instrument-8;
        }
    }
}
</style>
