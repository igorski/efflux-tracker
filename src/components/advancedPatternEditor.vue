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
    <div id="advancedPatternEditor">
        <div class="header">
            <button type="button" class="close-button" @click="handleClose">x</button>
        </div>
        <h4>Advanced pattern editor</h4>
        <fieldset>
            <div class="wrapper input">
                <label>Copy pattern range:</label>
                <input type="number" ref="firstPatternInput" min="1" max="maxPattern" value="firstPattern">
                <input type="number" min="1" max="maxPattern" value="lastPattern">
            </div>
        </fieldset>
        <fieldset>
            <div class="wrapper input">
                <label>Copy channel range:</label>
                <input type="number" min="1" max="8" value="firstChannel">
                <input type="number" min="1" max="8" value="lastChannel">
            </div>
        </fieldset>
        <fieldset>
            <div class="wrapper input">
                <label>Insert after pattern:</label>
                <input type="number" min="1" max="maxPattern" value="pastPattern">
            </div>
        </fieldset>
        <button type="button" class="confirm-button" @click="handleConfirm">Copy content</button>
    </div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex';
import Vue from 'vue';

import Messages       from '../definitions/Messages';
import PatternFactory from '../model/factory/PatternFactory';
import ObjectUtil     from '../utils/ObjectUtil';
import Pubsub         from 'pubsub-js';

/**
 * retrieves the numerical value from an input element
 * and subtract 1 (so the value represents an Array index)
 *
 * @private
 * @param {String|number} value
 * @return {number}
 */
function num( value ) {
    return parseInt( value, 10 ) - 1;
}

export default {
    data: () => ({
        firstPattern: 1,
        lastPattern: 1,
        firstChannel: 1,
        lastChannel: 8,
        pastePattern: 1,
    }),
    computed: {
        ...mapState([
            'activePattern',
        ]),
        ...mapGetters([
            'activeSong',
        ]),
        maxPattern() {
            return this.activeSong.patterns.length;
        },
    },
    created() {
        this.firstPattern =
        this.lastPattern  = this.activePattern + 1;
        this.firstChannel = 1;
        this.lastChannel  = this.activeSong.instruments.length;
        this.pastePattern = this.maxPattern;

        this.$nextTick(() => {
            this.$refs.firstPatternInput.focus();
        });
    },
    methods: {
        ...mapMutations([
            'setOverlay',
            'closeDialog',
        ]),
        handleClose() {
            this.setOverlay(null);
        },
        handleConfirm() {
            const song            = this.activeSong;
            const patterns        = song.patterns;
            const maxPatternValue = patterns.length - 1;
            const maxChannelValue = song.instruments.length - 1;

            const firstPatternValue = Math.min( maxPatternValue, num( this.firstPattern ));
            const lastPatternValue  = Math.min( maxPatternValue, num( this.lastPattern ));
            const firstChannelValue = Math.min( maxChannelValue, num( this.firstChannel ));
            const lastChannelValue  = Math.min( maxChannelValue, num( this.lastChannel ));
            const pastePatternValue = Math.min( maxPatternValue, num( this.pastePattern )) + 1; // +1 as we insert after this index

            const patternsToClone = patterns.slice( firstPatternValue, lastPatternValue + 1 );

            // splice the pattern list at the insertion point, head will contain
            // the front of the list, tail the end of the list, and inserted will contain the cloned content

            const patternsHead     = song.patterns;
            const patternsTail     = patterns.splice( pastePatternValue );
            const patternsInserted = [];

            // clone the patterns into the insertion list

            patternsToClone.forEach(( pattern, patternIndex ) => {
                const clonedPattern = PatternFactory.createEmptyPattern( pattern.steps );

                for ( let i = firstChannelValue; i <= lastChannelValue; ++i )
                    clonedPattern.channels[ i ] = ObjectUtil.clone( pattern.channels[ i ]);

                patternsInserted.push( clonedPattern );
            });

            // commit the changes

            Vue.set(song, "patterns",  patternsHead.concat( patternsInserted, patternsTail ));

            // update event offsets

            for ( let patternIndex = pastePatternValue; patternIndex < song.patterns.length; ++patternIndex ) {
                song.patterns[ patternIndex ].channels.forEach(channel => {
                    channel.forEach(event => {
                        if ( event && event.seq ) {
                            const eventStart  = event.seq.startMeasure;
                            const eventEnd    = event.seq.endMeasure;
                            const eventLength = isNaN( eventEnd ) ? 1 : eventEnd - eventStart;

                            event.seq.startMeasure = patternIndex;
                            event.seq.endMeasure   = event.seq.startMeasure + eventLength;
                        }
                    });
                });
            }

            Pubsub.publish( Messages.CREATE_LINKED_LISTS );

            // update UI

            Pubsub.publish( Messages.REFRESH_SONG );
            Pubsub.publish( Messages.PATTERN_AMOUNT_UPDATED );

            this.handleClose();
        },
    },
};
</script>

<style lang="scss" scoped>
    @import '@/styles/_variables.scss';
    @import '@/styles/_layout.scss';

    #advancedPatternEditor {
    
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
    
        h2 {
          padding-left: 0;
        }
      }
    
      .wrapper.input {
    
        label {
          width: 50%;
          display: inline-block;
        }
        input {
          display: inline-block;
        }
      }
    
      .confirm-button {
        width: 100%;
        padding: .5em 1em;
      }
    }
    
    @media screen and ( max-width: $mobile-width )
    {
      #advancedPatternEditor {
        border-radius: 0;
      }
    }
    
    $apeWidth: 450px;
    $apeHeight: 240px;
    
    @media screen and ( min-width: $apeWidth )
    {
      #advancedPatternEditor {
        top: 50%;
        left: 50%;
        width: $apeWidth;
        height: $apeHeight;
        margin-left: -( $apeWidth / 2 );
        margin-top: -( $apeHeight / 2);
      }
    }
</style>
 