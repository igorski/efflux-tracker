/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2022 - https://www.igorski.nl
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
    <div class="chord-generator-window">
        <div class="header">
            <h2 v-t="'title'"></h2>
            <button
                type="button"
                class="close-button"
                @click="handleClose()"
            >x</button>
        </div>
        <hr class="divider" />
        <p v-t="'expl'"></p>
        <p v-t="'shortcutsExpl'" class="cursive"></p>
        <div class="chord-select">
            <select-box
                v-model="note"
                :options="pitches"
                class="chord-select__input"
            />
            <select-box
                v-model="octave"
                :options="octaves"
                class="chord-select__input"
            />
            <select-box
                v-model="chord"
                :options="chords"
                class="chord-select__input chord-select__input--large"
            />
        </div>
        <hr class="divider" />
        <button
            v-t="'insert'"
            type="button"
            class="confirm-button"
            @click="handleConfirm()"
        ></button>
    </div>
</template>

<script>
import { mapState, mapMutations } from "vuex";
import Config from "@/config";
import Actions from "@/definitions/actions";
import Chords from "@/definitions/chords";
import createAction from "@/model/factories/action-factory";
import EventFactory from "@/model/factories/event-factory";
import { ACTION_NOTE_ON } from "@/model/types/audio-event";
import KeyboardService from "@/services/keyboard-service";
import Pitch from "@/services/audio/pitch";
import SelectBox from "@/components/forms/select-box.vue";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        SelectBox,
    },
    data: () => ({
        note: "C",
        octave: "3",
        chord: "major",
    }),
    computed: {
        ...mapState({
            selectedInstrument : state => state.editor.selectedInstrument,
        }),
        pitches() {
            return Pitch.OCTAVE_SCALE.map( value => ({ label: value, value }));
        },
        octaves() {
            const octaves = [];
            for ( let i = 1; i <= Config.MAX_OCTAVE; ++i ) {
                octaves.push( i.toString() );
            }
            return octaves.map( value => ({ label: value, value }));
        },
        chords() {
            return Object.keys( Chords ).map( label => ({ label, value: label }));
        },
    },
    created() {
        KeyboardService.setListener( this.handleKeyboardInput.bind( this ));
    },
    beforeDestroy() {
        KeyboardService.setListener( null );
    },
    methods: {
        ...mapMutations([
            "saveState",
        ]),
        handleKeyboardInput( type, keyCode ) {
            if ( type !== "down" ) {
                return false;
            }
            switch ( keyCode ) {
                default:
                    return false;
                case 27: // escape
                    this.handleClose();
                    break;
                case 13: // enter
                    this.handleConfirm();
                    break;
                case 49:
                    this.octave = "1";
                    break;
                case 50:
                    this.octave = "2";
                    break;
                case 51:
                    this.octave = "3";
                    break;
                case 52:
                    this.octave = "4";
                    break;
                case 53:
                    this.octave = "5";
                    break;
                case 54:
                    this.octave = "6";
                    break;
                case 55:
                    this.octave = "7";
                    break;
                case 56:
                    this.octave = "8";
                    break;
                case 90: // Z
                    this.note = "C";
                    break;
                case 83: // S
                    this.note = "C#";
                    break;
                case 88: // X
                    this.note = "D";
                    break;
                case 68: // D
                    this.note = "D#";
                    break;
                case 67: // C
                    this.note = "E";
                    break;
                case 86: // V
                    this.note = "F";
                    break;
                case 71: // G
                    this.note = "F#";
                    break;
                case 66: // B
                    this.note = "G";
                    break;
                case 72: // H
                    this.note = "G#";
                    break;
                case 78: // N
                    this.note = "A";
                    break;
                case 74: // J
                    this.note = "A#";
                    break;
                case 77: // M
                    this.note = "B";
                    break;
            }
            return true;
        },
        handleClose() {
            this.$emit( "close" );
        },
        handleConfirm() {
            const rootNoteIndex = Pitch.OCTAVE_SCALE.indexOf( this.note );
            const octave = parseFloat( this.octave );
            const notes = Chords[ this.chord ].map( interval => {
                return Pitch.OCTAVE_SCALE[( rootNoteIndex + interval ) % Pitch.OCTAVE_SCALE.length ];
            });
            this.saveState( createAction( Actions.ADD_EVENTS, {
                store  : this.$store,
                events : notes.map( note => {
                    return EventFactory.create( this.selectedInstrument, note, octave, ACTION_NOTE_ON )
                })
            }));
            this.handleClose();
        },
    },
};
</script>

<style lang="scss" scoped>
@use "sass:math";

@import "@/styles/_mixins";
@import "@/styles/forms";

$width: 450px;
$height: 300px;

.chord-generator-window {
    @include editorComponent();
    @include overlay();
    @include noSelect();
    padding: $spacing-small $spacing-large;
    border-radius: $spacing-small;
    box-shadow: 0 0 25px rgba(0,0,0,.5);

    .divider {
        width: calc(100% + #{$spacing-large * 2});
        margin-left: -$spacing-large;
        margin-bottom: $spacing-medium
    }

    @include componentIdeal( $width, $height ) {
        top: 50%;
        left: 50%;
        width: $width;
        height: $height;
        margin-left: math.div( -$width, 2 );
        margin-top: math.div( -$height, 2);
    }

    @include componentFallback( $width, $height ) {
        @include verticalScrollOnMobile();
        border-radius: 0;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        margin: 0;
    }

    .cursive {
        font-style: italic;
    }

    .chord-select {
        display: flex;
        align-items: center;

        .chord-select__input {
            margin-right: $spacing-small;
            width: 60px;

            &--large {
                width: 125px;
            }
        }
    }

    .confirm-button {
        width: 100%;
        padding: $spacing-medium $spacing-large;
    }
}
</style>
