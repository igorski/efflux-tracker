/**
* The MIT License (MIT)
*
* Igor Zinken 2016-2019 - https://www.igorski.nl
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
        <h4>{{ title }}</h4>
        <p>{{ message }}</p>
        <button type="button"
                @click="handleConfirm"
        >{{ getCopy()('BUTTON_OK') }}</button>
        <button v-if="type === 'confirm'"
                type="button"
                @click="handleCancel"
        >{{ getCopy()('BUTTON_CANCEL') }}</button>
    </div>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex';

export default {
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
            required: false,
        },
        cancelHandler: {
            type: Function,
            required: false,
        }
    },
    computed: {
        ...mapGetters([
            'getCopy',
        ])
    },
    methods: {
        ...mapMutations([
            'setOverlayState',
            'closeDialog',
        ]),
        handleConfirm() {
            if ( typeof this.confirmHandler === "function" )
                this.confirmHandler();

            this.close();
        },
        handleCancel() {
            if ( typeof this.cancelHandler === "function" )
                this.cancelHandler();

            this.close();
        },
        close() {
            this.setOverlayState(false);
            this.closeDialog();
        }
    }
};
</script>

<style lang="scss" scoped>
    @import "../styles/_variables.scss";

    #dialogWindow {

      @include EditorComponent;
      @include Overlay;
      @include noSelect;
      @include boxSize;

      width: auto;
      height: auto;
      left: 50%;
      top: 50%;
      -ms-transform: translate(-50%,-50%);
      -moz-transform:translate(-50%,-50%);
      -webkit-transform: translate(-50%,-50%);
      transform: translate(-50%,-50%);

      padding: .25em 1em;
      border-radius: 7px;
      box-shadow: 0 0 25px rgba(0,0,0,.5);

      h4 {
        margin: .75em 0;
        color: $color-1;
        font-weight: bold;
      }

      button {
        display: inline;
        width: 48%;
        padding: .5em 1em;
      }
    }

    @media screen and ( max-width: $mobile-width )
    {
      #dialogWindow {
        border-radius: 0;
        width: 100%;
        height: 100%;

        button {
          display: block;
          width: 100%;
        }
      }
    }
</style>
 