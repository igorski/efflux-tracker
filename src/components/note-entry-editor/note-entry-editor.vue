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
    <div
        class="note-entry-editor"
        @mouseover="setHelpTopic('note-entry')"
     >
        <div class="section">
            <h3 v-t="'noteInput'" class="title"></h3>
            <ul class="keyboard">
                <li
                    v-for="noteName in notes"
                    :key="noteName"
                    class="keyboard--key"
                    :class="{
                        'sharp'    : noteName.includes( '#' ),
                        'selected' : note === noteName
                    }"
                    @mousedown="keyDown( noteName, $event )"
                    @mouseup="keyUp( noteName )"
                    @mouseout="keyUp( noteName, false )"
                    @mouseenter="isKeyDown && keyDown( noteName, $event )"
                    @touchstart="keyDown( noteName, $event )"
                    @touchend="keyUp( noteName )"
                    @touchcancel="keyUp( noteName )"
                ></li>
            </ul>
        </div>
        <div class="section">
            <h3 v-t="'octave'" class="title"></h3>
            <ul class="octaves">
                <form-list-item v-model.number="octave" @input="handleOctaveInput" :option-value="1">1</form-list-item>
                <form-list-item v-model.number="octave" @input="handleOctaveInput" :option-value="2">2</form-list-item>
                <form-list-item v-model.number="octave" @input="handleOctaveInput" :option-value="3">3</form-list-item>
                <form-list-item v-model.number="octave" @input="handleOctaveInput" :option-value="4">4</form-list-item>
                <form-list-item v-model.number="octave" @input="handleOctaveInput" :option-value="5">5</form-list-item>
                <form-list-item v-model.number="octave" @input="handleOctaveInput" :option-value="6">6</form-list-item>
                <form-list-item v-model.number="octave" @input="handleOctaveInput" :option-value="7">7</form-list-item>
                <form-list-item v-model.number="octave" @input="handleOctaveInput" :option-value="8">8</form-list-item>
            </ul>
        </div>
    </div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from "vuex";
import Config         from "@/config";
import EventUtil      from "@/utils/event-util";
import EventFactory   from "@/model/factory/event-factory";
import EventValidator from "@/model/validators/event-validator";
import FormListItem   from "@/components/forms/form-list-item.vue";
import Pitch          from "@/services/audio/pitch";
import InstrumentUtil from "@/utils/instrument-util";
import messages       from "./messages.json";
import { ACTION_NOTE_ON, ACTION_NOTE_OFF } from "@/model/types/audio-event-def";

const DEFAULT_NOTE   = "C";
const DEFAULT_OCTAVE = 3;

