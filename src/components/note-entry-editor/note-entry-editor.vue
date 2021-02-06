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
    <div>
        <div class="note-entry-editor">
            <div class="header">
                <h4 v-t="'title'" class="title"></h4>
                <select-box
                    v-model.number="instrumentSelectValue"
                    class="instrument-selector"
                    :options="instrumentOptions"
                />
                <button type="button"
                        class="help-button"
                        @click="handleHelp"
                >?</button>
                <button type="button"
                        class="close-button"
                        @click="handleClose"
                >x</button>
            </div>
            <hr class="divider" />
            <ul id="keyboardNotes">
                <form-list-item v-model="note" option-value="C"  class="C"></form-list-item>
                <form-list-item v-model="note" option-value="C#" class="CS sharp"></form-list-item>
                <form-list-item v-model="note" option-value="D"  class="D"></form-list-item>
                <form-list-item v-model="note" option-value="D#" class="DS sharp"></form-list-item>
                <form-list-item v-model="note" option-value="E"  class="E"></form-list-item>
                <form-list-item v-model="note" option-value="F"  class="F"></form-list-item>
                <form-list-item v-model="note" option-value="F#" class="FS sharp"></form-list-item>
                <form-list-item v-model="note" option-value="G"  class="G"></form-list-item>
                <form-list-item v-model="note" option-value="G#" class="GS sharp"></form-list-item>
                <form-list-item v-model="note" option-value="A"  class="A"></form-list-item>
                <form-list-item v-model="note" option-value="A#" class="AS sharp"></form-list-item>
                <form-list-item v-model="note" option-value="B"  class="B"></form-list-item>
            </ul>
            <ul id="octaves">
                <form-list-item v-model.number="octave" :option-value="1">1</form-list-item>
                <form-list-item v-model.number="octave" :option-value="2">2</form-list-item>
                <form-list-item v-model.number="octave" :option-value="3">3</form-list-item>
                <form-list-item v-model.number="octave" :option-value="4">4</form-list-item>
                <form-list-item v-model.number="octave" :option-value="5">5</form-list-item>
                <form-list-item v-model.number="octave" :option-value="6">6</form-list-item>
                <form-list-item v-model.number="octave" :option-value="7">7</form-list-item>
                <form-list-item v-model.number="octave" :option-value="8">8</form-list-item>
            </ul>
            <p v-t="'fastEditExpl'" class="explanation"></p>
            <button v-t="'ok'"
                    type="button"
                    class="confirm-button"
                    @click="handleSubmit"
            ></button>
        </div>
    </div>
</template>

<script>
import { mapState, mapMutations } from "vuex";
import Config          from "@/config";
import KeyboardService from "@/services/keyboard-service";
import EventUtil       from "@/utils/event-util";
import EventFactory    from "@/model/factory/event-factory";
import EventValidator  from "@/model/validators/event-validator";
import ManualURLs      from "@/definitions/manual-urls";
import FormListItem    from "@/components/forms/form-list-item.vue";
import SelectBox       from "@/components/forms/select-box";
import messages        from "./messages.json";
import { ACTION_NOTE_ON, ACTION_NOTE_OFF } from "@/model/types/audio-event-def";

const DEFAULT_NOTE   = "C";
const DEFAULT_OCTAVE = 3;

