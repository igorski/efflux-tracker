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
    <section id="patternTrackList">
        <div id="patternTrackListContainer" ref="container">
            <div class="wrapper" ref="wrapper">
                <ul class="indices">
                    <li v-for="step in amountOfSteps"
                        :key="`index_${step}`"
                    >{{ step }}</li>
                </ul>
                <ul v-for="(channel, channelIndex) in activeSongPattern.channels"
                    :key="`channel_${channelIndex}`"
                    class="pattern"
                >
                    <li v-for="(event, stepIndex) in channel"
                        :key="`channel_${channelIndex}_${stepIndex}`"
                        :class="{
                            active: stepIndex === activeStep && channelIndex === activeInstrument,
                            selected: isStepSelected(channelIndex, stepIndex)
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
                                >---</span>
                                <span class="moduleValue empty"
                                      :class="{ active: isSlotHighlighted(channelIndex, stepIndex, 3)}"
                                >---</span>
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
            <div class="highlight"></div>
        </div>
    </section>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex';

export default {
    computed: {
        ...mapState({
            activeSong: state => state.song.activeSong,
            activePattern: state => state.sequencer.activePattern,
            activeInstrument: state => state.editor.activeInstrument,
            activeStep: state => state.editor.activeStep,
            activeSlot: state => state.editor.activeSlot,
            selectedChannels: state => state.selection.selectedChannels,
        }),
        ...mapGetters([
            'amountOfSteps',
        ]),
        activeSongPattern() {
            return this.activeSong.patterns[this.activePattern];
        },
    },
    data: () => ({
        container: null,
        paramFormat: null,
    }),
    watch: {
        activePattern() {
            this.clearSelection();
            this.setActiveSlot(-1);
        },
    },
    mounted() {
        this.$nextTick(() => {
            this.container = this.$refs['container'];
            this.wrapper = this.$refs['wrapper'];
        });
    },
    methods: {
        ...mapMutations([
            'setActivePattern',
            'setActiveSlot',
            'clearSelection',
            'addEventAtPosition',
        ]),
        isStepSelected(channelIndex, stepIndex) {
            return this.selectedChannels[channelIndex] && this.selectedChannels[channelIndex].includes(stepIndex);
        },
        isSlotHighlighted(channelIndex, stepIndex, slotIndex) {
            return channelIndex === this.activeInstrument && stepIndex === this.activeStep && slotIndex === this.activeSlot;
        },
        update() {
            let activePattern = this.activePattern;

            if ( activePattern >= this.activeSong.patterns.length )
                activePattern = this.activeSong.patterns.length - 1;

            // record the current scroll offset of the container so we can restore it after updating of the DOM
            const coordinates = { x: this.container.scrollLeft, y: this.container.scrollTop };
            const pattern = this.activeSong.patterns[ activePattern ];

            this.paramFormat = settingsModel.getSetting( SettingsModel.PROPERTIES.INPUT_FORMAT ) || 'hex';

            this.setActivePattern(activePattern);

            this.container.scrollLeft = coordinates.x;
            this.container.scrollTop  = coordinates.y;
        },
        formatModuleParam(data) {
            let out = ( data && data.glide ) ? 'G ' : '';

            if ( data && data.module ) {
                out += data.module.charAt( 0 ).toUpperCase();
                out += data.module.match(/([A-Z]?[^A-Z]*)/g)[1].charAt( 0 );
            }
            return out;
        },
        formatModuleValue(data) {
            let out = '', value;

            if ( data ) {

                // show parameter value in either hex or percentages
                // TODO there is a bit of code duplication with NumberUtil here...
                if ( this.paramFormat === 'pct' )
                    value = Math.min( 99, parseInt( data.value, 10 )).toString();
                else {
                    value = Math.round( data.value * ( 255 / 100 )).toString( 16 ).toUpperCase();
                }
                out += " " + (( value.length === 1 ) ? `0${value}` : value );
            }
            return out;
        },
        removeEventAtHighlightedStep() {
            this.saveState(
                StateFactory.getAction( States.DELETE_EVENT, {
                    store: this.$store,
                    addHandler: this.addEventAtPosition
                })
            );
        },
        removeModuleParamAutomationAtHighlightedStep() {
            // TODO: create shared getter function?
            const event = this.activeSong.patterns[ this.activePattern ]
                                         .channels[ editorModel.activeInstrument ][ editorModel.activeStep ];
        
            if ( !event || !event.mp )
                return;
        
            Pubsub.publishSync(
                Messages.SAVE_STATE,
                StateFactory.getAction( States.DELETE_MODULE_AUTOMATION, {
                    event:   event,
                    updateHandler: PatternTrackListController.update
                })
            );
        },
        glideParameterAutomations() {
            const patternIndex  = efflux.this.activePattern;
            const channelIndex  = efflux.EditorModel.activeInstrument;
            const channelEvents = this.activeSong.patterns[ patternIndex ].channels[ channelIndex ];
            const event         = EventUtil.getFirstEventBeforeStep(
                channelEvents, efflux.EditorModel.activeStep, ( compareEvent ) => {
                    return !!compareEvent.mp;
                });
            let createdEvents   = null;
        
            const addFn = () => {
                const eventIndex = channelEvents.indexOf( event );
                createdEvents = EventUtil.glideModuleParams(
                    this.activeSong, patternIndex, channelIndex, eventIndex, efflux.eventList
                );
                if ( createdEvents )
                    Pubsub.publish( Messages.REFRESH_PATTERN_VIEW );
            };
        
            if ( event ) {
                addFn();
            }
        
            if ( createdEvents ) {
                Pubsub.publish( Messages.SAVE_STATE, {
                    undo: () => {
                        createdEvents.forEach(( event ) => {
                            if ( event.note === "" )
                                EventUtil.clearEventByReference( this.activeSong, event, efflux.eventList );
                            else
                                event.mp = null;
                        });
                        Pubsub.publish( Messages.REFRESH_PATTERN_VIEW );
                    },
                    redo: addFn
                });
            } else
                Pubsub.publish( Messages.SHOW_ERROR, getCopy( "ERROR_PARAM_GLIDE" ));
        },
        handleInteraction( aEvent ) {
            // for touch interactions, we record some data as soon as touch starts so we can evaluate it on end
        
            if ( aEvent.type === "touchstart" ) {
                interactionData.offset = window.scrollY;
                interactionData.time   = Date.now();
                return;
            }
        
            if ( aEvent.target.nodeName === "LI" )
                View.handleSlotClick( aEvent, keyboardController, PatternTrackListController );
        
            Pubsub.publish( Messages.DISPLAY_HELP, "helpTopicTracker" );
        },
        editModuleParamsForStep() {
            Pubsub.publish( Messages.OPEN_MODULE_PARAM_PANEL, function() {
                keyboardController.setListener( PatternTrackListController ); // restore interest in keyboard controller events
            });
        },
        addOffEvent() {
            const offEvent = EventFactory.createAudioEvent();
            offEvent.action = 2; // noteOff;
            this.addEventAtPosition({ event: offEvent, store: this.$store });
        },
    }
};
</script>