export default {
    i18n: { messages },
    components: {
        FormListItem,
    },
    data: () => ({
        instrument: 0,
        note: DEFAULT_NOTE,
        octave: DEFAULT_OCTAVE,
        isKeyDown: false,
    }),
    computed: {
        ...mapState({
            activeSong         : state => state.song.activeSong,
            activePattern      : state => state.sequencer.activePattern,
            selectedInstrument : state => state.editor.selectedInstrument,
            selectedStep       : state => state.editor.selectedStep,
        }),
        ...mapGetters([
            "isRecording",
        ]),
        instrumentSelectValue: {
            get() {
                return this.instrument.toString();
            },
            set( value ) {
                this.instrument = parseFloat( value );
            }
        },
        instrumentOptions() {
            const out = [];
            for ( let i = 0; i < Config.INSTRUMENT_AMOUNT; ++i ) {
                out.push({ label: this.$t( "instrument", { index: i + 1 }), value: i.toString() });
            }
            return out;
        },
        currentChannel() {
            const pattern = this.activeSong.patterns[ this.activePattern ];
            return pattern.channels[ this.selectedInstrument ];
        },
        /* optionally existing event at the current editor position */
        currentEvent() {
            return this.currentChannel[ this.selectedStep ];
        },
    },
    watch: {
        activePattern() {
            this.syncWithExisting();
        },
        selectedInstrument() {
            this.syncWithExisting();
        },
        selectedStep() {
            this.syncWithExisting();
        }
    },
    created() {
        this.notes = Pitch.OCTAVE_SCALE;
    },
    methods: {
        ...mapMutations([
            "addEventAtPosition",
            "setHelpTopic",
        ]),
        syncWithExisting() {
            // by default take the previously declared events instrument as the target instrument for the new event
            // otherwise take the active instrument as the target instrument

            const previousEvent = EventUtil.getFirstEventBeforeStep( this.currentChannel, this.selectedStep, previousEvent => {
                // ignore off events as they do not specify an instrument
                return previousEvent.action !== ACTION_NOTE_OFF;
            });
            this.instrument = ( previousEvent ) ? previousEvent.instrument : this.selectedInstrument;

            if ( this.currentEvent ) {
                this.note   = this.currentEvent.note;
                this.octave = this.currentEvent.octave;
            }
        },
        handleOctaveInput() {
            // if there is an event at the current position, update it with the new octave
            if ( this.currentEvent ) {
                this.addNoteToPattern( this.currentEvent.note );
            }
        },
        addNoteToPattern( note ) {
            const eventData = {
                instrument: this.instrument,
                octave: this.octave,
                note
            };
            if ( !EventValidator.hasContent( eventData )) {
                return;
            }

            let event = this.currentEvent;
            const isNewEvent = !event;

            if ( isNewEvent ) {
                event = EventFactory.createAudioEvent();
            }
            this.addEventAtPosition({
                store: this.$store,
                event: { ...event, ...eventData, action: ACTION_NOTE_ON },
                optData: {
                    patternIndex : this.activePattern,
                    channelIndex : this.selectedInstrument,
                    step         : this.selectedStep,
                    newEvent     : isNewEvent
                }
            });
        },
        keyDown( note, event ) {
            InstrumentUtil.onKeyDown(
                { note, octave: this.octave }, this.activeSong.instruments[ this.instrument ],
                this.isRecording, this.$store
            );
            event.preventDefault(); // prevents touchstart firing mousedown/
            this.isKeyDown = true;
        },
        keyUp( note, unsetDownState = true ) {
            if ( InstrumentUtil.onKeyUp({ note, octave: this.octave }, this.$store ) && unsetDownState ) {
                this.isKeyDown = false;
            }
        },
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";

.note-entry-editor {
    @include noSelect();
    @include boxSize();
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX( -50% );
    background-color: $color-editor-background;
    height: $note-entry-editor-height;
    padding: $spacing-small $spacing-large;
    border-top: 2px solid $color-background;

    .divider {
        width: calc(100% + #{$spacing-large * 2});
        margin: $spacing-medium 0 $spacing-medium -#{$spacing-large};
    }

    @include mobile() {
        z-index: 10;
        padding: $spacing-small $spacing-medium;
    }
}

.section {
    display: inline-block;
    vertical-align: top;
}

.title {
    @include toolFont();
    margin-top: 0;
}

.keyboard {
    @include list();
    display: inline-block;
    position: relative;
    vertical-align: top;
    width: 300px;
    height: 50%;
    margin-bottom: $spacing-small;

    @include mobile() {
        width: auto;
        margin-left: $spacing-small;
        height: calc(100% - #{$spacing-xlarge});
    }

    &--key {
        display: inline-block;
        cursor: pointer;
        position: relative;
        width: 11.111%;
        height: 75%;
        background-color: #666;
        vertical-align: top;
        margin-right: $spacing-small;

        &.sharp {
            position: absolute;
            z-index: 100;
            width: 12.5%;
            background-color: #000;
            transform-origin: center top;
            transform: translateX( -50% ) scale( 0.6 );
        }

        @include mobile() {
            min-width: 42px;
            &.sharp {
                transform: translateX( -50% ) scale( 1, 0.6 );
            }
        }

        &.selected {
            background-color: $color-1;
        }

        &:hover {
            background-color: #FFF;
        }

        &:after {
            position: absolute;
            bottom: $spacing-small;
            left: $spacing-small;
            pointer-events: none;
        }
    }
}

.octaves {
    @include list();
    @include toolFont();
    text-transform: uppercase;
    text-indent: $spacing-small;
    display: inline-block;

    li {
        display: inline-block;
        border: 2px solid #666;
        padding: $spacing-small $spacing-medium $spacing-small $spacing-xsmall;
        margin: $spacing-xsmall $spacing-small 0 0;
        cursor: pointer;

        &.selected {
            background-color: $color-1;
            color: #000;
        }

        &:hover {
            background-color: #FFF;
            color: #000;
        }
    }
}
</style>
