/**
* The MIT License (MIT)
*
* Igor Zinken 2022 - https://www.igorski.nl
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
        class="transposition-window"
        @keyup.enter="handleConfirm()"
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
        <p>{{ $t( "semitonesExpl", { semitones: 24 }) }}</p>
        <fieldset>
            <div class="wrapper input">
                <label v-t="'semitones'"></label>
                <input
                    ref="semitoneInput"
                    v-model.number="semitones"
                    type="number"
                    min="-24"
                    max="24"
                />
            </div>
        </fieldset>
        <fieldset>
            <div class="wrapper input">
                <label v-t="'patternRange'"></label>
                <input type="number" v-model.number="firstPattern" min="1" :max="maxPattern" />
                <input type="number" v-model.number="lastPattern" min="1" :max="maxPattern" />
            </div>
        </fieldset>
        <fieldset>
            <div class="wrapper input">
                <label v-t="'instrumentRange'"></label>
                <input type="number" min="1" max="8" v-model.number="firstChannel" />
                <input type="number" min="1" max="8" v-model.number="lastChannel" />
            </div>
        </fieldset>
        <button
            v-t="'transpose'"
            type="button"
            class="confirm-button"
            @keyup.enter="handleConfirm()"
            @click="handleConfirm()"
        ></button>
    </div>
</template>

<script>
import { mapGetters, mapMutations } from "vuex";
import Actions from "@/definitions/actions";
import createAction from "@/model/factories/action-factory";
import messages from "./messages.json";

export default {
    emits: ["close"],
    i18n: { messages },
    data: () => ({
        firstPattern : 1,
        lastPattern  : 1,
        firstChannel : 1,
        lastChannel  : 8,
        pastePattern : 1,
        semitones    : 0,
    }),
    computed: {
        ...mapGetters([
            "activeSong",
        ]),
        maxPattern() {
            return this.activeSong.patterns.length;
        },
    },
    watch: {
        semitones( value ) {
            if ( value < -24 ) {
                this.semitones = -24;
            } else if ( value > 24 ) {
                this.semitones = 24;
            }
        }
    },
    created() {
        // note we add 1 as we'd like our interface to show more friendly 1 as array start ;)
        this.firstPattern = 1;
        this.lastPattern  = this.activeSong.patterns.length;
        this.firstChannel = 1;
        this.lastChannel  = this.activeSong.instruments.length;
        this.pastePattern = this.maxPattern;

        this.suspendKeyboardService( true );

        this.$nextTick(() => {
            this.$refs.semitoneInput.focus();
        });
    },
    beforeUnmount() {
        this.suspendKeyboardService( false );
    },
    methods: {
        ...mapMutations([
            "saveState",
            "suspendKeyboardService",
        ]),
        handleClose() {
            this.$emit( "close" );
        },
        handleConfirm() {
            if ( this.semitones === 0 ) {
                return this.handleClose();
            }
            const patterns        = this.activeSong.patterns;
            const maxPatternValue = patterns.length;
            const maxChannelValue = this.activeSong.instruments.length - 1;

            const firstPattern = Math.min( maxPatternValue, this.firstPattern - 1 );
            const lastPattern  = Math.min( maxPatternValue, this.lastPattern - 1 );
            const firstChannel = Math.min( maxChannelValue, this.firstChannel - 1 );
            const lastChannel  = Math.min( maxChannelValue, this.lastChannel - 1 );

            this.saveState(
                createAction( Actions.TRANSPOSE, {
                    store: this.$store,
                    semitones: this.semitones,
                    firstPattern,
                    lastPattern,
                    firstChannel,
                    lastChannel,
                })
            );
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
$height: 390px;

.transposition-window {
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
