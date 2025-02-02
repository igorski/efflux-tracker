/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2025 - https://www.igorski.nl
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
    <knob-control
        v-model="internalValue"
        :min="0"
        :max="100"
        :size="36"
        :stroke-width="12"
        :value-display-function="formatValue"
        primary-color="#3BBBFF"
        secondary-color="#DDD"
        text-color="#FFF"
    />
</template>

<script lang="ts">
import KnobControl from "@/components/forms/vue-knob-control/KnobControl.vue";

export default {
    emits: [ "update:modelValue" ],
    components: {
        KnobControl
    },
    props: {
        /* value is normalized to 0 - 1 range */
        modelValue: {
            type: Number,
            required: true,
        },
    },
    computed: {
        internalValue: {
            get(): number {
                return this.modelValue * 100;
            },
            set( value: number ): void {
                this.$emit( "update:modelValue", value / 100 );
            },
        },
    },
    methods: {
        formatValue( value: number ): string {
            return value.toFixed( 0 );
        },
    },
};
</script>
