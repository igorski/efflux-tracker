/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2023 - https://www.igorski.nl
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
            :value="modelValue"
            :id="paramId"
            type="range"
            :min="min"
            :max="max"
            :step="step"
            :disabled="disabled"
            @input="$emit( 'update:modelValue', $event.target.value )"
        />
        <div
            v-if="linkable && !disabled"
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

<script lang="ts">
import AssignableInput from "./assignable-control-input";
import { getParamRange } from "@/services/audio/param-controller";
import messages from "./messages.json";

export default {
    emits: [ "update:modelValue" ],
    i18n: { messages },
    mixins: [ AssignableInput ],
    props: {
        paramId: {
            type: String,
            required: true,
        },
        optData: {
            type: [ String, Number, undefined ],
            required: false,
        },
        modelValue: {
            type: Number,
            required: true,
        },
        label: {
            type: String,
            required: true,
        },
        disabled: {
            type: Boolean,
            default: false,
        },
    },
    created(): void {
        const { min, max, step } = getParamRange( this.paramId );

        this.min  = min;
        this.max  = max;
        this.step = step;
        
        this.checkPairing();
    },
};
</script>

<style lang="scss" scoped>
@use "@/styles/_colors";
@use "@/styles/_mixins";
@use "@/styles/_variables";
@use "@/styles/forms";
@use "@/styles/instrument-editor";
@use "@/styles/typography";

.range-control-wrapper {
    position: relative;
}

.hit-area {
    cursor: pointer;
    position: absolute;
    top: -( variables.$spacing-xsmall );
    left: -( variables.$spacing-xsmall );
    width: calc(100% - #{variables.$spacing-small});
    height: calc(100% - #{variables.$spacing-small});
    background-color: rgba(colors.$color-5, 0.5);
    border: variables.$spacing-xsmall solid transparent;
    border-radius: variables.$spacing-small;

    &:hover {
        background-color: transparent;
        border-color: colors.$color-5;
    }
}

.help-text {
    position: absolute;
    left: 0;
    width: 100%;
    text-align: center;
    top: 0;
    @include typography.toolFont();
    color: #FFF;
}

.unlink-button {
    position: absolute;
    right: 0;
    bottom: variables.$spacing-small;
}
</style>
