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
    <div>
        <div id="noteEntry">
            <div class="header">
                <button class="help-button">?</button>
                <button class="close-button">x</button>
            </div>
            <h4>Note entry editor</h4>
            <ul id="keyboardNotes">
                <li data-value="C"  class="C"></li>
                <li data-value="C#" class="CS sharp"></li>
                <li data-value="D"  class="D"></li>
                <li data-value="D#" class="DS sharp"></li>
                <li data-value="E"  class="E"></li>
                <li data-value="F"  class="F"></li>
                <li data-value="F#" class="FS sharp"></li>
                <li data-value="G"  class="G"></li>
                <li data-value="G#" class="GS sharp"></li>
                <li data-value="A"  class="A"></li>
                <li data-value="A#" class="AS sharp"></li>
                <li data-value="B"  class="B"></li>
            </ul>
            <ul id="octaves">
                <li data-value="1">1</li>
                <li data-value="2">2</li>
                <li data-value="3">3</li>
                <li data-value="4">4</li>
                <li data-value="5">5</li>
                <li data-value="6">6</li>
                <li data-value="7">7</li>
                <li data-value="8">8</li>
            </ul>
            <select id="instrument">
                <option value="0">Instrument 0</option>
                <option value="1">Instrument 1</option>
                <option value="2">Instrument 2</option>
                <option value="3">Instrument 3</option>
                <option value="4">Instrument 4</option>
                <option value="5">Instrument 5</option>
                <option value="6">Instrument 6</option>
                <option value="7">Instrument 7</option>
            </select>
            <p>
                For fast editing: use the keyboard to type a note name and
                octave number for easy pitch selection. Hit enter to confirm.
            </p>
            <button class="confirm-button">OK</button>
        </div>
    </div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex';

import EventUtil      from '../utils/EventUtil';
import EventFactory   from '../model/factory/EventFactory';
import EventValidator from '../model/validators/EventValidator';
import Manual         from '../definitions/Manual';
import Messages       from '../definitions/Messages';
import Pitch          from '../definitions/Pitch';
import Pubsub         from 'pubsub-js';

export default {
    created() {
        // restore interest in keyboard controller events
        keyboardController.setListener( PatternTrackListController );
    },
    methods: {
        handleOpen(){
            const editorModel  = efflux.EditorModel,
                  patternIndex = editorModel.activePattern,
                  pattern      = efflux.activeSong.patterns[ patternIndex ],
                  channelIndex = editorModel.activeInstrument,
                  channel      = pattern.channels[ channelIndex ],
                  event        = channel[ editorModel.activeStep ];

            // by default take the previously declared events instrument as the target instrument for the new event
            // otherwise take the active instrument as the target instrument

            const previousEvent = EventUtil.getFirstEventBeforeStep( channel, editorModel.activeStep, ( previousEvent ) => {
                // ignore off events as they do not specify an instrument
                return previousEvent.action !== 2;
            });
            const defaultInstrument = ( previousEvent ) ? previousEvent.instrument : editorModel.activeInstrument;

            data =
            {
                instrument   : ( event ) ? event.instrument : defaultInstrument,
                note         : ( event ) ? event.note       : "C",
                octave       : ( event ) ? event.octave     : 3,
                patternIndex : ( event ) ? event.seq.startMeasure : patternIndex,
                channelIndex : channelIndex, // always use channel index (event instrument might be associated w/ different channel lane)
                step         : editorModel.activeStep
            };

            Pubsub.publishSync( Messages.CLOSE_OVERLAYS, NoteEntryController ); // close open overlays
            Pubsub.publish( Messages.SHOW_BLIND );

            closeCallback = completeCallback;

            keyboardController.setBlockDefaults( false );
            keyboardController.setListener( NoteEntryController );

            setSelectedValueInList( noteList,   data.note );
            setSelectedValueInList( octaveList, data.octave );

            selectedNote   = data.note;
            selectedOctave = data.octave;

            Form.setSelectedOption( instrumentSelect, data.instrument );
        },
        handleClose() {
            this.setOverlay(null);
            keyboardController.reset();
        },
    },
};
</script>

<style lang="scss" scoped>
    @import '@/styles/_variables.scss';

    #noteEntry {

      @include EditorComponent();
      @include Overlay();
      @include noSelect();
      @include boxSize();
      padding: .25em 1em;
      border-radius: 7px;
      box-shadow: 0 0 25px rgba(0,0,0,.5);

      h4 {
        margin: .75em 0;
      }

      #instrument {
        width: 120px;
      }

      #keyboardNotes {
        position: relative;
        width: 100%;
        height: 100px;
        margin-bottom: 1em;
        margin-left: 6.5%;

        li {
          display: inline-block;
          cursor: pointer;
          position: relative;
          width: 11.111%;
          height: 100%;
          background-color: #666;
          vertical-align: top;

          &.sharp {
            position: absolute;
            z-index: 100;
            width: 12.5%;
            background-color: #000;
            transform-origin: center top;
            transform: translateX( -50% ) scale( 0.6 );
          }

          &.selected, &:hover {
            background-color: #FFF;
          }

          &:after {
            position: absolute;
            bottom: 7px;
            left: 7px;
            pointer-events: none;
          }

          &.C:after {
            content: "C";
          }
          &.CS:after {
            content: "C#";
          }
          &.D:after {
            content: "D";
          }
          &.DS:after {
            content: "D#";
          }
          &.E:after {
            content: "E";
          }
          &.F:after {
            content: "F";
          }
          &.FS:after {
            content: "F#";
          }
          &.G:after {
            content: "G";
          }
          &.GS:after {
            content: "G#";
          }
          &.A:after {
            content: "A";
          }
          &.AS:after {
            content: "A#";
          }
          &.B:after {
            content: "B";
          }
        }
      }

      #octaves {
        text-transform: uppercase;
        text-indent: 7px;
        float: left;
        width: 100%;
        margin-left: 5%;

        li {
          float: left;
          border: 2px solid #666;
          padding: .5em 1em .5em .25em;
          margin: .25em;
          cursor: pointer;

          &.selected, &:hover {
            background-color: #FFF;
            color: #000;
          }
        }
      }

      #instrument {
        position: absolute;
        top: .85em;
        right: 6.25em;
      }

      .confirm-button {
        width: 100%;
        padding: .5em 1em;
      }
    }

    @media screen and ( max-width: $mobile-width )
    {
      #noteEntry {
        border-radius: 0;
      }
    }

    $width: 450px;
    $height: 350px;

    @media screen and ( min-width: $width )
    {
      #noteEntry {
        top: 50%;
        left: 50%;
        width: $width;
        height: $height;
        margin-left: -( $width / 2 );
        margin-top: -( $height / 2);
      }
    }
</style>
 