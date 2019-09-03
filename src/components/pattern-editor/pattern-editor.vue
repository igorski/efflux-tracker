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
    <section class="pattern-editor"
             :class="{ 'settings-mode': mobileMode === 'settings' }"
             @mouseover="setHelpTopic('pattern')"
    >
        <h2 v-t="'title'"></h2>
        <ul>
            <li>
                <button v-t="'clear'" type="button"
                        @click="handlePatternClear"></button>
            </li>
            <li>
                <button v-t="'copy'" type="button"
                        @click="handlePatternCopy"></button>
            </li>
            <li>
                <button v-t="'paste'" type="button"
                        @click="handlePatternPaste"></button>
            </li>
            <li>
                <button v-t="'add'" type="button"
                        @click="handlePatternAdd"></button>
            </li>
            <li>
                <button v-t="'delete'" type="button"
                        @click="handlePatternDelete"></button>
            </li>
            <li>
                <select id="patternSteps"
                        v-model.number="patternStep"
                >
                    <option :value="16">16 {{ $t('steps') }}</option>
                    <option :value="32">32 {{ $t('steps') }}</option>
                    <option :value="64">64 {{ $t('steps') }}</option>
                    <option :value="128">128 {{ $t('steps') }}</option>
                </select>
            </li>
            <li>
                <button v-t="'advanced'"
                        type="button"
                        @click="handlePatternAdvanced"
                ></button>
            </li>
        </ul>
    </section>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex';
import HistoryStateFactory from '@/model/factory/history-state-factory';
import Config from '@/config';
import HistoryStates from '@/definitions/history-states';
import ModalWindows from '@/definitions/modal-windows';
import ObjectUtil from '@/utils/object-util';
import messages from './messages.json';

export default {
    i18n: { messages },
    data: () => ({
        patternCopy: null
    }),
    computed: {
        ...mapState({
            activeSong: state => state.song.activeSong,
            activePattern: state => state.sequencer.activePattern,
            mobileMode: state => state.mobileMode
        }),
        ...mapGetters([
            'amountOfSteps',
        ]),
        patternStep: {
            get() {
                return this.activeSong.patterns[this.activePattern].steps;
            },
            set(value) {
                const pattern = this.activeSong.patterns[this.activePattern];
                this.setPatternSteps({ pattern, steps: value });
            }
        }
    },
    methods: {
        ...mapMutations([
            'setHelpTopic',
            'saveState',
            'clearSelection',
            'setPatternSteps',
            'openModal',
            'showError'
        ]),
        handlePatternClear() {
            this.clearSelection();
            this.saveState(HistoryStateFactory.getAction(HistoryStates.CLEAR_PATTERN, { store: this.$store }));
        },
        handlePatternCopy() {
            this.patternCopy = ObjectUtil.clone(this.activeSong.patterns[this.activePattern]);
        },
        handlePatternPaste() {
            if (this.patternCopy) {
                this.clearSelection();
                this.saveState(HistoryStateFactory.getAction(HistoryStates.PASTE_PATTERN, { store: this.$store, patternCopy: this.patternCopy }));
            }
        },
        handlePatternAdd() {
            const patterns = this.activeSong.patterns;
            if ( patterns.length === Config.MAX_PATTERN_AMOUNT ) {
                this.showError(this.$t('errorMaxExceeded', { amount: Config.MAX_PATTERN_AMOUNT }));
                return;
            }
            this.saveState(HistoryStateFactory.getAction(HistoryStates.ADD_PATTERN, { store: this.$store }));
        },
        handlePatternDelete() {
            const patterns = this.activeSong.patterns;
            if ( patterns.length === 1 ) {
                this.handlePatternClear();
            }
            else {
                this.saveState(HistoryStateFactory.getAction(HistoryStates.DELETE_PATTERN, { store: this.$store }));
            }
        },
        handlePatternAdvanced() {
            this.openModal(ModalWindows.ADVANCED_PATTERN_EDITOR);
        }
    }
};
</script>

<style lang="scss">
    @import '@/styles/_variables.scss';

    .pattern-editor {
      display: inline-block;
      margin: 0;

      h2 {
          padding: 0 $spacing-small;
      }

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
          margin: 0 0 0 $spacing-xsmall;
          background-color: #333;
          color: #b6b6b6;
          border-radius: 0;
          border: 0;

          &:hover {
            color: #fff;
          }
        }
      }
    }

    /* large views and above */

    @media screen and ( min-width: $ideal-pattern-editor-width ) {
      .pattern-editor {
        margin: 0 0 0 $spacing-medium;

        h2 {
          padding: 0 $spacing-large;
        }

        /* show divider before section content */
        &:before {
          content: "";
          position: absolute;
          border-left: 1px solid #666;
          margin-top: -$spacing-medium;
          height: 100%;
        }
      }
    }

    /* everything above mobile view and below ideal pattern editor width */

    @media screen and ( min-width: $mobile-width ) and ( max-width: $ideal-pattern-editor-width ) {
      .pattern-editor {
        /* TODO: we're now hiding our interface from these users... */
        /*display: none;*/
      }
    }

    /* phone view */

    @media screen and ( max-width: $mobile-width ) {
      .pattern-editor  {
        display: none; /* only visible when settings mode is active */

        &.settings-mode {
          display: block;
        }
      }

      .pattern-editor {
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
