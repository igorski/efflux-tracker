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
    <section class="pattern-track-list">
        <div ref="container"
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
                <ul class="indices">
                    <li v-for="step in amountOfSteps"
                        :key="`index_${step}`"
                    >{{ step }}</li>
                </ul>
                <ul v-for="(channel, channelIndex) in activeSongPattern.channels"
                    :key="`channel_${channelIndex}`"
                    class="pattern"
                    ref="pattern"
                >
                    <li v-for="(event, stepIndex) in channel"
                        :key="`channel_${channelIndex}_${stepIndex}`"
                        :class="{
                            active: stepIndex === selectedStep && channelIndex === selectedInstrument,
                            selected: isStepSelected(channelIndex, stepIndex),
                            playing: stepIndex === playingStep
                        }"
                    >
                        <!-- note instruction -->
                        <template v-if="event.action">
                            <template v-if="event.note">
                                <!-- note on event -->
                                <span v-if="event.note"
                                      class="note"
                                      :class="{ active: isSlotHighlighted(channelIndex, stepIndex, 0)}"
                                >
                                    {{ event.note }} - {{ event.octave }}
                                </span>
                                <span class="instrument"
                                      :class="{ active: isSlotHighlighted(channelIndex, stepIndex, 1)}"
                                >
                                    {{ event.instrument }}
                                </span>
                            </template>
                            <template v-else>
                                <!-- note off event -->
                                <span class="note"
                                      :class="{ active: isSlotHighlighted(channelIndex, stepIndex, 0)}"
                                >//// OFF ////</span>
                                <span class="instrument"
                                      :class="{ active: isSlotHighlighted(channelIndex, stepIndex, 1)}"
                                ></span>
                            </template>
                        </template>
                        <template v-else>
                            <!-- no note event -->
                            <span class="note empty"
                                  :class="{ active: isSlotHighlighted(channelIndex, stepIndex, 0)}"
                            >----</span>
                            <span class="instrument"
                                  :class="{ active: isSlotHighlighted(channelIndex, stepIndex, 1)}"
                            >-</span>
                        </template>
                        <!-- module parameter instruction -->
                        <template v-if="event.mp">
                            <span class="moduleParam"
                                  :class="{ active: isSlotHighlighted(channelIndex, stepIndex, 2)}"
                            >
                                {{ formatModuleParam(event.mp) }}
                            </span>
                            <span class="moduleValue"
                                  :class="{ active: isSlotHighlighted(channelIndex, stepIndex, 3)}"
                            >
                                {{ formatModuleValue(event.mp) }}
                            </span>
                        </template>
                        <template v-else>
                            <template v-if="!event.action">
                                <span class="moduleParam empty"
                                      :class="{ active: isSlotHighlighted(channelIndex, stepIndex, 2)}"
                                >--</span>
                                <span class="moduleValue empty"
                                      :class="{ active: isSlotHighlighted(channelIndex, stepIndex, 3)}"
                                >--</span>
                            </template>
                            <template v-else-if="event.note">
                                <span class="moduleParam empty"
                                      :class="{ active: isSlotHighlighted(channelIndex, stepIndex, 2)}"
                                >--</span>
                                <span class="moduleValue empty"
                                      :class="{ active: isSlotHighlighted(channelIndex, stepIndex, 3)}"
                                >--</span>
                            </template>
                        </template>
                   </li>
                </ul>
            </div>
        </div>
    </section>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex';
import KeyboardService from '../services/keyboard-service';
import ModalWindows from '../definitions/modal-windows';
import Bowser from 'bowser';

const STEP_WIDTH  = 150;
const STEP_HEIGHT = 32;

