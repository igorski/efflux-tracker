/**
* The MIT License (MIT)
*
* Igor Zinken 2016-2023 - https://www.igorski.nl
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
        class="dialog-window"
        :class="{ 'has-actions' : !hideActions }"
    >
        <h3>{{ title }}</h3>
        <p>{{ message }}</p>
        <div
            v-if="!hideActions"
            class="actions"
        >
            <button
                v-t="'ok'"
                type="button"
                @click="handleConfirm()"
            ></button>
            <button
                v-if="type === 'confirm'"    
                v-t="'cancel'"
                type="button"
                @click="handleCancel()"
            ></button>
        </div>
    </div>
</template>

<script lang="ts">
import { mapMutations } from "vuex";
import KeyboardService from "@/services/keyboard-service";
import messages from "./messages.json";

export default {
    i18n: { messages },
    props: {
        title: {
            type: String,
            required: true
        },
        message: {
            type: String,
            required: true
        },
        type: {
            type: String,
            required: true,
            validator: value => /info|confirm|error/.test(value)
        },
        confirmHandler: {
            type: Function,
            default: null,
        },
        cancelHandler: {
            type: Function,
            default: null,
        },
        hideActions: {
            type: Boolean,
            default: false,
        },
    },
    created(): void {
        KeyboardService.setListener( this.handleKey.bind( this ));
    },
    beforeUnmount(): void {
        KeyboardService.reset();
    },
    methods: {
        ...mapMutations([
            "closeDialog",
        ]),
        handleKey( type: string, keyCode: number/*, event: KeyboardEvent */ ): boolean {
            switch ( keyCode ) {
                default:
                    break;
                case 13:
                    this.handleConfirm();
                    return true;
                case 27:
                    this.handleCancel();
                    return true;
            }
            return false;
        },
        handleConfirm(): void {
            if ( typeof this.confirmHandler === "function" ) {
                this.confirmHandler();
            }
            this.close();
        },
        handleCancel(): void {
            if ( typeof this.cancelHandler === "function" ) {
                this.cancelHandler();
            }
            this.close();
        },
        close(): void {
            this.closeDialog();
        },
    }
};
</script>

<style lang="scss" scoped>
@use "@/styles/_mixins";
@use "@/styles/_variables";
@use "@/styles/typography";

.dialog-window {
    @include mixins.editorComponent();
    @include mixins.overlay();
    @include mixins.noSelect();
    @include mixins.boxSize();

    width: auto;
    height: auto;
    left: 50%;
    top: 50%;
    -ms-transform: translate(-50%,-50%);
    -moz-transform:translate(-50%,-50%);
    -webkit-transform: translate(-50%,-50%);
    transform: translate(-50%,-50%);

    padding: variables.$spacing-small variables.$spacing-large;
    border-radius: variables.$spacing-small;
    box-shadow: 0 0 25px rgba(0,0,0,.5);

    h3 {
        @include typography.toolFont();
        margin: variables.$spacing-medium 0;
        color: #FFF;
        font-size: 125%;
    }

    button {
        @include mixins.button();
        padding: variables.$spacing-medium variables.$spacing-large;
    }

    @include mixins.large() {
        max-width: 400px;

        .actions {
            margin: variables.$spacing-small 0;
            display: flex;

            button {
                flex: 1;
                margin: 0 variables.$spacing-small 0 0;
            }
        }
    }

    @include mixins.mobile() {
        &.has-actions {
            border-radius: 0;
            width: 100%;
            height: 100%;

            button {
                display: block;
                width: 100%;
                margin-bottom: variables.$spacing-small;
            }
        }
    }
}
</style>