export default {
    i18n: { messages },
    components: {
        FormListItem,
        SelectBox
    },
    data: () => ({
        instrument: 0,
        note: DEFAULT_NOTE,
        octave: DEFAULT_OCTAVE,
        patternIndex: 0,
        channelIndex: 0,
        step: 0,
    }),
    computed: {
        ...mapState({
            activeSong: state => state.song.activeSong,
            activePattern: state => state.sequencer.activePattern,
            selectedInstrument: state => state.editor.selectedInstrument,
            selectedStep: state => state.editor.selectedStep,
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
                out.push({ label: this.$t( "instrument", { num: i }), value: i.toString() });
            }
            return out;
        }
    },
    created() {
        // we define these upfront as we assume that the position the sequencer had (when running) is
        // where we would like to add/edit a note event

        this.patternIndex = this.activePattern;
        this.step         = this.selectedStep;
        // always use selected channel index (the events instrument might be associated w/ different channel lane)
        this.channelIndex = this.selectedInstrument;

        // use our own custom keyboard handler for easy editing

        KeyboardService.setBlockDefaults(false);
        KeyboardService.setListener(this.handleKey);

        // get existing event, if there was one

        const pattern = this.activeSong.patterns[this.patternIndex],
              channel = pattern.channels[this.channelIndex],
              event   = channel[this.selectedStep];

        // by default take the previously declared events instrument as the target instrument for the new event
        // otherwise take the active instrument as the target instrument

        const previousEvent = EventUtil.getFirstEventBeforeStep(channel, this.selectedStep, previousEvent => {
            // ignore off events as they do not specify an instrument
            return previousEvent.action !== ACTION_NOTE_OFF;
        });
        this.instrument = ( previousEvent ) ? previousEvent.instrument : this.selectedInstrument;

        if ( event ) {
            this.instrument = event.instrument;
            this.note = event.note;
            this.octave = event.octave;
            this.patternIndex = event.seq.startMeasure;
        }
    },
    beforeDestroy() {
        KeyboardService.reset();
    },
    methods: {
        ...mapMutations([
            'addEventAtPosition',
        ]),
        handleClose() {
            this.$emit('close');
        },
        handleHelp() {
            window.open( ManualURLs.NOTE_ENTRY_HELP, "_blank" );
        },
        handleKey(type, keyCode/*, event*/) {
            if (type !== 'down') {
                return;
            }
            switch ( keyCode ) {
                case 27: // escape
                    this.handleClose();
                    break;

                case 13: // enter
                    this.handleSubmit();
                    break;

                /* notes */

                case 67: // C
                    this.note = ( this.note === 'C' ) ? 'C#' : 'C'; // jump between C and C#
                    break;

                case 68: // D
                    this.note = ( this.note === 'D' ) ? 'D#' : 'D'; // jump between D and D#
                    break;

                case 69: // E
                    this.note = 'E';
                    break;

                case 70: // F
                    this.note = ( this.note === 'F' ) ? 'F#' : 'F'; // jump between F and F#
                    break;

                case 71: // G
                    this.note = ( this.note === 'G' ) ? 'G#' : 'G'; // jump between C and C#
                    break;

                case 65: // A
                    this.note = ( this.note === 'A' ) ? 'A#' : 'A'; // jump between A and A#
                    break;

                case 66: // B
                    this.note = 'B';
                    break;

                /* octaves */

                case 49: this.octave = 1; break;
                case 50: this.octave = 2; break;
                case 51: this.octave = 3; break;
                case 52: this.octave = 4; break;
                case 53: this.octave = 5; break;
                case 54: this.octave = 6; break;
                case 55: this.octave = 7; break;
                case 56: this.octave = 8; break;
            }
        },
        handleSubmit() {
            const eventData = {
                instrument: this.instrument,
                note: this.note,
                octave: this.octave,
            };
            if (!EventValidator.hasContent(eventData)) {
                return;
            }

            const pattern = this.activeSong.patterns[this.patternIndex],
                  channel = pattern.channels[this.channelIndex];

            let event        = channel[ this.step ];
            const isNewEvent = !event;

            if ( isNewEvent )
                event = EventFactory.createAudioEvent();

            this.addEventAtPosition({
                store: this.$store,
                event: { ...event, ...eventData, action: ACTION_NOTE_ON },
                optData: {
                    patternIndex : this.patternIndex,
                    channelIndex : this.channelIndex,
                    step         : this.step,
                    newEvent     : isNewEvent
                }
            });
            this.handleClose();
        }
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/_variables.scss";
@import "@/styles/_layout.scss";

$width: 445px;
$height: 370px;

.note-entry-editor {
    @include editorComponent();
    @include overlay();
    @include noSelect();
    @include boxSize();
    padding: $spacing-small $spacing-large;
    border-radius: $spacing-small;
    box-shadow: 0 0 25px rgba(0,0,0,.5);

    .divider {
        width: calc(100% + #{$spacing-large * 2});
        margin: 0 0 $spacing-medium -#{$spacing-large};
    }
}

.title {
    margin: $spacing-medium 0;
}

.explanation {
    margin-top: $spacing-medium;
    display: inline-block;
}

.instrument-selector {
    position: absolute;
    top: $spacing-medium + 1;
    right: ( $spacing-xlarge * 2 - $spacing-xsmall );
    width: 120px;
}

#keyboardNotes {
    position: relative;
    width: 100%;
    height: 100px;
    margin-bottom: $spacing-small;
    margin-left: 6.5%;

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

#octaves {
    text-transform: uppercase;
    text-indent: $spacing-small;
    float: left;
    width: 100%;
    margin-left: 5%;

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
    width: 100%;
    padding: $spacing-medium $spacing-large;
}

@media screen and ( min-width: $width ) and ( min-height: $height ) {
    .note-entry-editor {
        top: 50%;
        left: 50%;
        width: $width;
        height: $height;
        margin-left: -( $width / 2 );
        margin-top: -( $height / 2);
    }
}

@media screen and ( max-width: $width ), ( max-height: $height ) {
    .note-entry-editor {
        top: 0;
        left: 0;
        margin: 0;
        border-radius: 0;
        width: 100%;
        @include verticalScrollOnMobile();
    }
}
</style>
