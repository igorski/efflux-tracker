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
        <ul id="moduleSelect" :ref="moduleSelect" @click="handleModuleClick">
            <ul class="event">
                <li data-value="volume">volume</li>
                <li data-value="pitchUp">pitch +8ve</li>
                <li data-value="pitchDown">pitch -8ve</li>
            </ul>
            <ul class="filter">
                <li data-value="filterEnabled">filter on/off</li>
                <li data-value="filterFreq">filter frequency</li>
                <li data-value="filterQ">filter q</li>
                <li data-value="filterLFOEnabled">filter LFO on/off</li>
                <li data-value="filterLFOSpeed">filter LFO speed</li>
                <li data-value="filterLFODepth">filter LFO depth</li>
            </ul>
            <ul class="delay">
                <li data-value="delayEnabled">delay on/off</li>
                <li data-value="delayTime">delay time</li>
                <li data-value="delayFeedback">delay feedback</li>
                <li data-value="delayCutoff">delay cutoff</li>
                <li data-value="delayOffset">delay offset</li>
            </ul>
        </ul>
        <fieldset>
            <div class="wrapper input radio">
                <h2>Glide ?</h2>
                <label for="glideTrue">On</label>
                <input type="radio" id="glideTrue" name="glide" value="true" v-model-="glide">
                <label for="glideFalse">Off</label>
                <input type="radio" id="glideFalse" name="glide" value="false" v-model="glide">
            </div>
            <div class="wrapper input range">
                <label for="moduleValue">Parameter value</label>
                <input type="range" id="moduleValue" min="0" max="100" step="1" v-model.number="value">
                <div id="moduleInputValue" v-html="valueText"></div>
            </div>
            <p>
                For fast editing: use the keyboard to type a module parameter (first letter),
                use the "G" key to toggle glide on/off and type a numerical value between 0 to 99
                for its parameter value. Hit enter to confirm.
            </p>
            <button class="confirm-button" @click="handleReady">OK</button>
        </fieldset>
    </div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex';
import Pubsub from 'pubsub-js';

export default {
    data: () => ({
        instrument: null,
        module: null,
        glide: false,
        value: 0,
        patternIndex: 0,
        channelIndex: 0,
        step: 0,
    }),
    computed: {
        ...mapState([
            'activePattern',
            'activeInstrument',
            'activeStep',
        ]),
        ...mapGetters([
            'activeSong',
        ]),
        valueText() {
            return ( this.value < 10 ) ? `0${this.value}` : this.value;
        },
        moduleList() {
            // TODO: this is absolutely ridiculous. This component should mimic a form with
            // bound v-models instead of having to traverse DOM nodes and update their state!!
            this.$refs.moduleSelect && this.$refs.moduleSelect.querySelectorAll('li');
        }
    },
    mounted() {
        const pattern = this.activeSong.patterns[ this.activePattern ],
              channel = pattern.channels[ this.activeInstrument ],
              event   = channel[ this.activeStep ];
    
        this.instrument   = ( event ) ? event.instrument : this.activeInstrument;
        this.module       = ( event && event.mp ) ? event.mp.module  : null; // TODO: keep track of last edited module instead of allowing null ??
        this.glide        = ( event && event.mp ) ? event.mp.glide   : false;
        this.value        = ( event && event.mp ) ? event.mp.value   : 50;
        this.patternIndex = ( event ) ? event.seq.startMeasure : this.activePattern;
        this.channelIndex = this.activeInstrument; // always use channel index (event instrument might be associated w/ different channel lane)
        this.step         = editorModel.activeStep;
    
        Pubsub.publishSync( Messages.CLOSE_OVERLAYS, ModuleParamController ); // close open overlays
        Pubsub.publish( Messages.SHOW_BLIND );
    
//        keyboardController.setBlockDefaults( false );
//        keyboardController.setListener( ModuleParamController );
    
        this.setSelectedValueInList( this.moduleList, this.module );
    },
    methods: {
        handleClose() {
            this.$emit('close');
        },
        handleReady() {
        //    if ( EventValidator.hasContent( data )) {
        
                const pattern = this.activeSong.patterns[ this.patternIndex ],
                      channel = pattern.channels[ this.channelIndex ];
        
                let event        = channel[ this.step ];
                const isNewEvent = !event;
        
                if ( isNewEvent )
                    event = EventFactory.createAudioEvent();
        
                event.mp         = { ...this.$data }; // serialize data into event module param property
                event.instrument = this.instrument;
        
                Pubsub.publish( Messages.ADD_EVENT_AT_POSITION, [ event, {
                    patternIndex : this.patternIndex,
                    channelIndex : this.channelIndex,
                    step         : this.step,
                    newEvent     : isNewEvent
                } ]);
        //    }
            
            this.handleClose();
        },
        handleHelp() {
            window.open( Manual.PARAM_ENTRY_HELP, "_blank" );
        },
        // TODO: refactor below to use v-model
        handleModuleClick(aEvent) {
            debugger; // TODO: get HTML element from event
            const target = aEvent.target;
            if ( target.nodeName === "LI" ) {
                self.setSelectedValueInList( this.moduleList, target.getAttribute( "data-value" ));
            }
        },
        setSelectedValueInList( list, value ) {
            value = value.toString();
            let i = list.length, option;

            while ( i-- ) {
                option = list[ i ];

                if ( option.getAttribute( "data-value" ) === value )
                    option.classList.add( "selected" );
                else
                    option.classList.remove( "selected" );
            }
        },
        getSelectedValueFromList( list ) {
            let i = list.length, option;
            while ( i-- ) {
                option = list[ i ];
                if ( option.classList.contains( "selected" ))
                    return option.getAttribute( "data-value" );
            }
            return null;
        },
    },
};
</script>

<style lang="scss" scoped>
    @import '@/styles/_variables.scss';

    #moduleParamEntry {

      @include EditorComponent();
      @include Overlay();
      @include noSelect();
      padding: .25em 1em;
      border-radius: 7px;
      box-shadow: 0 0 25px rgba(0,0,0,.5);

      h4 {
        margin: .75em 0;
      }

      fieldset {
        border: none;
        padding: .5em 0;
      }

      #instrument {
        width: 120px;
      }

      #moduleSelect {
        position: relative;

        ul {
          list-style-type: none;
          .Flex;
        }

        li {
          float: left;
          cursor: pointer;
          position: relative;
          background-color: $color-2;
          vertical-align: top;
          color: #000;
          font-weight: bold;
          padding: .5em 1em;
          border-right: 1px solid #000;
          border-bottom: 1px solid #000;
          flex-grow: 1;
          font-size: 80%;

          &.selected, &:hover {
            background-color: $color-1;
          }

          &:after {
            position: absolute;
            bottom: 7px;
            left: 7px;
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
          margin-left: .5em;
        }
      }

      #moduleInputValue {
        color: $color-1;
        font-weight: bold;
        font-style: italic;
        display: inline;
        margin-left: .5em;
      }

      .confirm-button {
        width: 100%;
        padding: .5em 1em;
      }
    }

    @media screen and ( max-width: $mobile-width )
    {
      #moduleParamEntry {
        border-radius: 0;
      }
    }

    $mpeWidth: 450px;
    $mpeHeight: 420px;

    @media screen and ( min-width: $mpeWidth )
    {
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
 