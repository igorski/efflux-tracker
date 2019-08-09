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
            <button type="button"
                    class="close-button"
                    @click="handleClose">x</button>
        </div>
        <h4>Advanced pattern editor</h4>
        <fieldset>
            <div class="wrapper input">
                <label>Copy pattern range:</label>
                <input type="number" v-model.number="firstPattern" ref="firstPatternInput" min="1" :max="maxPattern">
                <input type="number" v-model.number="lastPattern" min="1" :max="maxPattern">
            </div>
        </fieldset>
        <fieldset>
            <div class="wrapper input">
                <label>Copy channel range:</label>
                <input type="number" min="1" max="8" v-model.number="firstChannel">
                <input type="number" min="1" max="8" v-model.number="lastChannel">
            </div>
        </fieldset>
        <fieldset>
            <div class="wrapper input">
                <label>Insert after pattern:</label>
                <input type="number" min="1" :max="maxPattern" v-model.number="pastePattern">
            </div>
        </fieldset>
        <button type="button"
                class="confirm-button"
                @keyup.enter="handleConfirm"
                @click="handleConfirm"
        >Copy content</button>
    </div>
</template>

<script>
import { mapState, mapMutations } from 'vuex';

import PatternFactory  from '../model/factory/pattern-factory';
import ObjectUtil      from '../utils/object-util';

export default {
    data: () => ({
        firstPattern: 1,
        lastPattern: 1,
        firstChannel: 1,
        lastChannel: 8,
        pastePattern: 1,
    }),
    computed: {
        ...mapState({
            activeSong: state => state.song.activeSong,
            activePattern: state => state.sequencer.activePattern,
        }),
        maxPattern() {
            return this.activeSong.patterns.length;
        },
    },
    created() {
        // note we add 1 as we'd like our interface to show more friendly 1 as array start ;)
        this.firstPattern = this.activePattern + 1;
        this.lastPattern  = this.activeSong.patterns.length;
        this.firstChannel = 1;
        this.lastChannel  = this.activeSong.instruments.length;
        this.pastePattern = this.maxPattern;

        this.suspendKeyboardService(true);

        this.$nextTick(() => {
            this.$refs.firstPatternInput.focus();
        });
    },
    beforeDestroy() {
        this.suspendKeyboardService(false);
    },
    methods: {
        ...mapMutations([
            'createLinkedList',
            'replacePatterns',
            'suspendKeyboardService',
        ]),
        handleClose() {
            this.$emit('close');
        },
        handleConfirm() {
            const patterns        = this.activeSong.patterns;
            const maxPatternValue = patterns.length;
            const maxChannelValue = this.activeSong.instruments.length - 1;

            const firstPatternValue = Math.min( maxPatternValue, this.firstPattern - 1 );
            const lastPatternValue  = Math.min( maxPatternValue, this.lastPattern - 1 );
            const firstChannelValue = Math.min( maxChannelValue, this.firstChannel - 1 );
            const lastChannelValue  = Math.min( maxChannelValue, this.lastChannel - 1 );
            const pastePatternValue = Math.min( maxPatternValue, this.pastePattern );

            const patternsToClone = patterns.slice( firstPatternValue, lastPatternValue + 1 );

            // splice the pattern list at the insertion point, head will contain
            // the front of the list, tail the end of the list, and inserted will contain the cloned content

            const patternsHead     = ObjectUtil.clone(patterns);
            const patternsTail     = patternsHead.splice( pastePatternValue );
            const patternsInserted = [];

            // clone the patterns into the insertion list

            patternsToClone.forEach(p => {
                const clonedPattern = PatternFactory.createEmptyPattern(p.steps);

                for ( let i = firstChannelValue; i <= lastChannelValue; ++i )
                    clonedPattern.channels[ i ] = ObjectUtil.clone( p.channels[ i ]);

                patternsInserted.push(clonedPattern);
            });

            // commit the changes

            this.replacePatterns(patternsHead.concat(patternsInserted, patternsTail));

            // update event offsets

            for ( let patternIndex = pastePatternValue; patternIndex < this.activeSong.patterns.length; ++patternIndex ) {
                this.activeSong.patterns[ patternIndex ].channels.forEach(channel => {
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
            this.createLinkedList(this.activeSong);
            this.handleClose();
        },
    },
};
</script>

<style lang="scss" scoped>
    @import '@/styles/_variables.scss';
    @import '@/styles/_layout.scss';

    $width: 450px;
    $height: 350px;

    #advancedPatternEditor {
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
        padding: $spacing-medium $spacing-large;
      }
    }
    
    @media screen and ( max-width: $mobile-width ) {
      #advancedPatternEditor {
        border-radius: 0;
      }
    }
    
    @media screen and ( min-width: $width ) {
      #advancedPatternEditor {
        top: 50%;
        left: 50%;
        width: $width;
        height: $height;
        margin-left: -( $width / 2 );
        margin-top: -( $height / 2);
      }
    }
</style>
 