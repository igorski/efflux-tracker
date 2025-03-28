/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2023-2025 - https://www.igorski.nl
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
        class="automation-lane__entry"
        :class="{
            'automation-lane__entry--has-instruction': hasInstruction,
        }"
        @click.prevent="onCreate( $event )"
        @dblclick.prevent="onDelete()"
        @pointerdown="onDown( $event )"
    >
        <div class="automation-lane__entry-wrapper">
            <div
                class="automation-lane__entry-handle"
                :style="{
                    'height': height
                }"
            ></div>
            <input
                v-if="isEditing"
                :value="modelValue"
                min="0"
                max="100"
                ref="automationInput"
                class="automation-lane__entry-input"
                @change="onInput( $event.target.value )"
                @blur="onBlur()"
            />
            <span
                v-else
                class="automation-lane__entry-value"
                @click.stop="onFocus()"
            >{{ displayValue }}</span>
        </div>
    </div>
</template>

<script lang="ts">
export default {
    emits: [ "update:modelValue", "focus", "blur", "create", "delete", "down" ],
    props: {
        height: {
            type: String, // CSS value
            required: true,
        },
        isEditing: {
            type: Boolean,
            default: false,
        },
        hasInstruction: {
            type: Boolean,
            default: false,
        },
        displayValue: {
            type: [ String, Number ],
            default: "0.00",
        },
        modelValue: {
            type: [ String, Number ],
            default: 0,
        },
    },
    watch: {
        isEditing( value: boolean ): void {
            if ( value ) {
                this.$nextTick(() => {
                    this.$refs.automationInput?.select();
                });
            }
        },
    },
    methods: {
        onInput( value: string | number ): void {
            if ( value !== this.modelValue ) {
                this.$emit( "update:modelValue", value );
            }
        },
        onCreate( event: Event ): void {
            this.$emit( "create", event );
        },
        onDelete(): void {
            this.$emit( "delete" );
        },
        onDown( event: Event ): void {
            this.$emit( "down", event );
        },
        onFocus(): void {
            this.$emit( "focus" );
        },
        onBlur(): void {
            this.$emit( "blur" );
        },
    },
};
</script>

<style lang="scss" scoped>
@use "@/styles/_colors";
@use "@/styles/_variables";
@use "@/styles/_mixins";
@use "@/styles/typography";

.automation-lane__entry {
    position: relative;
    width: variables.$piano-roll-column-width;

    &--has-instruction {
        .automation-lane__entry-handle {
            background-color: colors.$color-3;
        }

        &:hover {
            .automation-lane__entry-handle {
                background-color: colors.$color-4;
            }
        }
    }

    .automation-lane__entry-wrapper {
        position: relative;
        height: 80%;
        background-color: colors.$color-pattern-odd;
    }

    &:nth-child(even) {
        .automation-lane__entry-wrapper {
            background-color: colors.$color-pattern-even;
        }
    }

    &:hover {
        .automation-lane__entry-value {
            display: block;
        }
    }

    &-handle {
        @include mixins.noEvents();
        cursor: pointer;
        position: absolute;
        bottom: 0;
        width: 100%;
        border-top: 3px solid colors.$color-4;
        box-sizing: border-box;
    }

    &-value {
        cursor: pointer;
        position: absolute;
        display: none;
        bottom: -( variables.$spacing-large );
        width: variables.$piano-roll-column-width;
        @include typography.toolFont();
        text-align: center;
        color: #FFF;
    }

    &-input {
        position: absolute;
        bottom: -( variables.$spacing-large );
        box-sizing: border-box;
        width: variables.$piano-roll-column-width;
        @include typography.toolFont();
        text-align: center;
        cursor: none;
    }
}
</style>