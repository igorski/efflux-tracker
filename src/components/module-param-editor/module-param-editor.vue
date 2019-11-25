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
    <div class="module-param-editor">
        <div class="header">
            <h4 v-t="'title'" class="title"></h4>
            <button class="help-button"  @click="handleHelp">?</button>
            <button class="close-button" @click="handleClose">x</button>
        </div>
        <ul id="moduleSelect">
            <ul class="event">
                <form-list-item v-t="'volume'"
                                v-model="module" option-value="volume" />
                <template v-if="supportsPanning">
                    <form-list-item v-t="'panLeft'"
                                    v-model="module" option-value="panLeft" />
                    <form-list-item v-t="'panRight'"
                                    v-model="module" option-value="panRight" />
                </template>
                <form-list-item v-t="'pitchUp'"
                                v-model="module" option-value="pitchUp" />
                <form-list-item v-t="'pitchDown'"
                                v-model="module" option-value="pitchDown" />
            </ul>
            <ul class="filter">
                <form-list-item v-t="'filterOnOff'"
                                v-model="module" option-value="filterEnabled" />
                <form-list-item v-t="'filterFreq'"
                                v-model="module" option-value="filterFreq" />
                <form-list-item v-t="'filterQ'"
                                v-model="module" option-value="filterQ" />
                <form-list-item v-t="'filterLfoOnOff'"
                                v-model="module" option-value="filterLFOEnabled" />
                <form-list-item v-t="'filterLfoSpeed'"
                                v-model="module" option-value="filterLFOSpeed" />
                <form-list-item v-t="'filterLfoDepth'"
                                v-model="module" option-value="filterLFODepth" />
            </ul>
            <ul class="delay">
                <form-list-item v-t="'delayOnOff'"
                                v-model="module" option-value="delayEnabled" />
                <form-list-item v-t="'delayTime'"
                                v-model="module" option-value="delayTime" />
                <form-list-item v-t="'delayFeedback'"
                                v-model="module" option-value="delayFeedback" />
                <form-list-item v-t="'delayCutoff'"
                                v-model="module" option-value="delayCutoff" />
                <form-list-item v-t="'delayOffset'"
                                v-model="module" option-value="delayOffset" />
            </ul>
        </ul>
        <fieldset>
            <div class="wrapper input radio">
                <h2 v-t="'useGlide'"></h2>
                <label v-t="'on'" for="glideTrue"></label>
                <input type="radio"
                       v-model="glide"
                       id="glideTrue"
                       name="glide"
                       :value="true"
                />
                <label v-t="'off'" for="glideFalse"></label>
                <input type="radio"
                       v-model="glide"
                       id="glideFalse"
                       name="glide"
                       :value="false"
                />
            </div>
            <div class="wrapper input range">
                <label v-t="'parameterValue'" for="moduleValue"></label>
                <input v-model.number="value"
                       type="range"
                       id="moduleValue"
                       min="0" max="100" step="1"
                />
                <div id="moduleInputValue" v-html="valueText"></div>
            </div>
            <p v-t="'fastEditDescr'"></p>
            <button v-t="'ok'"
                    type="button"
                    class="confirm-button"
                    @click="handleSubmit"
            ></button>
        </fieldset>
    </div>
</template>

<script>
import { mapState, mapMutations } from 'vuex';

import EventFactory       from '@/model/factory/event-factory';
import KeyboardService    from '@/services/keyboard-service';
import ModuleParamHandler from '@/services/keyboard/module-param-handler';
import ManualURLs         from '@/definitions/manual-urls';
import WebAudioHelper     from '@/services/audio/webaudio-helper';
import FormListItem       from '../forms/form-list-item';
import messages           from './messages.json';

const DEFAULT_MODULE = 'volume';
let lastValueTypeAction = 0, lastValueChar = 0;

export default {
    i18n: { messages },
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
        supportsPanning: false,
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

        this.supportsPanning = WebAudioHelper.supports('panning');
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

    $width: 450px;
    $height: 450px;

    .module-param-editor {
      @include editorComponent();
      @include overlay();
      @include noSelect();
      padding: $spacing-small $spacing-large;
      border-radius: $spacing-small;
      box-shadow: 0 0 25px rgba(0,0,0,.5);

      .title {
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
          padding: $spacing-small $spacing-medium;
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

    @media screen and ( min-width: $width ) and ( min-height: $height ) {
      .module-param-editor {
        top: 50%;
        left: 50%;
        width: $width;
        height: $height;
        margin-left: -( $width / 2 );
        margin-top: -( $height / 2);

        .wrapper.range input {
          width: 55%;
        }
      }
    }

    @media screen and ( max-width: $mobile-width ) {
      .module-param-editor {
        border-radius: 0;
        width: 100%;
        @include verticalScrollOnMobile();
      }
    }
</style>