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
    <div
        class="automation-lane__entry"
        :class="{
            'automation-lane__entry--has-instruction': props.hasInstruction,
        }"
        @click.prevent="listeners.create"
        @dblclick.prevent="listeners.delete"
        @pointerdown="listeners.down"
    >
        <div class="automation-lane__entry-wrapper">
            <div
                class="automation-lane__entry-handle"
                :style="{
                    'height': props.height
                }"
            ></div>
            <input
                v-if="props.isEditing"
                :value="props.value"
                min="0"
                max="100"
                ref="automationInput"
                class="automation-lane__entry-input"
                @input="listeners.input( $event.target.value )"
                @blur="listeners.blur()"
            />
            <span
                v-else
                class="automation-lane__entry-value"
                @click.stop="listeners.focus()"
            >{{ props.displayValue }}</span>
        </div>
    </div>
</template>

<script>
export default {
    functional: true,
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
        value: {
            type: [ String, Number ],
            default: 0,
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/_variables";
@import "@/styles/_mixins";
@import "@/styles/typography";

.automation-lane__entry {
    position: relative;
    width: $piano-roll-column-width;

    &--has-instruction {
        .automation-lane__entry-handle {
            background-color: $color-3;
        }

        &:hover {
            .automation-lane__entry-handle {
                background-color: $color-4;
            }
        }
    }

    .automation-lane__entry-wrapper {
        position: relative;
        height: 80%;
        background-color: $color-pattern-odd;
    }

    &:nth-child(even) {
        .automation-lane__entry-wrapper {
            background-color: $color-pattern-even;
        }
    }

    &:hover {
        .automation-lane__entry-value {
            display: block;
        }
    }

    &-handle {
        @include noEvents();
        cursor: pointer;
        position: absolute;
        bottom: 0;
        width: 100%;
        border-top: 3px solid $color-4;
        box-sizing: border-box;
    }

    &-value {
        cursor: pointer;
        position: absolute;
        display: none;
        bottom: -$spacing-large;
        width: $piano-roll-column-width;
        @include toolFont();
        text-align: center;
        color: #FFF;
    }

    &-input {
        position: absolute;
        bottom: -$spacing-large;
        box-sizing: border-box;
        width: $piano-roll-column-width;
        @include toolFont();
        text-align: center;
        cursor: none;
    }
}
</style>