export default {
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
            'amountOfSteps',
            'hasSelection',
            'followPlayback',
            'paramFormat',
        ]),
        activeSongPattern() {
            return this.activeSong.patterns[this.activePattern];
        },
    },
    data: () => ({
        container: null,
        wrapper: null,
        lastFollowStep: 0,
        mustFollow: false,
        playingStep: 0,
        containerWidth: 0,
        containerHeight: 0,
        interactionData: { offset: 0, time: 0 },
        pContainerSteps: [], // will cache DOM elements for interation events
    }),
    watch: {
        activePattern() {
            this.clearSelection();
            this.setSelectedSlot(-1);
            this.pContainerSteps = [];
        },
        currentStep(step) {
            const diff  = this.stepPrecision / this.activeSong.patterns[this.activePattern].steps;

            if ( step % diff !== 0 )
                return;

            this.playingStep = step / diff;
            const stepY = this.playingStep * STEP_HEIGHT;

            if (this.followPlayback) {
                // following activated, ensure the list auto scrolls
                if ( stepY > this.containerHeight ) {
                    this.mustFollow = (++this.lastFollowStep % 2 ) === 1;
                    this.container.scrollTop = (stepY + STEP_HEIGHT * 2) - this.containerHeight;
                } else {
                    this.container.scrollTop = 0;
                    this.lastFollowStep = 0;
                }
            }
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
            'setSelectedInstrument',
            'setActivePattern',
            'setSelectedSlot',
            'setSelectedStep',
            'openModal',
            'setHelpTopic',
            'clearSelection',
            'setSelectionChannelRange',
            'setSelection',
            'addEventAtPosition',
        ]),
        cacheDimensions() {
            this.containerWidth  = this.container.offsetWidth;
            this.containerHeight = this.container.offsetHeight;
        },
        isStepSelected(channelIndex, stepIndex) {
            return this.selectedChannels[channelIndex] && this.selectedChannels[channelIndex].includes(stepIndex);
        },
        isSlotHighlighted(channelIndex, stepIndex, slotIndex) {
            return channelIndex === this.selectedInstrument && stepIndex === this.selectedStep && slotIndex === this.selectedSlot;
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
        formatModuleParam(data) {
            let out = ( data && data.glide ) ? 'G ' : '';

            if ( data && data.module ) {
                out += data.module.charAt( 0 ).toUpperCase();
                out += data.module.match(/([A-Z]?[^A-Z]*)/g)[1].charAt( 0 );
            }
            return out;
        },
        formatModuleValue(data = {}) {
            let value;
            // show parameter value in either hex or percentages
            // TODO there is a bit of code duplication with NumberUtil here...
            if ( this.paramFormat === 'pct' )
                value = Math.min( 99, parseInt( data.value, 10 )).toString();
            else {
                value = Math.round( data.value * ( 255 / 100 )).toString( 16 ).toUpperCase();
            }
            return ( value.length === 1 ) ? ` 0${value}` : ` ${value}`;
        },
        handleInteraction(event) {
            // for touch interactions, we record some data as soon as touch starts so we can evaluate it on end
            if (event.type === 'touchstart' ) {
                this.interactionData.offset = window.scrollY;
                this.interactionData.time   = Date.now();
                return;
            }
            if (event.target.nodeName === 'LI')
                this.handleSlotClick(event);

            this.setHelpTopic('tracker');
        },
        /**
         * handle the event when the user clicks/taps a slot within the pattern
         * WHY are we doing difficult manual calculations ? The easiest thing would be to
         * add the listener directly on the slots themselves, but consider the excessive
         * amount of event listeners that would be attached to a large amount of DOM elements...
         */
        handleSlotClick(event) {
            const pContainers = this.$refs.pattern;
            const shiftDown = KeyboardService.hasShift();
            let selectionChannelStart = this.selectedInstrument,
                selectionStepStart    = this.selectedStep;
            let found = false;

            if (this.hasSelection) {
                selectionChannelStart = this.firstSelectedChannel;
                selectionStepStart    = this.minSelectedStep;
            }

            for ( let i = 0, l = pContainers.length; i < l; ++i ) {
                if ( found ) break;

                const pContainer = pContainers[ i ];
                const items = this.grabPatternContainerStepFromTemplate(pContainer, i);

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
                        else
                            this.clearSelection();

                        this.setSelectedStep(j);
                        this.setSelectedSlot(-1);

                        // when using a mouse, select the clicked slot. on touch screens there is no benefit in slot selection
                        if (!shiftDown && event.type === 'mousedown')
                            this.selectSlotWithinClickedStep(event);

                        if (event.type === 'dblclick') {
                            event.preventDefault();
                            this.openModal(ModalWindows.NOTE_ENTRY_EDITOR);
                            found = true;
                        }
                        break;
                    }
                }
            }
        },
        selectSlotWithinClickedStep(event) {
            // only when supported, and even then not on Safari... =/
            if ( !( 'caretRangeFromPoint' in document ) || Bowser.safari )
                return;
        
            const el = document.caretRangeFromPoint(event.clientX, event.clientY);
            let slot = 0;
        
            if ( el && el.startContainer ) {
                let startContainer = el.startContainer;
                if ( !( startContainer instanceof Element && startContainer.parentElement instanceof Element ))
                    startContainer = startContainer.parentElement;
        
                if (startContainer.classList.contains('moduleValue'))
                    slot = 3;
                else if (startContainer.classList.contains('moduleParam'))
                    slot = 2;
                else if (startContainer.classList.contains('instrument'))
                    slot = 1;
            }
            this.setSelectedSlot(slot);
        },
        /**
         * maintain a cache for step slots within a single pattern container
         * this is a little more work for us, but prevents repeated DOM thrashing during heavy editing
         */
        grabPatternContainerStepFromTemplate(container, step) {
            const stepElement = this.pContainerSteps[step] || container.querySelectorAll('li');
            this.pContainerSteps[step] = stepElement;
            return stepElement;
        },
    }
};
</script>

