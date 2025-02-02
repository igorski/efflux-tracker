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
    <div class="toggle-control-wrapper">
        <toggle-button
            :value="value"
            :disabled="disabled"
            @input="handleChange"
            sync
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
import ToggleButton from "@/components/forms/vue-js-toggle-button/ToggleButton.vue";
import AssignableInput from "./assignable-control-input";
import messages from "./messages.json";

export default {
    emits: [ "update:modelValue" ],
    i18n: { messages },
    components: {
        ToggleButton
    },
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
            type: Boolean,
            required: true,
        },
        disabled: {
            type: Boolean,
            default: false,
        },
    },
    methods: {
        handleChange( value: boolean ): void {
            this.$emit( "update:modelValue", value );
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";
@import "@/styles/forms";
@import "@/styles/instrument-editor";

.toggle-control-wrapper {
    position: relative;
}

.hit-area {
    cursor: pointer;
    position: absolute;
    top: -$spacing-xsmall;
    left: -$spacing-xsmall;
    width: calc(100% - #{$spacing-small});
    height: 100%;
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
    left: -50px;
    width: 150px;
    top: -50px;
    @include toolFont();
    color: #FFF;
    z-index: 2;
}

.unlink-button {
    position: absolute;
    left: -$spacing-small;
    top: 0;
    z-index: 2;
}
</style>
