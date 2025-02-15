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
    <div class="pattern-to-order-conversion-window">
        <div class="header">
            <h2 v-t="'title'"></h2>
        </div>
        <hr class="divider" />
        <div class="content">
            <p v-t="'conversionExpl'"></p>
        </div>
        <hr class="divider" />
        <div class="footer">
            <button
                v-t="'convert'"
                type="button"
                class="button"
                @click="convertPatterns()"
            ></button>
            <button
                v-t="'continue'"
                type="button"
                class="button"
                @click="keep()"
            ></button>
        </div>
    </div>
</template>

<script lang="ts">
import { mapState, mapMutations } from "vuex";
import { FACTORY_VERSION } from "@/model/factories/song-factory";
import type { EffluxSong } from "@/model/types/song";
import { convertLegacy } from "@/utils/pattern-order-util";
import messages from "./messages.json";

export default {
    emits: [ "close" ],
    i18n: { messages },
    data: () => ({
        newPatternIndex: 0,
    }),
    computed: {
        ...mapState({
            activeSong : state => state.song.activeSong,
        }),
    },
    methods: {
        ...mapMutations([
            "setActiveSong",
            "setSamples",
        ]),
        keep(): void {
            this.close( this.activeSong );
        },
        convertPatterns(): void {
            this.close( convertLegacy( this.activeSong ));
        },
        close( song: EffluxSong ): void {
            song.version = FACTORY_VERSION;
            this.setActiveSong( song );
            this.setSamples( song.samples );
            this.$emit( "close" );
        },
    },
};
</script>

<style lang="scss" scoped>
@use "sass:math";

@use "@/styles/_mixins";
@use "@/styles/_variables";
@use "@/styles/transporter";

$width: 450px;
$height: 270px;

.pattern-to-order-conversion-window {
    @include mixins.editorComponent();
    @include mixins.overlay();
    padding: variables.$spacing-small variables.$spacing-large;

    .divider {
        width: calc(100% + #{variables.$spacing-large * 2});
        margin-left: -( variables.$spacing-large );
        margin-bottom: variables.$spacing-medium;
    }

    @include mixins.componentIdeal( $width, $height ) {
        width: $width;
        height: $height;
        top: 50%;
        left: 50%;
        margin-left: math.div( -$width, 2 );
        margin-top: math.div( -$height, 2 );
    }

    @include mixins.componentFallback( $width, $height ) {
        @include mixins.verticalScrollOnMobile();
    }

    .footer {
        display: flex;
        justify-content: space-evenly;

        .button {
            flex: 0.5;
        }
    }
}
</style>
