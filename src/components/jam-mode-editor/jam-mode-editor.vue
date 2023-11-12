/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2023 - https://www.igorski.nl
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
    <section class="jam-mode-editor">
        <jam-channel-editor
            v-for="channel in channelEntries"
            :key="`ch_${channel.index}`"
            :channel="channel"
        />
    </section>
</template>

<script lang="ts">
import { mapGetters } from "vuex";
import JamChannelEditor from "./components/jam-channel-editor/jam-channel-editor.vue";
import { type JamChannel } from "@/model/types/jam";

export default {
    components: {
        JamChannelEditor,
    },
    computed: {
        ...mapGetters([
            "activeSong",
        ]),
        channelEntries(): JamChannel[] {
            const amountOfPatterns = this.activeSong.patterns.length;
            const channels: JamChannel[] = new Array( this.activeSong.patterns[ 0 ].channels.length );

            this.activeSong.patterns.forEach(( pattern, patternIndex ) => {
                pattern.channels.forEach(( channel, channelIndex ) => {
                    const jamChannel = channels[ channelIndex ] ?? {
                        index: channelIndex,
                        patterns: new Array( amountOfPatterns ),
                    };
                    jamChannel.patterns[ patternIndex ] = channel;

                    channels[ channelIndex ] = jamChannel;
                });
            });
            return channels;
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";

.jam-mode-editor {
    overflow-y: auto;
    background-color: $color-form-background;

    @include mobile() {
        padding-left: ($spacing-large + $spacing-medium); /* to make up for fixed position pattern editor */
    }
}
</style>