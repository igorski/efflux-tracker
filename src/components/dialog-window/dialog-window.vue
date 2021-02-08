/**
* The MIT License (MIT)
*
* Igor Zinken 2016-2021 - https://www.igorski.nl
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
    <div id="dialogWindow">
        <h3>{{ title }}</h3>
        <p>{{ message }}</p>
        <div class="actions">
            <button v-t="'ok'"
                    type="button"
                    @click="handleConfirm()"
            ></button>
            <button v-t="'cancel'"
                    v-if="type === 'confirm'"
                    type="button"
                    @click="handleCancel()"
            ></button>
        </div>
    </div>
</template>

<script>
import { mapMutations } from 'vuex';
import messages from './messages.json';

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
        }
    },
    methods: {
        ...mapMutations([
            'closeDialog',
        ]),
        handleConfirm() {
            if ( typeof this.confirmHandler === "function" )
                this.confirmHandler();

            this.close();
        },
        handleCancel() {
            if ( typeof this.cancelHandler === "function" ) {
                this.cancelHandler();
            }
            this.close();
        },
        close() {
            this.closeDialog();
        }
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";

#dialogWindow {
    @include editorComponent();
    @include overlay();
    @include noSelect();
    @include boxSize();

    width: auto;
    height: auto;
    left: 50%;
    top: 50%;
    -ms-transform: translate(-50%,-50%);
    -moz-transform:translate(-50%,-50%);
    -webkit-transform: translate(-50%,-50%);
    transform: translate(-50%,-50%);

    padding: $spacing-small $spacing-large;
    border-radius: $spacing-small;
    box-shadow: 0 0 25px rgba(0,0,0,.5);

    h3 {
        @include toolFont();
        margin: $spacing-medium 0;
        color: #FFF;
        font-size: 125%;
    }

    button {
        @include button();
        padding: $spacing-medium $spacing-large;
    }

    @include large() {
        max-width: 400px;

        .actions {
            margin: $spacing-small 0;
            display: flex;

            button {
                flex: 1;
                margin: 0 $spacing-small 0 0;
            }
        }
    }

    @include mobile() {
        border-radius: 0;
        width: 100%;
        height: 100%;

        button {
            display: block;
            width: 100%;
            margin-bottom: $spacing-small;
        }
    }
}
</style>
