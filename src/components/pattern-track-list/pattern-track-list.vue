/**
* The MIT License (MIT)
*
* Igor Zinken 2016-2022 - https://www.igorski.nl
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
                    :style="{ 'padding-top': `${mustFollow ? indicesTop : 0}px` }"
                >
                    <li
                        v-for="(step, index) in amountOfSteps"
                        :key="`index_${index}`"
                        class="index"
                    >{{ index }}</li>
                </ul>
                <ul
                    v-for="(channel, channelIndex) in activeSongPattern.channels"
                    :key="`channel_${channelIndex}`"
                    class="pattern"
                    ref="pattern"
                >
                    <template v-if="mustFollow">
                        <!-- to keep playback center based, while playing in follow mode, pad list top -->
                        <pattern-event
                            v-for="(event, stepIndex) in previousPatternChannels[ channelIndex ]"
                            :key="`prevchannel_${channelIndex}_${stepIndex}`"
                            :event="event"
                            :selected-slot="stepIndex === selectedStep && channelIndex === selectedInstrument ? selectedSlot : -1"
                            :formatted-param="formatModuleParam( event.mp )"
                            class="pattern-row"
                            :class="{ spacer: activePattern === 1 }"
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
                            :class="{ spacer: activePattern === activeSong.patterns.length - 1 }"
                        />
                    </template>
                </ul>
            </div>
        </div>
    </section>
</template>

<script>
import { mapState, mapGetters, mapMutations } from "vuex";
import PatternEvent from "./pattern-event";
import KeyboardService from "@/services/keyboard-service";

const STEP_WIDTH  = 150;
const STEP_HEIGHT = 32;
const MAX_PADDING = 8; // min top padding when followPlayback is active on high resolutions
const DOUBLE_STEP_HEIGHT = STEP_HEIGHT * 2;
let BOTTOM_PADDINGS = [];

export default {
    components: { PatternEvent },
    computed: {
        ...mapState({
            activeSong: state => state.song.activeSong,
            activePattern: state => state.sequencer.activePattern,
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
            "amountOfSteps",
            "hasSelection",
            "followPlayback",
            "paramFormat",
            "isPlaying"
        ]),
        activeSongPattern() {
            return this.activeSong.patterns[ this.activePattern ];
        },
        previousPatternChannels() {
            if ( !this.mustFollow ) {
                return null;
            }
            const prevPattern = this.activePattern - 1;
            const prevIndex = prevPattern < 0 ? this.activeSong.patterns.length - 1 : prevPattern;
            return this.activeSong.patterns[ prevIndex ].channels.map( channel => {
                return channel.slice(( channel.length - 1 ) - this.topPaddings );
            });
        },
        nextPatternChannels() {
            if ( !this.mustFollow ) {
                return null;
            }
            const amountOfPatterns = this.activeSong.patterns.length;
            const nextPattern = this.activePattern + 1;
            // also provide lookahead for the pattern(s) coming after the next one for a seamless scrolling list
            const nextIndex = nextPattern >= amountOfPatterns ? 0 : nextPattern;
            let nextNextIndex = nextIndex;

            // the amount of events we require to visualize the next pattern(s) for the current resolution
            let sliceAmount = this.visibleSteps - this.topPaddings;
            return this.activeSong.patterns[ nextIndex ].channels.map(( channelEvents, channelIndex ) => {
                const out = [ ...channelEvents ];
                while ( out.length < sliceAmount ) {
                    if ( ++nextNextIndex >= amountOfPatterns ) {
                        nextNextIndex = 0;
                    }
                    let nextChannelEvents = BOTTOM_PADDINGS;
                    if ( nextNextIndex !== 0 ) {
                        nextChannelEvents = this.activeSong.patterns[ nextNextIndex ].channels[ channelIndex ];
                    }
                    out.push( ...nextChannelEvents );
                }
                return out.slice( 0, sliceAmount );
            });
        },
        mustFollow() {
            return this.followPlayback && this.isPlaying;
        },
    },
    data: () => ({
        container: null,
        wrapper: null,
        playingStep: 0,
        containerWidth: 0,
        containerHeight: 0,
        interactionData: { offset: 0, time: 0 },
        pContainerSteps: [], // will cache DOM elements for interation events
        topPaddings: 0,
        bottomPaddings: 0,
        indicesTop: 0,
    }),
    watch: {
        activePattern() {
            this.clearSelection();
            this.setSelectedSlot( -1 );
            this.pContainerSteps = [];
        },
        currentStep( step ) {
            const stepsInPattern = this.activeSongPattern.steps;
            const diff = this.stepPrecision / stepsInPattern;

            this.playingStep = Math.floor( step / diff ) % stepsInPattern;

            if ( this.mustFollow ) {
                // following activated, ensure the list auto scrolls
                this.$refs.container.scrollTop = ( this.playingStep * STEP_HEIGHT ) + DOUBLE_STEP_HEIGHT;
            }
            this.indicesTop = this.topPaddings * STEP_HEIGHT;
        },
        windowSize() {
            this.cacheDimensions();
        },
        selectedStep() { this.focusActiveStep() },
        selectedSlot() { this.focusActiveStep() },
    },
    mounted() {
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
        cacheDimensions() {
            this.containerWidth = this.container.offsetWidth;
            this.containerHeight = this.container.offsetHeight;

            // the amount of events we can fit vertically on the screen
            this.visibleSteps = Math.ceil( this.containerHeight / STEP_HEIGHT );

            const padding = Math.round(( this.containerHeight / 2 ) / STEP_HEIGHT ) + 1;
            this.topPaddings = Math.min( MAX_PADDING, padding );
            this.bottomPaddings = this.visibleSteps - this.topPaddings;

            if ( BOTTOM_PADDINGS.length !== this.bottomPaddings ) {
                BOTTOM_PADDINGS = new Array( this.bottomPaddings ).fill( 0 );
            }
        },
        isStepSelected( channelIndex, stepIndex ) {
            return this.selectedChannels[ channelIndex ]?.includes( stepIndex );
        },
        /**
         * ensure the currently active step (after a keyboard navigation)
         * is visible on screen
         */
        focusActiveStep() {
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
        formatModuleParam( eventMpData ) {
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
        handleInteraction( event ) {
            // for touch interactions, we record some data as soon as touch starts so we can evaluate it on end
            if ( event.type === "touchstart" ) {
                this.interactionData.offset = window.scrollY;
                this.interactionData.time   = Date.now();
                return;
            }
            // check if we interacted with a <pattern-event />
            if ( event.target.nodeName === "LI" ) {
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
        handleSlotClick( event ) {
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
        selectSlotWithinClickedStep( event ) {
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
                for ( const node of event.target.childNodes ) {
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
        grabPatternContainerStepFromTemplate( container, step ) {
            const stepElement = this.pContainerSteps[ step ] || container.querySelectorAll( "li" );
            this.pContainerSteps[ step ] = stepElement;
            return stepElement;
        },
    }
};
</script>

<style lang="scss">
@import "@/styles/_mixins";

$patternWidth: 150px;
$indicesWidth: 30px;
$fullPatternListWidth: ( 8 * $patternWidth ) + $indicesWidth;
$stepHeight: 32px;

.pattern-track-list-container {
    position: relative;
    overflow: auto;
    background-color: #101015;

    @include ideal() {
        overflow-x: hidden; // no need to show scroll
    }

    /* when the view should be following the sequencer, we disable the odd/even pattern */
    /* of the list for less eye strain (only the instructions will seem to be scrolling) */
    &.follow {
        .pattern li {
            background-color: $color-pattern-even;
            border-top-color: #000;
            border-bottom-color: $color-pattern-odd;
        }
    }
}

.pattern-track-list {
    @include inlineFlex();
    background-color: $color-editor-background;

    .wrapper {
        width: $fullPatternListWidth;
    }

    .indices, .pattern {
        @include list();
        position: relative;
        display: inline-block;
    }

    @include ideal() {
        width: $fullPatternListWidth !important;
    }

    @include mobile() {
        padding-left: ($spacing-large + $spacing-medium); /* to make up for fixed position pattern editor */
    }
}

.indices {
    width: $indicesWidth;

    &.fixed {
        vertical-align: top;
    }
}

.index {
    @include titleFont();
    display: block;
    font-weight: bold;
    text-align: center;
    border-top: 2px solid #000;
    padding: $spacing-xsmall 0;
    border-bottom: 2px solid #323234;
    height: $stepHeight;
    @include noEvents();
    @include noSelect();
    @include boxSize();

    &.active {
        color: #FFF;
    }
}

.pattern {
    width: $patternWidth;
    background-color: $color-pattern-even;

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
            color: $color-instrument-1;
        }
    }

    &:nth-child(3) {
        .note, .module-value {
            color: $color-instrument-2;
        }
    }

    &:nth-child(4) {
        .note, .module-value {
            color: $color-instrument-3;
        }
    }

    &:nth-child(5) {
        .note, .module-value {
            color: $color-instrument-4;
        }
    }

    &:nth-child(6) {
        .note, .module-value {
            color: $color-instrument-5;
        }
    }

    &:nth-child(7) {
        .note, .module-value {
            color: $color-instrument-6;
        }
    }

    &:nth-child(8) {
        .note, .module-value {
            color: $color-instrument-7;
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
    @include boxSize();
    //@include animate(background-color, 0.75s); /* animated background highlight during playback */

    span.empty {
        @include animate(color, 0.25s); /* animated text highlight during playback */
    }

    &.playing {
        //transition: none;
        background-color: rgba(255,255,255,.15) !important;
        span {
            color: #000 !important;
            background-color: $color-5;
            transition: none;
        }
    }

    &:nth-child(odd) {
        background-color: $color-pattern-odd;
        border-color: $color-pattern-odd;
    }

    &.spacer {
        background-color: $color-pattern-even;
        border-color: #000;
        border-top: transparent;
    }

    &.active, &:hover {
        border: 2px solid $color-1;
        z-index: 10;
    }

    &.selected {
        transition: none;
        background-color: $color-2;
        border-color: $color-2;
        color: #000 !important;

        span {
            color: #000 !important;
            transition: none;
        }
    }

    span {
        display: inline-block;
        padding: $spacing-xsmall;
        white-space: nowrap;
        @include boxSize();
        @include noEvents();

        &.active {
            background-color: $color-1;
            color: #000 !important;
        }

        &.full {
            width: 100%;
        }

        &.note {
            width: 33%;
            text-transform: uppercase;
            text-align: right;
            color: $color-instrument-8;

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
            color: $color-instrument-8;
        }
    }
}
</style>
