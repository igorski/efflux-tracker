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
    <div id="moduleParamEntry">
        <div class="header">
            <button class="help-button" @click="handleHelp">?</button>
            <button class="close-button" @click="handleClose">x</button>
        </div>
        <h4>Module Parameter Change editor</h4>
        <ul id="moduleSelect">
            <ul class="event">
                <form-list-item v-model="module" option-value="volume">volume</form-list-item>
                <form-list-item v-model="module" option-value="pitchUp">pitch +8ve</form-list-item>
                <form-list-item v-model="module" option-value="pitchDown">pitch -8ve</form-list-item>
            </ul>
            <ul class="filter">
                <form-list-item v-model="module" option-value="filterEnabled">filter on/off</form-list-item>
                <form-list-item v-model="module" option-value="filterFreq">filter frequency</form-list-item>
                <form-list-item v-model="module" option-value="filterQ">filter q</form-list-item>
                <form-list-item v-model="module" option-value="filterLFOEnabled">filter LFO on/off</form-list-item>
                <form-list-item v-model="module" option-value="filterLFOSpeed">filter LFO speed</form-list-item>
                <form-list-item v-model="module" option-value="filterLFODepth">filter LFO depth</form-list-item>
            </ul>
            <ul class="delay">
                <form-list-item v-model="module" option-value="delayEnabled">delay on/off</form-list-item>
                <form-list-item v-model="module" option-value="delayTime">delay time</form-list-item>
                <form-list-item v-model="module" option-value="delayFeedback">delay feedback</form-list-item>
                <form-list-item v-model="module" option-value="delayCutoff">delay cutoff</form-list-item>
                <form-list-item v-model="module" option-value="delayOffset">delay offset</form-list-item>
            </ul>
        </ul>
        <fieldset>
            <div class="wrapper input radio">
                <h2>Glide ?</h2>
                <label for="glideTrue">On</label>
                <input type="radio"
                       v-model="glide"
                       id="glideTrue"
                       name="glide"
                       :value="true"
                />
                <label for="glideFalse">Off</label>
                <input type="radio"
                       v-model="glide"
                       id="glideFalse"
                       name="glide"
                       :value="false"
                />
            </div>
            <div class="wrapper input range">
                <label for="moduleValue">Parameter value</label>
                <input v-model.number="value"
                       type="range"
                       id="moduleValue"
                       min="0" max="100" step="1"
                />
                <div id="moduleInputValue" v-html="valueText"></div>
            </div>
            <p>
                For fast editing: use the keyboard to type a module parameter (first letter),
                use the "G" key to toggle glide on/off and type a numerical value between 0 to 99
                for its parameter value. Hit enter to confirm.
            </p>
            <button type="button"
                    class="confirm-button"
                    @click="handleSubmit"
            >OK</button>
        </fieldset>
    </div>
</template>

<script>
import { mapState, mapMutations } from 'vuex';
import FormListItem from './forms/form-list-item';
import EventFactory from '../model/factory/event-factory';
import KeyboardService from '../services/keyboard-service';
import ModuleParamHandler from '../services/keyboard/module-param-handler';
import ManualURLs from '../definitions/manual-urls';

const DEFAULT_MODULE = 'volume';
let lastValueTypeAction = 0, lastValueChar = 0;

