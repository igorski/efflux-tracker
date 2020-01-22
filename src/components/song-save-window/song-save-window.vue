/**
* The MIT License (MIT)
*
* Igor Zinken 2020 - https://www.igorski.nl
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
    <div class="song-save-window">
        <div class="header">
            <h2 v-t="'title'"></h2>
            <button class="close-button"
                    @click="$emit('close')"
            >x</button>
        </div>
        <div class="meta-editor">
            <input type="text"
                   v-model="title"
                   ref="titleInput"
                   :placeholder="$t('songTitle')"
                   @focus="handleFocusIn"
                   @blur="handleFocusOut"
            />
            <input type="text"
                   v-model="author"
                   :placeholder="$t('songAuthor')"
                   @focus="handleFocusIn"
                   @blur="handleFocusOut"
            />
            <button v-t="'save'"
                    type="button"
                    class="save-button"
                    :disabled="!title.length || !author.length"
                    @click="save"
            ></button>
        </div>
    </div>
</template>

<script>
import { mapGetters, mapMutations, mapActions } from 'vuex';
import messages from './messages.json';

export default {
    i18n: { messages },
    data: () => ({
        title: '',
        author: '',
    }),
    computed: {
        ...mapGetters([
            'activeSong',
        ]),
    },
    mounted() {
        this.title  = this.activeSong.meta.title;
        this.author = this.activeSong.meta.author;

        this.$refs.titleInput.focus();
    },
    methods: {
        ...mapMutations([
            'setActiveSongAuthor',
            'setActiveSongTitle',
            'suspendKeyboardService',
        ]),
        ...mapActions([
            'saveSong',
            'validateSong',
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
        async save() {
            try {
                this.setActiveSongAuthor(this.author);
                this.setActiveSongTitle(this.title);
                await this.validateSong(this.activeSong);
                await this.saveSong(this.activeSong);
                this.$emit('close');
            } catch (e) {
                // error popup will have been triggered by validator
            }
        },
    },
}
</script>

<style lang="scss" scoped>
    @import '@/styles/_variables.scss';
    @import '@/styles/_layout.scss';

    $width: 450px;
    $height: 200px;

    .song-save-window {
        @include editorComponent();
        @include overlay();
        @include noSelect();
    }

    .save-button:disabled {
        background-color: grey;
    }

    .meta-editor {
      padding: $spacing-medium;

      input, button {
        display: block;
        width: 95%;
        margin: $spacing-small;
      }
    }

    @media screen and ( min-width: $width) and ( min-height: $height ) {
      .song-save-window {
        width: $width;
        height: $height;
        top: 50%;
        left: 50%;
        margin-left: -( $width / 2 );
        margin-top: -( $height / 2 );
      }
    }

    @media screen and ( max-width: $width ), ( max-height: $height ) {
        .song-save-window {
            @include verticalScrollOnMobile();
        }
    }
</style>
