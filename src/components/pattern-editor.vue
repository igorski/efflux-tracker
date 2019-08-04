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
    <section id="patternEditor"
             @mouseover="setHelpTopic('pattern')"
    >
        <h2>Pattern</h2>
        <ul>
            <li>
                <button type="button"
                        @click="handlePatternClear">clear</button>
            </li>
            <li>
                <button type="button"
                        @click="handlePatternCopy">copy</button>
            </li>
            <li>
                <button type="button"
                        @click="handlePatternPaste">paste</button>
            </li>
            <li>
                <button type="button"
                        @click="handlePatternAdd">add</button>
            </li>
            <li>
                <button type="button"
                        @click="handlePatternDelete">delete</button>
            </li>
            <li>
                <select id="patternSteps"
                        v-model.number="patternStep"
                >
                    <option :value="16">16 steps</option>
                    <option :value="32">32 steps</option>
                    <option :value="64">64 steps</option>
                    <option :value="128">128 steps</option>
                </select>
            </li>
            <li>
                <button type="button"
                        @click="handlePatternAdvanced"
                >advanced</button>
            </li>
        </ul>
    </section>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex';
import PatternFactory from '../model/factory/pattern-factory';
import Config from '../config';
import ObjectUtil from '../utils/object-util';
import PatternUtil from '../utils/pattern-util';

export default {
    data: () => ({
        patternCopy: null
    }),
    computed: {
        ...mapState({
            activeSong: state => state.song.activeSong,
            activePattern: state => state.sequencer.activePattern,
        }),
        ...mapGetters([
            'amountOfSteps',
            'getCopy',
        ]),
        patternStep: {
            get() {
                return this.activeSong.patterns[this.activePattern].steps;
            },
            set(value) {
                const pattern = this.activeSong.patterns[this.activePattern];

                // update model values
                this.setPatternSteps({ pattern, steps: value });
            }
        }
    },
    methods: {
        ...mapMutations([
            'setHelpTopic',
            'clearSelection',
            'createLinkedList',
            'replacePattern',
            'replacePatterns',
            'setActivePattern',
            'setPatternSteps',
            'setOverlay',
            'showError',
        ]),
        handlePatternClear() {
            this.replacePattern({ patternIndex: this.activePattern, pattern: PatternFactory.createEmptyPattern(this.amountOfSteps) });
            this.clearSelection();
            this.createLinkedList(this.activeSong);
        },
        handlePatternCopy() {
            this.patternCopy = ObjectUtil.clone(this.activeSong.patterns[this.activePattern]);
        },
        handlePatternPaste() {
            if (this.patternCopy) {
                this.replacePattern({
                    patternIndex: this.activePattern,
                    pattern: PatternFactory.mergePatterns(this.activeSong.patterns[this.activePattern], this.patternCopy, this.activePattern)
                });
                this.createLinkedList(this.activeSong);
            }
        },
        handlePatternAdd() {
            const patterns = this.activeSong.patterns;
            if ( patterns.length === Config.MAX_PATTERN_AMOUNT ) {
                this.showError(this.getCopy('ERROR_MAX_PATTERNS', Config.MAX_PATTERN_AMOUNT));
                return;
            }
            const newPatterns = PatternUtil.addEmptyPatternAtIndex(patterns, this.activePattern + 1, this.amountOfSteps);
            this.replacePatterns(newPatterns);
            this.setActivePattern(this.activePattern + 1);
        },
        handlePatternDelete() {
            const patterns = this.activeSong.patterns;
        
            if ( patterns.length === 1 ) {
                this.handlePatternClear();
            }
            else {
                this.activeSong.patterns = PatternUtil.removePatternAtIndex(patterns, this.activePattern);
        
                if ( this.activePattern > 0 )
                    this.setActivePattern(this.activePattern - 1);
            }
        },
        handlePatternAdvanced() {
            this.setOverlay('ape');
        },
    },
};
</script>

<style lang="scss">
    @import '../styles/_variables.scss';

    #patternEditor {
      display: inline-block;
    }

    #patternEditor {
      margin: 0 0 0 10px;

      h4 {
        display: inline;
      }

      ul {
        display: inline;

        li {
          display: inline;
          cursor: pointer;
        }

        button, select {
          margin: 0;
          background-color: #666;
          color: #b6b6b6;
          border-radius: 0;
          border: 0;

          &:hover {
            color: #fff;
          }
        }
      }
    }

    /* tablet view */

    @media screen and ( min-width: $app-width ) {
      #patternEditor {
        /* show divider before section content */
        &:before {
          content: "";
          position: absolute;
          border-left: 1px solid #666;
          margin-top: -10px;
          height: 100%;
        }
      }
    }

    /* everything above mobile view and below app width */

    @media screen and ( min-width: $mobile-width ) and ( max-width: $app-width ) {
      #patternEditor {
        /* TODO: we're now hiding our interface from these users... */
        display: none;
      }
    }

    /* phone view */

    @media screen and ( max-width: $mobile-width ) {
      #patternEditor  {
        display: none; /* only visible when settings mode is active */
      }

      #patternEditor {
        h2 {
          display: none;
        }
        ul {
          display: flex;
          margin: 0;

          li {
            float: left;
            flex-grow: 1;
            position: relative;
          }
        }
      }
    }
</style>