<style lang="scss">
    @import '@/styles/_variables.scss';

    $patternWidth: 150px;
    $indicesWidth: 30px;
    $fullPatternListWidth: (( 8 * $patternWidth ) + $indicesWidth );
    $stepHeight: 32px;

    .pattern-track-list-container {
      position: relative;
      overflow: auto;
      background-color: #101015;
    }

    .pattern-track-list {
      @include inlineFlex();
      background-color: #393b40;

      .wrapper {
        width: $fullPatternListWidth;
      }

      .indices, .pattern {
        position: relative;
        float: left;
        list-style-type: none;
        margin: 0;
        padding: 0;
      }

      .indices {
        width: $indicesWidth;

        li {
          display: block;
          font-family: Montserrat, Helvetica, Verdana, sans-serif;
          font-weight: bold;
          text-align: center;
          border-top: 2px solid #000;
          padding: $spacing-small 0;
          border-bottom: 2px solid #323234;
          height: $stepHeight;
          @include noEvents();
          @include noSelect();
          @include boxSize();

          &.active {
            color: #FFF;
          }
        }
      }

      .pattern {
        width: $patternWidth;
        background-color: #101015;

        &:before {
          position: absolute;
          content: "";
          border-right: 1px solid #000;
          height: 100%;
          top: 0;
          right: 0;
        }

        &:last-of-type {
          &:before {
            border: none;
          }
        }

        &:nth-child(2) li .note,
        &:nth-child(2) li .moduleValue {
          color: #b25050;
        }

        &:nth-child(3) li .note,
        &:nth-child(3) li .moduleValue {
          color: #b28050;
        }

        &:nth-child(4) li .note,
        &:nth-child(4) li .moduleValue {
          color: #a9b250;
        }

        &:nth-child(5) li .note,
        &:nth-child(5) li .moduleValue {
          color: #60b250;
        }

        &:nth-child(6) li .note,
        &:nth-child(6) li .moduleValue {
          color: #50b292;
        }

        &:nth-child(7) li .note,
        &:nth-child(7) li .moduleValue {
          color: #5071b2;
        }

        &:nth-child(8) li .note,
        &:nth-child(8) li .moduleValue {
          color: #8850b2;
        }

        li {
          display: block;
          cursor: pointer;
          border-top: 2px solid #000;
          border-bottom: 2px solid #000;
          font-weight: bold;
          height: $stepHeight;
          @include boxSize();
          @include animate(background-color, .75s); /* animated background highlight during playback */

          span {
            @include animate(color, .1s); /* animated text highlight during playback */
          }

          &.playing {
            transition: none;
            background-color: rgba(255,255,255,.15) !important;
            span {
              color: #FFF !important;
              transition: none;
            }
          }

          &:nth-child(odd) {
            background-color: #323234;
            border-color: #323234;
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

            &.note {
              width: 33%;
              text-transform: uppercase;
              text-align: right;
              color: $color-5;

              &.empty {
                color: #b6b6b6;
              }
            }

            &.instrument {
              width: 10%;
              color: #FFF;
            }

            &.moduleParam,
            &.moduleValue {
              width: 30%;
              color: #999;
              text-align: center;

              &.empty {
                color: #666;
              }
            }

            &.moduleValue {
              width: 19%;
              color: $color-5;
            }
          }
        }
      }
    }

    .pattern-track-list-container {
      /* when the view should be following the sequencer we switch the odd/even pattern */
      /* of the list for less eye strain (only the instructions will seem to be scrolling) */
      &.follow {
        .pattern li {
          &:nth-child(even) {
            background-color: #323234;
            border-color: #323234;
          }
          &:nth-child(odd) {
            background-color: transparent;
            border-color: transparent;
          }
        }
      }
    }

    /* ideal view */

    @media screen and ( min-width: $ideal-width ) {
      .pattern-track-list-container {
        overflow-x: hidden; // no need to show scroll
      }
      .pattern-track-list {
        width: $fullPatternListWidth !important;
      }
    }

    /* phone view */

    @media screen and ( max-width: $mobile-width ) {
      .pattern-track-list {
        padding-left: ($spacing-large + $spacing-medium); /* to make up for fixed position pattern editor */
      }
    }
</style>
 