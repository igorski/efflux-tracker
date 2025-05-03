/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2025 - https://www.igorski.nl
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
        <hr class="divider" />
        <div class="channels">
            <channel-strip
                v-for="(instrument, index) in activeSong.instruments"
                :key="`channel_${index}`"
                :instrument-index="index"
                :analyser="analysers[index]"
            />
            <hr class="divider divider--bottom" />
        </div>
    </div>
</template>

<script lang="ts">
import { mapGetters } from "vuex";
import { applyModules, getAnalysers } from "@/services/audio-service";
import ChannelStrip from "./components/channel-strip.vue";
import messages from "./messages.json";

export default {
    emits: [ "close" ],
    i18n: { messages },
    components: {
        ChannelStrip,
    },
    data: () => ({
        analysers: [],
    }),
    computed: {
        ...mapGetters([
            "activeSong",
            "jamMode",
        ]),
    },
    created(): void {
        this.analysers = getAnalysers();

        if ( !this.analysers.length ) {
            return; // audioContext not yet initialized
        }
        // connect the AnalyserNodes to the all instrument channels
        applyModules( this.activeSong, true );
    },
    unmounted(): void {
        // disconnect the AnalyserNodes
        if ( !this.jamMode ) {
            applyModules( this.activeSong, false );
        }
    },
};
</script>

<style lang="scss" scoped>
@use "sass:math";

@use "@/styles/_mixins";
@use "@/styles/_variables";

$ideal-mixer-width: 785px;
$ideal-mixer-height: 460px;

.mixer {
    @include mixins.editorComponent();
    @include mixins.overlay();
    height: auto;

    .divider {
        margin-bottom: 0;
    }

    .header h2 {
        margin-left: variables.$spacing-medium;
    }

    @include mixins.componentIdeal( $ideal-mixer-width, $ideal-mixer-height ) {
        top: 50%;
        left: 50%;
        width: $ideal-mixer-width;
        height: $ideal-mixer-height;
        margin-left: math.div( -$ideal-mixer-width, 2 );
        margin-top: math.div( -$ideal-mixer-height, 2 );
    }

    @include mixins.componentFallback( $ideal-mixer-width, $ideal-mixer-height ) {
        position: absolute;
        height: 100%;
        top: 0;
        margin-top: 0;
        @include mixins.verticalScrollOnMobile();
    }
}
</style>
