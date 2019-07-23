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
    <section class="song-editor">
        <div class="meta-editor"
             @mouseover="setHelpTopic('meta')"
        >
            <h2>Song</h2>
            <input type="text"
                   v-model="title"
                   placeholder="song title"
                   @focus="handleFocusIn"
                   @blur="handleFocusOut"
            />
            <input type="text"
                   v-model="author"
                   placeholder="song author"
                   @focus="handleFocusIn"
                   @blur="handleFocusOut"
            />
            <button id="instrumentEditBtn"
                    @click="handleInstrumentEditorClick"
            >Instrument editor</button>
        </div>
    </section>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex';

export default {
    computed: {
        ...mapGetters([
            'activeSong',
        ]),
        title: {
            get() {
               return this.activeSong.meta.title;
            },
            set(value) {
                this.setActiveSongTitle(value);
            }
        },
        author: {
            get() {
               return this.activeSong.meta.author;
            },
            set(value) {
                this.setActiveSongAuthor(value);
            }
        },
    },
    methods: {
        ...mapMutations([
            'setActiveSongAuthor',
            'setActiveSongTitle',
            'setHelpTopic',
            'suspendKeyboardService',
            'setOverlay',
        ]),
        /**
         * when typing, we want to suspend the KeyboardController
         * so it doesn't broadcast the typing to its listeners
         */
        handleFocusIn() {
            this.suspendKeyboardService(true);
        },
        /**
         * on focus out, restore the KeyboardControllers broadcasting
         */
        handleFocusOut() {
            this.suspendKeyboardService(false);
        },
        handleInstrumentEditorClick() {
            this.setOverlay('ie');
        },
    }
};
</script>

<style lang="scss" scoped>
    @import '@/styles/_variables.scss';

    .song-editor {
        display: inline-block;
    }

    .meta-editor {
      display: inline;

      input {
        border-radius: 0;
        width: 100px;
        height: 20px;
        margin: 0;
      }
    }

    /* phone view */

    @media screen and ( max-width: $mobile-width ) {
      .song-editor {
        display: none; // only visible when settings mode is active
      }

      .meta-editor {
        h2 {
          display: none;
        }
        input, button {
          @include boxSize();
          display: block;
          margin: .25em 0;
          width: 100%;
        }
      }
    }
</style>
 