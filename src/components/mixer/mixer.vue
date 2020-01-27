/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020 - https://www.igorski.nl
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the 'Software'), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
<template>
    <div class="mixer">
        <div class="header">
            <h2 v-t="'title'"></h2>
            <button class="close-button"
                    @click="$emit('close')"
            >x</button>
        </div>
        <div class="channels">
            <channel-strip v-for="(instrument, index) in activeSong.instruments"
                           :key="`channel_${index}`"
                           :instrument-index="index"
            />
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex';
import ChannelStrip from './components/channel-strip';
import messages     from './messages.json';

export default {
    i18n: { messages },
    components: {
        ChannelStrip,
    },
    computed: {
        ...mapState({
            activeSong: state => state.song.activeSong,
        }),
    },
};
</script>

<style lang='scss' scoped>
    @import '@/styles/_layout.scss';

    .mixer {
      @include editorComponent();
      @include overlay();
      height: auto;
    }

    .title {
      margin: $spacing-medium;
    }

    /* ideal size and above (tablet/desktop) */

    $ideal-mixer-width: 780px;
    $ideal-mixer-height: 400px;

    @media screen and ( min-width: $ideal-mixer-width ) {
      .mixer {
        top: 50%;
        left: 50%;
        width: $ideal-mixer-width;
        height: $ideal-mixer-height;
        margin-left: -$ideal-mixer-width / 2;
        margin-top: -$ideal-mixer-height / 2;
      }
    }

    /* small screen / mobile, etc. */

    @media screen and ( max-width: $ideal-mixer-width ) {
      .mixer {
        position: absolute;
        height: 100%;
        top: 0;
        margin-top: 0;
        @include verticalScrollOnMobile();
      }
    }
</style>
