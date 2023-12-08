/**
* The MIT License (MIT)
*
* Igor Zinken 2022-2023 - https://www.igorski.nl
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
    <div
        class="midi-export-window"
        @keyup.esc="handleClose()"
    >
        <div class="header">
            <h2 v-t="'title'"></h2>
            <button
                type="button"
                class="close-button"
                @click="handleClose()"
            >x</button>
        </div>
        <hr class="divider" />
        <fieldset>
            <div class="wrapper input">
                <label v-t="'patternRange'"></label>
                <input
                    v-model.number="firstOrderIndex"
                    ref="firstPatternInput"
                    type="number"
                    min="1"
                    :max="maxOrderIndex"
                >
                <input
                    v-model.number="lastOrderIndex"
                    type="number"
                    min="1"
                    :max="maxOrderIndex"
                >
            </div>
        </fieldset>
        <fieldset>
            <div class="wrapper input">
                <label v-t="'instrumentRange'"></label>
                <input type="number" min="1" max="8" v-model.number="firstChannel">
                <input type="number" min="1" max="8" v-model.number="lastChannel">
            </div>
        </fieldset>
        <button
            v-t="'export'"
            type="button"
            class="confirm-button"
            @keyup.enter="handleConfirm"
            @click="handleConfirm"
        ></button>
    </div>
</template>

<script lang="ts">
import { mapGetters, mapMutations } from "vuex";
import midiWriter from "midi-writer-js";
import { saveAsFile } from "@/utils/file-util";
import { exportAsMIDI } from "@/utils/song-util";
import { toFileName } from "@/utils/string-util";
import messages from "./messages.json";

export default {
    emits: ["close"],
    i18n: { messages },
    data: () => ({
        firstOrderIndex : 1,
        lastOrderIndex  : 1,
        firstChannel    : 1,
        lastChannel     : 8,
        pastePattern    : 1,
    }),
    computed: {
        ...mapGetters([
            "activeSong",
        ]),
        maxOrderIndex(): number {
            return this.activeSong.order.length;
        },
    },
    created(): void {
        // note we add 1 as we'd like our interface to show more friendly 1 as array start ;)
        this.firstOrderIndex = 1;
        this.lastOrderIndex  = this.activeSong.order.length;

        this.firstChannel = 1;
        this.lastChannel  = this.activeSong.instruments.length;
        this.pastePattern = this.maxPattern;

        this.suspendKeyboardService(true);

        this.$nextTick(() => {
            this.$refs.firstPatternInput.focus();
        });
    },
    beforeUnmount(): void {
        this.suspendKeyboardService( false );
    },
    methods: {
        ...mapMutations([
            "suspendKeyboardService",
        ]),
        handleClose(): void {
            this.$emit( "close" );
        },
        handleConfirm(): void {
            const maxPatternValue = this.activeSong.order.length;
            const maxChannelValue = this.activeSong.instruments.length - 1;

            const firstOrderIndexValue = Math.min( maxPatternValue, this.firstOrderIndex - 1 );
            const lastOrderIndexValue  = Math.min( maxPatternValue, this.lastOrderIndex - 1 );
            const firstChannelValue = Math.min( maxChannelValue, this.firstChannel - 1 );
            const lastChannelValue  = Math.min( maxChannelValue, this.lastChannel - 1 );

            const midiData = exportAsMIDI(
                midiWriter, this.activeSong,
                firstOrderIndexValue, lastOrderIndexValue,
                firstChannelValue, lastChannelValue
            );
            const filename = toFileName( this.activeSong.meta.title, ".mid" );
            saveAsFile( midiData, filename );

            this.handleClose();
        },
    },
};
</script>

<style lang="scss" scoped>
@use "sass:math";

@import "@/styles/_mixins";
@import "@/styles/forms";

$width: 450px;
$height: 290px;

.midi-export-window {
    @include editorComponent();
    @include overlay();
    @include noSelect();
    padding: $spacing-small $spacing-large;
    border-radius: $spacing-small;
    box-shadow: 0 0 25px rgba(0,0,0,.5);

    .divider {
        width: calc(100% + #{$spacing-large * 2});
        margin-left: -$spacing-large;
        margin-bottom: $spacing-medium
    }

    @include componentIdeal( $width, $height ) {
        top: 50%;
        left: 50%;
        width: $width;
        height: $height;
        margin-left: math.div( -$width, 2 );
        margin-top: math.div( -$height, 2 );
    }

    @include componentFallback( $width, $height ) {
        @include verticalScrollOnMobile();
        border-radius: 0;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        margin: 0;
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
</style>
