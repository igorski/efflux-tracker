/**
* The MIT License (MIT)
*
* Igor Zinken 2016-2020 - https://www.igorski.nl
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
    <section
        class="song-editor"
        :class="{ 'settings-mode': mobileMode === 'settings' }"
    >
        <button v-t="'instrumentEditor'"
                id="instrumentEditBtn"
                @click="handleInstrumentEditorClick"
        ></button>
    </section>
</template>

<script>
import { mapState, mapMutations } from 'vuex';
import ModalWindows from '@/definitions/modal-windows';
import messages from './messages.json';

export default {
    i18n: { messages },
    computed: {
        ...mapState([
            'mobileMode',
        ]),
    },
    methods: {
        ...mapMutations([
            'openModal'
        ]),
        handleInstrumentEditorClick() {
            this.openModal(ModalWindows.INSTRUMENT_EDITOR);
        }
    }
};
</script>

<style lang="scss" scoped>
    @import '@/styles/_variables.scss';

    .song-editor {
        display: inline-block;
        padding-left: $spacing-small;
    }

    /* everything above tablet */

    @media screen and ( min-width: $ideal-pattern-editor-width ) {
        .meta-editor input {
            width: 150px;
        }
    }

    /* everything above phone */

    @media screen and ( min-width: $mobile-width ) {
        .meta-editor input {
            &:first-child {
              margin-left: $spacing-medium;
            }
        }
    }

    /* phone view */

    @media screen and ( max-width: $mobile-width ) {
      .song-editor {
        display: none; /* only visible when settings mode is active */

          &.settings-mode {
            display: block;
          }
      }

      .meta-editor {
        input, button {
          @include boxSize();
          display: block;
          margin: $spacing-small auto;
          width: 95%;
        }
      }
    }
</style>