<style lang="scss">
    @import '@/styles/_variables.scss';

    $patternWidth: 150px;
    $indicesWidth: 30px;
    $fullPatternListWidth: (( 8 * $patternWidth ) + $indicesWidth );

    #patternTrackListContainer
    {
      position: relative;
      overflow: auto;
      background-color: #101015;
    }

    #patternTrackList
    {
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
          padding: .25em 0;
          border-bottom: 2px solid #323234;
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
          @include boxSize();

          &:nth-child(odd) {
            background-color: #323234;
            border-color: #323234;
          }

          &.active, &:hover {
            border: 2px solid $color-1;
            z-index: 10;
          }

          &.selected {
            background-color: $color-2;
            border-color: $color-2;
            color: #000 !important;

            span {
              color: #000 !important;
            }
          }

          span {
            display: inline-block;
            padding: .25em;
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

      .highlight {
        position: absolute;
        top: 0;
        left: 0;
        width: $fullPatternListWidth;
        height: 32px;
        background-color: rgba(255,255,255,.35);
        mix-blend-mode: screen;
        @include noEvents();
      }
    }

    #patternTrackListContainer {
      // when the view should be following the sequencer we switch the odd/even pattern
      // of the list for less eye strain (only the instructions will seem to be scrolling)
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

    @media screen and ( min-width: $ideal-width )
    {
      #patternTrackListContainer {
        overflow-x: hidden; // no need to show scroll
      }
      #patternTrackList {
        width: $fullPatternListWidth !important;
      }
    }

    /* phone view */

    @media screen and ( max-width: $mobile-width )
    {
      #patternTrackList {
        padding-left: 50px; /* to make up for fixed position pattern editor */
      }
    }

</style>
 