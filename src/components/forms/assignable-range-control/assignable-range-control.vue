/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021 - https://www.igorski.nl
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
    <div class="wrapper input range range-control-wrapper">
        <label
            v-html="label"
            :for="paramId"
        ></label>
        <input
            :value="value"
            :id="paramId"
            type="range"
            :min="min"
            :max="max"
            :step="step"
            @input="$emit( 'input', $event.target.value )"
        />
        <div
            v-if="linkable"
            class="hit-area"
            @click="setAsPairable()"
        />
        <p
            v-if="linking"
            v-t="'moveControllerToAssign'"
            class="help-text"
        ></p>
        <button
            v-if="midiAssignMode && paired"
            v-t="'unlink'"
            class="unlink-button"
            @click="unlink()"
        ></button>
   </div>
</template>

<script>
import { mapState, mapMutations } from "vuex";
import { getParamRange } from "@/definitions/param-ids";
import messages from "./messages.json";

export default {
    i18n: { messages },
    props: {
        paramId: {
            type: String,
            required: true,
        },
        value: {
            type: Number,
            required: true,
        },
        label: {
            type: String,
            required: true,
        },
    },
    data: () => ({
        linking : false,
        paired  : false,
    }),
    computed: {
        ...mapState({
            selectedInstrument : state => state.editor.selectedInstrument,
            midiAssignMode     : state => state.midi.midiAssignMode,
            pairableParamId    : state => state.midi.pairableParamId,
            pairings           : state => state.midi.pairings,
        }),
        linkable() {
            return !this.paired && ( this.linking || this.midiAssignMode );
        },
    },
    watch: {
        pairableParamId( value ) {
            if ( !value ) {
                this.linking = false;
                this.checkPairing();
            }
        },
        selectedInstrument() {
            this.checkPairing();
        }
    },
    created() {
        const { min, max, step } = getParamRange( this.paramId );
        this.min  = min;
        this.max  = max;
        this.step = step;
        this.checkPairing();
    },
    methods: {
        ...mapMutations([
            "setPairableParamId",
            "unpairControlChange",
        ]),
        checkPairing() {
            this.paired = Object.values([ ...this.pairings ])
                              .some(([, { paramId, instrumentIndex }]) => paramId === this.paramId && instrumentIndex === this.selectedInstrument );
        },
        setAsPairable() {
            this.setPairableParamId({
                paramId         : this.paramId,
                instrumentIndex : this.selectedInstrument
            });
            this.linking = true;
        },
        unlink() {
            const pair = Object.values([ ...this.pairings ])
                              .find(([, { paramId, instrumentIndex }]) => paramId === this.paramId && instrumentIndex === this.selectedInstrument );

            if ( pair ) {
                this.unpairControlChange( pair[ 0 ] );
                this.checkPairing();
            }
        }
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";
@import "@/styles/forms";
@import "@/styles/instrument-editor";

.range-control-wrapper {
    position: relative;
}

.hit-area {
    cursor: pointer;
    position: absolute;
    top: -$spacing-xsmall;
    left: -$spacing-xsmall;
    width: calc(100% - #{$spacing-small});
    height: calc(100% - #{$spacing-small});
    background-color: rgba($color-5, 0.5);
    border: $spacing-xsmall solid transparent;
    border-radius: $spacing-small;

    &:hover {
        background-color: transparent;
        border-color: $color-5;
    }
}

.help-text {
    position: absolute;
    left: 0;
    width: 100%;
    text-align: center;
    top: 0;
    @include toolFont();
    color: #FFF;
}

.unlink-button {
    position: absolute;
    right: 0;
    bottom: $spacing-small;
}
</style>