export default {
    components: {
        FormListItem,
    },
    data: () => ({
        instrument: null,
        module: DEFAULT_MODULE,
        glide: false,
        value: 0,
        patternIndex: 0,
        channelIndex: 0,
        step: 0,
    }),
    computed: {
        ...mapState({
            activeSong: state => state.song.activeSong,
            activePattern: state => state.sequencer.activePattern,
            selectedInstrument: state => state.editor.selectedInstrument,
            selectedStep: state => state.editor.selectedStep,
        }),
        valueText() {
            const value = this.value.toFixed(2);
            return ( this.value < 10 ) ? `0${value}` : value;
        },
    },
    mounted() {
        const pattern = this.activeSong.patterns[ this.activePattern ],
              channel = pattern.channels[ this.selectedInstrument ],
              event   = channel[ this.selectedStep ];
    
        this.instrument   = ( event ) ? event.instrument : this.selectedInstrument;
        this.module       = ( event && event.mp ) ? event.mp.module  : DEFAULT_MODULE;
        this.glide        = ( event && event.mp ) ? event.mp.glide   : false;
        this.value        = ( event && event.mp ) ? event.mp.value   : 50;

        // we define these upfront as we assume that the position the sequencer had (when running) is
        // where we would like to add/edit a module parameter change event

        this.patternIndex = ( event ) ? event.seq.startMeasure : this.activePattern;
        this.channelIndex = this.selectedInstrument; // always use channel index (event instrument might be associated w/ different channel lane)
        this.step         = this.selectedStep;

        KeyboardService.setBlockDefaults(false);
        KeyboardService.setListener(this.handleKey);
    },
    beforeDestroy() {
        KeyboardService.reset();
    },
    methods: {
        ...mapMutations([
            'addEventAtPosition',
        ]),
        handleClose() {
            this.$emit('close');
        },
        /**
         * invoked by KeyboardService
         */
        handleKey(type, keyCode/*, event*/) {
            if ( type !== 'down' )
                return;

            switch (keyCode) {
                // modules and parameters

                default:
                    this.module = ModuleParamHandler.selectModuleByKeyAction(keyCode, this.module) || DEFAULT_MODULE;
                    break;

                case 27: // escape
                    this.handleClose();
                    break;
    
                case 13: // enter
                    this.handleSubmit();
                    break;
    
                case 71: // G
                    this.glide = !this.glide;
                    break;
    
                // module parameter value
    
                case 48: // 0 through 9
                case 49:
                case 50:
                case 51:
                case 52:
                case 53:
                case 54:
                case 55:
                case 56:
                case 57:
    
                    const now = Date.now();
                    const num = parseFloat( String.fromCharCode( keyCode ));
                    let value = num * 10;
    
                    // if this character was typed shortly after the previous one, combine
                    // their numerical values for more precise control
    
                    if ( now - lastValueTypeAction < 500 )
                        value = parseFloat( '' + lastValueChar + num );
    
                    this.value = value;
                    lastValueTypeAction = now;
                    lastValueChar = num;
                    break;
            }
        },
        handleSubmit() {
            const pattern = this.activeSong.patterns[ this.patternIndex ],
                  channel = pattern.channels[ this.channelIndex ];

            let event        = channel[ this.step ];
            const isNewEvent = !event;

            if ( isNewEvent )
                event = EventFactory.createAudioEvent();

            event.mp = {
                module: this.module,
                value: this.value,
                glide: this.glide
            };
            event.instrument = this.instrument;

            this.addEventAtPosition({
                event,
                store: this.$store,
                optData: {
                    patternIndex : this.patternIndex,
                    channelIndex : this.channelIndex,
                    step         : this.step,
                    newEvent     : isNewEvent
                }
            });
            this.handleClose();
        },
        handleHelp() {
            window.open( ManualURLs.PARAM_ENTRY_HELP, '_blank' );
        },
    },
};
</script>

<style lang="scss" scoped>
    @import '@/styles/_variables.scss';
    @import '@/styles/_layout.scss';

    #moduleParamEntry {
      @include editorComponent();
      @include overlay();
      @include noSelect();
      padding: $spacing-small $spacing-large;
      border-radius: $spacing-small;
      box-shadow: 0 0 25px rgba(0,0,0,.5);

      h4 {
        margin: $spacing-medium 0;
      }

      fieldset {
        border: none;
        padding: $spacing-medium 0;
      }

      #instrument {
        width: 120px;
      }

      #moduleSelect {
        position: relative;

        ul {
          list-style-type: none;
          @include flex();
        }

        li {
          float: left;
          cursor: pointer;
          position: relative;
          background-color: $color-2;
          vertical-align: top;
          color: #000;
          font-weight: bold;
          padding: $spacing-medium $spacing-large;
          border-right: 1px solid #000;
          border-bottom: 1px solid #000;
          flex-grow: 1;
          font-size: 80%;

          &.selected, &:hover {
            background-color: $color-1;
          }

          &:after {
            position: absolute;
            bottom: $spacing-small;
            left: $spacing-small;
            pointer-events: none;
          }
        }
      }

      fieldset {

        h2 {
          padding-left: 0;
        }
      }

      .wrapper.range {
        label {
          display: inline;
        }
        input {
          width: 90%;
          display: inline;
          margin-left: $spacing-medium;
        }
      }

      #moduleInputValue {
        color: $color-1;
        font-weight: bold;
        font-style: italic;
        display: inline;
        margin-left: $spacing-medium;
      }

      .confirm-button {
        width: 100%;
        padding: $spacing-medium $spacing-large;
      }
    }

    @media screen and ( max-width: $mobile-width ) {
      #moduleParamEntry {
        border-radius: 0;
      }
    }

    $mpeWidth: 450px;
    $mpeHeight: 420px;

    @media screen and ( min-width: $mpeWidth ) {
      #moduleParamEntry {
        top: 50%;
        left: 50%;
        width: $mpeWidth;
        height: $mpeHeight;
        margin-left: -( $mpeWidth / 2 );
        margin-top: -( $mpeHeight / 2);

        .wrapper.range input {
          width: 55%;
        }
      }
    }
</style>
 