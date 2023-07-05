/**
* The MIT License (MIT)
*
* Igor Zinken 2016-2022 - https://www.igorski.nl
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
        class="advanced-pattern-editor"
        @keyup.esc="handleClose()"
    >
        <div class="header">
            <h2 v-t="'title'"></h2>
            <button
                type="button"
                class="close-button"
                @click="handleClose"
            >x</button>
        </div>
        <hr class="divider" />
        <fieldset>
            <div class="wrapper input">
                <label v-t="'copyPatternRangeLabel'"></label>
                <input type="number" v-model.number="firstPattern" ref="firstPatternInput" min="1" :max="maxPattern">
                <input type="number" v-model.number="lastPattern" min="1" :max="maxPattern">
            </div>
        </fieldset>
        <fieldset>
            <div class="wrapper input">
                <label v-t="'copyChannelRangeLabel'"></label>
                <input type="number" min="1" max="8" v-model.number="firstChannel">
                <input type="number" min="1" max="8" v-model.number="lastChannel">
            </div>
        </fieldset>
        <button
            v-t="'exportContent'"
            type="button"
            class="export-button"
            @click="handleExportClick()"
        ></button>
        <fieldset>
            <div class="wrapper input">
                <label v-t="'insertAfterLabel'"></label>
                <input type="number" min="1" :max="maxPattern" v-model.number="pastePattern">
            </div>
        </fieldset>
        <button
            v-t="'insertClonedContent'"
            type="button"
            class="confirm-button"
            @keyup.enter="handleDuplicateClick()"
            @click="handleDuplicateClick()"
        ></button>
    </div>
</template>

<script>
import { mapState, mapMutations, mapActions } from "vuex";

import { PATTERN_FILE_EXTENSION } from "@/definitions/file-types";
import { saveAsFile } from "@/utils/file-util";
import { serializePatternFile } from "@/utils/pattern-util";
import messages from "./messages.json";

export default {
    i18n: { messages },
    data: () => ({
        firstPattern: 1,
        lastPattern: 1,
        firstChannel: 1,
        lastChannel: 8,
        pastePattern: 1,
    }),
    computed: {
        ...mapState({
            activeSong: state => state.song.activeSong,
            activePattern: state => state.sequencer.activePattern,
        }),
        maxPattern() {
            return this.activeSong.patterns.length;
        },
    },
    created() {
        // note we add 1 as we'd like our interface to show more friendly 1 as array start ;)
        this.firstPattern = this.activePattern + 1;
        this.lastPattern  = this.activeSong.patterns.length;
        this.firstChannel = 1;
        this.lastChannel  = this.activeSong.instruments.length;
        this.pastePattern = this.maxPattern;

        this.suspendKeyboardService( true );

        this.$nextTick(() => {
            this.$refs.firstPatternInput.focus();
        });
    },
    beforeDestroy() {
        this.suspendKeyboardService( false );
    },
    methods: {
        ...mapMutations([
            "setLoading",
            "showError",
            "showNotification",
            "suspendKeyboardService",
            "unsetLoading",
        ]),
        ...mapActions([
            "pastePatternsIntoSong",
        ]),
        async handleExportClick() {
            this.setLoading( "pexp" );
            try {
                const {
                    firstChannelValue, lastChannelValue,
                    firstPatternValue, lastPatternValue,
                    patternsToClone,
                }  = this.clonePatternRange();

                // encode pattern range
                const data = serializePatternFile( patternsToClone, firstChannelValue, lastChannelValue );
                const name = `${this.activeSong.meta.title}_${firstPatternValue}-${lastPatternValue}_${firstChannelValue}-${lastChannelValue}`;

                // download file to disk
                saveAsFile(
                    `data:application/json;charset=utf-8, ${encodeURIComponent(data)}`, `${name}${PATTERN_FILE_EXTENSION}`
                );
                this.showNotification({ message: this.$t( "patternRangeExported" ) });
            } catch {
                this.showError( this.$t( "errorPatternRangeExport" ));
            }
            this.unsetLoading( "pexp" );
        },
        handleClose() {
            this.$emit( "close" );
        },
        async handleDuplicateClick() {
            const patterns = this.activeSong.patterns;
            const pastePatternValue = Math.min( patterns.length, this.pastePattern );

            const {
                firstChannelValue,
                lastChannelValue,
                patternsToClone,
            }  = this.clonePatternRange();

            await this.pastePatternsIntoSong({
                patterns     : patternsToClone,
                channelRange : [ firstChannelValue, lastChannelValue ],
                insertIndex  : pastePatternValue
            });
            this.handleClose();
        },
        clonePatternRange() {
            const patterns        = this.activeSong.patterns;
            const maxChannelValue = this.activeSong.instruments.length - 1;

            const firstChannelValue = Math.min( maxChannelValue, this.firstChannel - 1 );
            const lastChannelValue  = Math.min( maxChannelValue, this.lastChannel - 1 );

            const firstPatternValue = Math.min( patterns.length, this.firstPattern - 1 );
            const lastPatternValue  = Math.min( patterns.length, this.lastPattern - 1 );

            const patternsToClone = patterns.slice( firstPatternValue, lastPatternValue + 1 );

            return {
                firstPatternValue,
                lastPatternValue,
                firstChannelValue,
                lastChannelValue,
                patternsToClone,
            };
        },
    },
};
</script>

<style lang="scss" scoped>
@use "sass:math";

@import "@/styles/_mixins";
@import "@/styles/forms";

$width: 450px;
$height: 410px;

.advanced-pattern-editor {
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

    .wrapper.input {
        label {
            width: 50%;
            display: inline-block;
        }
        input {
            display: inline-block;
        }
    }

    .export-button,
    .confirm-button {
        width: 100%;
        padding: $spacing-medium $spacing-large;
    }

    .export-button {
        margin-bottom: $spacing-medium;
    }
}
</style>
