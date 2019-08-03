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
    <section id="transportSection">
        <div id="transportControls">
            <ul>
                <li id="playBTN"
                    :class="[ isPlaying ? 'icon-stop' : 'icon-play' ]"
                    @click="setPlaying(!isPlaying)"
                ></li>
                <li id="loopBTN" class="icon-loop"
                    :class="{ active: isLooping }"
                    @click="setLooping(!isLooping)"
                ></li>
                <li id="recordBTN"
                    :class="[{ disabled: !canRecord }, isRecording ? 'active' : '' ]"
                    @click="setRecording(!isRecording)"
                ></li>
                <li class="icon-metronome"
                    :class="{ active: isMetronomeEnabled }"
                    @click="setMetronomeEnabled(!isMetronomeEnabled)"
                ></li>
                <li class="icon-settings"
                    @click="handleSettingsToggle"
                ></li>
                <li class="section-divider"><!-- x --></li>
                <li id="patternBack"
                    @click="gotoPreviousPattern()"
                >&lt;&lt;</li>
                <li id="currentPattern">
                    <input class="current"
                           v-model="currentPatternValue"
                           maxlength="3"
                           @focus="suspendKeyboardService(true)"
                           @blur="suspendKeyboardService(false)"
                    />
                    <span class="divider">/</span>
                    <span class="total">{{ activeSong.patterns.length.toString() }}</span>
                </li>
                <li id="patternNext" @click="gotoNextPattern(activeSong)">&gt;&gt;</li>
            </ul>
            <ul id="tempoControl" class="wrapper input range">
                <li class="section-divider"><!-- x --></li>
                <li>
                    <label for="songTempo">Tempo</label>
                    <input type="range"
                           id="songTempo"
                           name="tempo"
                           v-model="tempo"
                           min="40" max="300" step="0.1"
                    />
                    <span class="value">{{ tempo }} BPM</span>
                </li>
            </ul>
        </div>
    </section>
</template>

<script>
import Vue from 'vue';
import { mapState, mapGetters, mapMutations } from 'vuex';

import Config       from '../config';
import AudioUtil    from '../utils/audio-util';
import AudioService from '../services/audio-service';
import EventUtil    from '../utils/event-util';
import SongUtil     from '../utils/song-util';
import Messages     from '../definitions/Messages';
import AudioFactory from '../model/factory/audio-factory';
import Bowser       from 'bowser';
import Pubsub       from 'pubsub-js';

export default {
    computed: {
        ...mapState({
            activeSong: state => state.song.activeSong,
            activePattern: state => state.sequencer.activePattern,
            midiConnected: state => state.midi.midiConnected,
        }),
        ...mapGetters([
            'isPlaying',
            'isLooping',
            'isRecording',
            'isMetronomeEnabled',
            'amountOfSteps',
        ]),
        canRecord() {
            // for desktop/laptop devices we enable record mode (for keyboard input)
            // if a MIDI device is connected on a mobile device, it is enabled as well
            const hasKeyboard = !Bowser.ios && !Bowser.android;
            return hasKeyboard || this.midiConnected;
        },
        tempo: {
            get() {
                return this.activeSong.meta.tempo;
            },
            set(value) {
                this.setTempo(value);
            }
        },
        currentPatternValue: {
            get() {
                return `${this.activePattern + 1}`;
            },
            set(patternValue) {
                let value = Math.min( parseInt( patternValue, 10 ), this.activeSong.patterns.length );

                if ( isNaN( value ))
                    value = this.activePattern;
                else
                    --value; // normalize to Array indices (0 == first, not 1)

                if ( value !== this.activePattern ) {
                    this.setActivePattern(value);
                }
            }
        },
    },
    watch: {
        isPlaying(playing) {
            AudioService.togglePlayback(playing, this.activeSong);
            if (playing) {
                this.setPosition({ activeSong: this.activeSong, pattern: this.activePattern });
            } else {
                if (this.isRecording) {
                    this.setRecording(false);
                }
                SongUtil.resetPlayState(this.activeSong.patterns); // unset playing state of existing events
            }
        },
        isRecording(recording, wasRecording) {
            this.setRecordingInput(recording);
            if ( wasRecording ) {
                // unflag the recorded state of all the events
                const patterns = this.activeSong.patterns;
                let event, i;

                patterns.forEach(pattern => {
                    pattern.channels.forEach(events => {
                        i = events.length;
                        while ( i-- ) {
                            event = events[ i ];
                            if ( event )
                                Vue.set(event, 'recording', false);
                        }
                    });
                });
            }
        },
        activePattern: {
            immediate: true,
            handler(value) {
                const newSteps = this.activeSong.patterns[value].steps;
                if (this.amountOfSteps !== newSteps) {
                    this.setPatternSteps({ pattern: this.activeSong.patterns[this.activePattern], steps: newSteps });
                }
            }
        },
    },
    methods: {
        ...mapMutations([
            'setPlaying',
            'setPosition',
            'setLooping',
            'setRecording',
            'setRecordingInput',    // TODO: why track this in both sequencer and editor modules??
            'setCurrentStep',
            'setCurrentMeasure',
            'setMetronomeEnabled',
            'setTempo',
            'setActivePattern',
            'setPatternSteps',
            'suspendKeyboardService',
            'gotoPreviousPattern',
            'gotoNextPattern',
        ]),
        handleSettingsToggle(e) {
            const body     = window.document.body,
                  cssClass = "settings-mode",
                  enabled  = !body.classList.contains( cssClass );

            if ( enabled )
                e.target.classList.add( "active" );
            else
                e.target.classList.remove( "active" );

            body.classList.toggle( cssClass );
        },
    }
};
</script>

