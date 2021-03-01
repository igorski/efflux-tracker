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
    <div class="note-entry-editor">
        <ul class="keyboard-notes">
            <form-list-item v-model="note" @input="handleNoteInput" option-value="C"  class="C"></form-list-item>
            <form-list-item v-model="note" @input="handleNoteInput" option-value="C#" class="CS sharp"></form-list-item>
            <form-list-item v-model="note" @input="handleNoteInput" option-value="D"  class="D"></form-list-item>
            <form-list-item v-model="note" @input="handleNoteInput" option-value="D#" class="DS sharp"></form-list-item>
            <form-list-item v-model="note" @input="handleNoteInput" option-value="E"  class="E"></form-list-item>
            <form-list-item v-model="note" @input="handleNoteInput" option-value="F"  class="F"></form-list-item>
            <form-list-item v-model="note" @input="handleNoteInput" option-value="F#" class="FS sharp"></form-list-item>
            <form-list-item v-model="note" @input="handleNoteInput" option-value="G"  class="G"></form-list-item>
            <form-list-item v-model="note" @input="handleNoteInput" option-value="G#" class="GS sharp"></form-list-item>
            <form-list-item v-model="note" @input="handleNoteInput" option-value="A"  class="A"></form-list-item>
            <form-list-item v-model="note" @input="handleNoteInput" option-value="A#" class="AS sharp"></form-list-item>
            <form-list-item v-model="note" @input="handleNoteInput" option-value="B"  class="B"></form-list-item>
        </ul>
        <ul class="keyboard-octaves">
            <form-list-item v-model.number="octave" :option-value="1">1</form-list-item>
            <form-list-item v-model.number="octave" :option-value="2">2</form-list-item>
            <form-list-item v-model.number="octave" :option-value="3">3</form-list-item>
            <form-list-item v-model.number="octave" :option-value="4">4</form-list-item>
            <form-list-item v-model.number="octave" :option-value="5">5</form-list-item>
            <form-list-item v-model.number="octave" :option-value="6">6</form-list-item>
            <form-list-item v-model.number="octave" :option-value="7">7</form-list-item>
            <form-list-item v-model.number="octave" :option-value="8">8</form-list-item>
        </ul>
    </div>
</template>

<script>
import { mapState, mapMutations } from "vuex";
import Config          from "@/config";
import EventUtil       from "@/utils/event-util";
import EventFactory    from "@/model/factory/event-factory";
import EventValidator  from "@/model/validators/event-validator";
import FormListItem    from "@/components/forms/form-list-item.vue";
import messages        from "./messages.json";
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
    }),
    computed: {
        ...mapState({
            activeSong         : state => state.song.activeSong,
            activePattern      : state => state.sequencer.activePattern,
            selectedInstrument : state => state.editor.selectedInstrument,
            selectedStep       : state => state.editor.selectedStep,
        }),
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
        }
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
    methods: {
        ...mapMutations([
            'addEventAtPosition',
        ]),
        syncWithExisting() {
            // we define these upfront as we assume that the position the sequencer had (when running) is
            // where we would like to add/edit a note event
            // get existing event, if there was one

            const pattern = this.activeSong.patterns[this.activePattern],
                  channel = pattern.channels[this.selectedInstrument],
                  event   = channel[this.selectedStep];

            // by default take the previously declared events instrument as the target instrument for the new event
            // otherwise take the active instrument as the target instrument

            const previousEvent = EventUtil.getFirstEventBeforeStep(channel, this.selectedStep, previousEvent => {
                // ignore off events as they do not specify an instrument
                return previousEvent.action !== ACTION_NOTE_OFF;
            });
            this.instrument = ( previousEvent ) ? previousEvent.instrument : this.selectedInstrument;

            if ( event ) {
                this.note   = event.note;
                this.octave = event.octave;
            }
        },
        handleNoteInput( note ) {
            console.warn("note changed to " + note);
            const eventData = {
                instrument: this.instrument,
                octave: this.octave,
                note
            };
            if ( !EventValidator.hasContent( eventData )) {
                return;
            }

            const pattern = this.activeSong.patterns[this.activePattern],
                  channel = pattern.channels[this.selectedInstrument];

            let event        = channel[ this.selectedStep ];
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
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";

.note-entry-editor {
    @include editorComponent();
    @include noSelect();
    width: 100%;
    position: absolute;
    bottom: 0;
    left: 0;
    height: $note-entry-editor-height;
    padding: $spacing-small $spacing-large;
    border-radius: $spacing-small;
    box-shadow: 0 0 25px rgba(0,0,0,.5);

    .divider {
        width: calc(100% + #{$spacing-large * 2});
        margin: $spacing-medium 0 $spacing-medium -#{$spacing-large};
    }
}

.keyboard-notes {
    @include list();
    display: inline-block;
    position: relative;
    vertical-align: top;
    width: 300px;
    height: 100px;
    margin-bottom: $spacing-small;

    li {
        display: inline-block;
        cursor: pointer;
        position: relative;
        width: 11.111%;
        height: 100%;
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

        &.selected, &:hover {
            background-color: #FFF;
        }

        &:after {
            position: absolute;
            bottom: $spacing-small;
            left: $spacing-small;
            pointer-events: none;
        }

        &.C:after {
            content: "C";
        }
        &.CS:after {
            content: "C#";
        }
        &.D:after {
            content: "D";
        }
        &.DS:after {
            content: "D#";
        }
        &.E:after {
            content: "E";
        }
        &.F:after {
            content: "F";
        }
        &.FS:after {
            content: "F#";
        }
        &.G:after {
            content: "G";
        }
        &.GS:after {
            content: "G#";
        }
        &.A:after {
            content: "A";
        }
        &.AS:after {
            content: "A#";
        }
        &.B:after {
            content: "B";
        }
    }
}

.keyboard-octaves {
    @include list();
    text-transform: uppercase;
    text-indent: $spacing-small;
    display: inline-block;

    li {
        float: left;
        border: 2px solid #666;
        padding: $spacing-small $spacing-medium $spacing-small $spacing-xsmall;
        margin: $spacing-xsmall;
        cursor: pointer;

        &.selected, &:hover {
            background-color: #FFF;
            color: #000;
        }
    }
}

.confirm-button {
    @include button();
    width: 100%;
    padding: $spacing-medium $spacing-large;
}
</style>
