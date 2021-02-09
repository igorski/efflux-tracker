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
            :for="controlId"
        ></label>
        <input
            :value="value"
            :id="controlId"
            type="range"
            :min="min"
            :max="max"
            :step="step"
            @input="$emit( 'input', $event.target.value )"
        />
        <div
            v-if="linkable"
            class="hit-area"
            @click="linkToChannel()"
        />
        <p
            v-if="linking"
            v-t="'moveControllerToAssign'"
            class="help-text"
        ></p>
   </div>
</template>

<script>
import { mapState, mapMutations } from "vuex";
import { uid } from "@/utils/object-util";
import messages from "./messages.json";

export default {
    i18n: { messages },
    props: {
        value: {
            type: Number,
            required: true,
        },
        label: {
            type: String,
            required: true,
        },
        min: {
            type: Number,
            default: 0
        },
        max: {
            type: Number,
            default: 1
        },
        step: {
            type: Number,
            default: 0.01
        },
    },
    data: () => ({
        channel   : -1,     // MIDI channel assigned for control
        controlId : uid(),  // needs to be persistent over sessions, map to type and instrument
        linking   : false,
    }),
    computed: {
        ...mapState({
            midiAssignMode   : state => state.midi.midiAssignMode,
            pairableCallback : state => state.midi.pairableCallback,
        }),
        linkable() {
            return this.linking || this.midiAssignMode;
        },
    },
    watch: {
        pairableCallback( value ) {
            if ( !value ) {
                this.linking = false;
            }
        },
    },
    methods: {
        ...mapMutations([
            "setPairableControlCallback",
            "unpairControlChange",
        ]),
        linkToChannel() {
            this.setPairableControlCallback( this.controlUpdate.bind( this ));
            this.linking = true;
        },
        controlUpdate( value ) {
            const translated = this.min + ( this.max - this.min ) * ( value * ( 1 / 127 ));
            this.$emit( "input", translated );
        },
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
</style>