<style lang="scss" scoped>
    @import '@/styles/_variables.scss';

    /* generated font for all transporter icons */

    @font-face {
      font-family: 'transporter';
      src: url('../assets/fonts/transporter.eot');
      src: url('../assets/fonts/transporter.eot#iefix') format('embedded-opentype'),
           url('../assets/fonts/transporter.woff') format('woff'),
           url('../assets/fonts/transporter.ttf') format('truetype'),
           url('../assets/fonts/transporter.svg#transporter') format('svg');
      font-weight: normal;
      font-style: normal;
    }

    $transport-height: 42px; /* height + border bottom */

    #transportSection {
      background-color: #393b40;
    }

    #transportControls {
      font-family: Montserrat, Helvetica, Verdana, sans-serif;
      padding: 0;
      border: none;
      border-radius: 0;
      margin: 0 auto;
      min-width: 100%;
      max-width: $ideal-width;

      ul {
        list-style-type: none;

        li {
          display: inline;
          padding: .5em 0 .5em .5em;
          font-weight: bold;
          cursor: pointer;

          /* loop button */
          &#loopBTN {
            padding-left: 0;
          }

          /* record button */
          &#recordBTN {
            background-color: #d00e57;
            padding: 0 .65em;
            border-radius: 50%;
            margin-left: .75em;

            &.active {
              background-color: #FFF;
            }

            &.disabled {
              display: none;
            }
          }

          /* measure indicator */
          &#currentPattern {
            display: inline-flex;
            width: 95px;
            color: #FFF;

            span {
              flex-grow: 1;
              margin-top: 2px;
            }

            .current {
              width: 28px; /* fits "333" */
              height: 15px;
              border: 1px solid #999;
              font-weight: bold;
              margin-right: .5em;
              color: #FFF;
              background-color: transparent;
              text-align: center;
            }

            .total {
              background-color: #333;
              text-align: center;
              padding: 0 .5em;
            }
          }

          /* pattern jump buttons */
          &#patternNext {
            padding-left: 0;
          }

          &.icon-metronome {
            padding: 0 0 0 .5em;

            &.active {
              color: #FFF;
            }
          }

          &.icon-settings {
            display: none; /* mobile only (see below) */
          }

          &.icon-settings {
            padding: 0 .25em;
          }

          &.enabled {
            color: red;
          }
        }
      }

      /* tempo control */

      #tempoControl {
        padding: .5em 0 0 .5em;
        display: inline;

        label {
          margin-right: 1em;
          display: inline-block;
        }

        input {
          display: inline-block;
          margin: 0 .5em 0 0;
          vertical-align: middle;
        }

        .value {
          display: inline-block;
          font-weight: bold;
          font-style: italic;
          font-size: 90%;
        }
      }

      #songTempo {
        width: 150px;
      }

      /* icons */

      [class^="icon-"]:before,
      [class*=" icon-"]:before
      {
        font-family: "transporter";
        font-style: normal;
        font-weight: normal;
        speak: none;

        display: inline-block;
        text-decoration: inherit;
        width: 1em;
        margin-right: .2em;
        text-align: center;
        /* opacity: .8; */

        /* For safety - reset parent styles, that can break glyph codes*/
        font-variant: normal;
        text-transform: none;

        /* fix buttons height, for twitter bootstrap */
        line-height: 1em;

        /* Animation center compensation - margins should be symmetric */
        /* remove if not needed */
        margin-left: .2em;

        /* you can be more comfortable with increased icons size */
        /* font-size: 120%; */

        /* Uncomment for 3D effect */
        /* text-shadow: 1px 1px 1px rgba(127, 127, 127, 0.3); */
      }

      .icon-loop:before { content: '\e800'; } /* '' */
      .icon-metronome:before { content: '\e801'; } /* '' */
      .icon-play:before { content: '\e802'; } /* '' */
      .icon-settings:before { content: '\e803'; } /* '' */
      .icon-stop:before { content: '\e804'; } /* '' */

      [class^="icon-"].active {
        color: #FFF;
      }
    }

    /* ideal view */

    @media screen and ( min-width: $ideal-width ) {
      #transportControls {
        min-width: auto;
      }
    }

    /* everything above median  app size */

    @media screen and ( min-width: $app-width ) {
      #transportControls
      {
        /* divides sections of the list */

        .section-divider {
          padding: 0 .5em;

          &:before {
            position: absolute;
            z-index: 1;
            content: "";
            border-left: 1px solid #666;
            height: $transport-height;
          }
        }
      }
    }

    /* mobile view */

    @media screen and ( max-width: $mobile-width ) {
      #transportControls {
        background-color: inherit;

        label {
          display: none !important;
        }
        #currentPattern {
          width: auto;
        }
        #tempoControl {
          display: none;
        }
        ul li.icon-settings {
          display: inline;
        }
      }
    }
</style>
