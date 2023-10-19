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
        class="pattern-order-entry"
        :class="{
            'pattern-order-entry--active': active,
            'pattern-order-entry--has-context-menu': editing
        }"
        @mouseover="setEditing( true )"
        @mouseleave="setEditing( false )"
        @touchstart.self.prevent.stop="setEditing( true )"
        @click.self="selectPattern()"
    >
        {{ name }}
        <div
            v-if="editing"
            class="pattern-order-entry__context-menu"
        >
            <!-- edit options within context menu-->
            <slot></slot>
        </div>
    </div>
</template>

<script lang="ts">
export default {
    props: {
        name: {
            type: String,
            required: true,
        },
        index: {
            type: Number,
            required: true,
        },
        active: {
            type: Boolean,
            default: false,
        },
        editing: {
            type: Boolean,
            default: false,
        },
    },
    methods: {
        selectPattern(): void {
            this.$emit( "select", this.index );
            this.setEditing( false );
        },
        setEditing( isEditing: boolean ): void {
            this.$emit( "toggle-edit-mode", isEditing );
        },
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/_variables";
@import "@/styles/_mixins";

$button-width: 32px;
$button-height: 26px;

.pattern-order-entry {
    cursor: pointer;
    position: relative;
    width: $button-width;
    box-sizing: border-box;
    text-align: center;
    margin: 0 $spacing-xxsmall 0 0;
    padding: $spacing-xxsmall 0;
    border: 1px solid $color-border;
    border-radius: 3px;
    @include toolFont();

    &:hover,
    &--has-context-menu {
        background-color: $color-2;
        color: #000;
    }

    &--active {
        background-color: $color-1;
        color: #000;
    }

    &__context-menu {
        position: absolute;
        z-index: 1;
        background-color: $color-3;
        top: $button-height;
        left: 0;
        padding: 0 $spacing-xxsmall;

        &-button {
            @include toolFont();
            background: none;
            border: 0;
            color: $color-editor-background;
            width: 100%;
            cursor: pointer;

            &:hover {
                color: #FFF;
            }

            &:disabled {
                color: #666;
                cursor: default;
            }
        }
    }
}
</style>