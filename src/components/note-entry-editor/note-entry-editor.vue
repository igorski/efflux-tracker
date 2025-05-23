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
        class="note-entry-editor"
        :class="{ large: largeView }"
        @mouseover="setHelpTopic('note-entry')"
     >
        <div class="note-entry-editor__keyboard">
            <h3 v-t="'noteInput'" class="title"></h3>
            <ul
                class="keyboard"
                @mouseleave="killAllNotes()"
            >
                <li
                    v-for="noteData in mappedNotes"
                    :key="noteData.key"
                    class="keyboard__key"
                    :class="{
                        'sharp'  : noteData.sharp,
                        'active' : displayAsActive( noteData ),
                        'higher' : noteData.higher
                    }"
                    @pointerdown="keyDown( noteData, $event )"
                    @pointerup="keyUp( noteData, $event )"
                    @pointerleave="keyUp( noteData, $event, false )"
                    @pointerenter="isKeyDown && keyDown( noteData, $event )"
                    @touchstart="keyDown( noteData, $event )"
                    @touchend="keyUp( noteData, $event )"
                    @touchcancel="keyUp( noteData, $event )"
                >
                    <span class="keyboard__key-name">{{ noteData.key }}</span>
                </li>
            </ul>
        </div>
        <div class="note-entry-editor__octaves">
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
            <div class="large-view-control">
                <label v-t="'expand'" class="large-view-control__title"></label>
                <toggle-button
                    v-model="largeView"
                    sync
                />
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { mapState, mapGetters, mapMutations } from "vuex";
import ToggleButton from "@/components/third-party/vue-js-toggle-button/ToggleButton.vue";
import Config from "@/config";
import EventUtil from "@/utils/event-util";
import EventFactory from "@/model/factories/event-factory";
import { type EffluxAudioEvent } from "@/model/types/audio-event";
import { type EffluxChannel } from "@/model/types/channel";
import EventValidator from "@/model/validators/event-validator";
import FormListItem from "@/components/forms/form-list-item.vue";
import Pitch from "@/services/audio/pitch";
import NoteInputHandler from "@/services/keyboard/note-input-handler";
import InstrumentUtil from "@/utils/instrument-util";
import messages from "./messages.json";
import { ACTION_NOTE_ON, ACTION_NOTE_OFF } from "@/model/types/audio-event";

type MappedNoteData = {
    name: string;
    sharp: boolean;
    key: string;
    higher: boolean;
};

export default {
    i18n: { messages },
    components: {
        FormListItem,
        ToggleButton,
    },
    data: () => ({
        largeView: false,
        instrument: 0,
        note: null,
        isKeyDown: false,
        playingNotes  : [], // notes where the playback was triggered by mouse/touch in this component
        keyboardNotes : [], // notes where the playback was triggered externally using the keyboard
    }),
    computed: {
        ...mapState({
            activeSong           : state => state.song.activeSong,
            currentStep          : state => state.sequencer.currentStep,
            higherKeyboardOctave : state => state.editor.higherKeyboardOctave,
            playing              : state => state.sequencer.playing,
            selectedInstrument   : state => state.editor.selectedInstrument,
            selectedStep         : state => state.editor.selectedStep,
        }),
        ...mapGetters([
            "activePatternIndex",
            "isRecording",
        ]),
        octave: {
            get(): number {
                return this.higherKeyboardOctave;
            },
            set( value: number ): void {
                this.setHigherKeyboardOctave( value );
            }
        },
        mappedNotes(): MappedNoteData[] {
            // create a 1.5 octave scale
            return [ ...Pitch.OCTAVE_SCALE, ...Pitch.OCTAVE_SCALE.slice( 0, 5 )].map(( name, index ) => {
                const isHigherOctave = index > 11;
                return {
                    name,
                    sharp  : name.includes( "#" ),
                    key    : NoteInputHandler.keyForNote( name, isHigherOctave ),
                    higher : isHigherOctave,
                };
            });
        },
        instrumentSelectValue: {
            get(): string {
                return this.instrument.toString();
            },
            set( value: string ): void {
                this.instrument = parseFloat( value );
            }
        },
        instrumentOptions(): { label: string, value: string }[] {
            const out = [];
            for ( let i = 0; i < Config.INSTRUMENT_AMOUNT; ++i ) {
                out.push({ label: this.$t( "instrument", { index: i + 1 }), value: i.toString() });
            }
            return out;
        },
        currentChannel(): EffluxChannel {
            const pattern = this.activeSong.patterns[ this.activePatternIndex ];
            return pattern.channels[ this.selectedInstrument ];
        },
        /* optionally existing event at the current editor position */
        currentEvent(): EffluxAudioEvent | undefined {
            return this.currentChannel[ this.selectedStep ];
        },
    },
    watch: {
        activePatternIndex(): void {
            this.syncWithExisting();
        },
        selectedInstrument(): void {
            this.syncWithExisting();
        },
        selectedStep(): void {
            this.syncWithExisting();
        },
        higherKeyboardOctave: {
            immediate: true,
            handler( value: number ): void {
                if ( !this.currentEvent ) {
                    this.octave = value;
                }
            }
        }
    },
    created(): void {
        NoteInputHandler.registerHandler( this.handleKeyboardEntry.bind( this ));
        // const { width, height } = this.$store.state.windowSize;
        // if ( width > 900 && height > 900 ) {
        //     this.largeView = true;
        // }
    },
    beforeUnmount(): void {
        NoteInputHandler.unregisterHandler();
        this.killAllNotes();
    },
    methods: {
        ...mapMutations([
            "addEventAtPosition",
            "setHelpTopic",
            "setHigherKeyboardOctave",
            "setSelectedStep",
        ]),
        syncWithExisting(): void {
            // by default take the previously declared events instrument as the target instrument for the new event
            // otherwise take the active instrument as the target instrument

            const previousEvent = EventUtil.getFirstEventBeforeStep( this.currentChannel, this.selectedStep, previousEvent => {
                // ignore off events as they do not specify an instrument
                return previousEvent.action !== ACTION_NOTE_OFF;
            });
            this.instrument = ( previousEvent ) ? previousEvent.instrument : this.selectedInstrument;

            if ( this.currentEvent ) {
                this.note   = this.currentEvent.note;
                this.octave = this.currentEvent.octave || this.higherKeyboardOctave;
            }
        },
        handleOctaveInput(): void {
            // in record mode, when there is an event at the current position, update it with the new octave
            if ( this.currentEvent && this.isRecording ) {
                this.addNoteToPattern( this.currentEvent.note );
            }
        },
        addNoteToPattern( note: string, stayAtCurrentStep = false ): void {
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
                event = EventFactory.create();
            }
            const step = this.selectedStep;
            this.addEventAtPosition({
                store: this.$store,
                event: { ...event, ...eventData, action: ACTION_NOTE_ON },
                optData: {
                    patternIndex : this.activePatternIndex,
                    channelIndex : this.selectedInstrument,
                    newEvent     : isNewEvent,
                    step
                }
            });
            if ( stayAtCurrentStep ) {
                this.setSelectedStep( step );
            }
        },
        killAllNotes(): void {
            this.playingNotes.forEach( playingNote => {
                InstrumentUtil.onKeyUp( playingNote, this.$store );
            });
            this.playingNotes.splice( 0 );
            this.isKeyDown = false;
        },
        keyDown({ name, higher }: { name: string, higher: boolean }, event: PointerEvent ): void {
            event.preventDefault(); // prevents touchstart firing mousedown in succession
            event.pointerId && event.target.releasePointerCapture( event.pointerId );
            const noteEvent = { note: name, octave: higher ? this.octave + 1 : this.octave };
            InstrumentUtil.onKeyDown(
                noteEvent, this.activeSong.instruments[ this.instrument ],
                this.$store, this.isRecording
            );
            this.playingNotes.push( noteEvent );
            this.isKeyDown = true;
        },
        keyUp({ name }: { name: string }, event: PointerEvent, unsetDownState = true ): void {
            event.preventDefault();
            // we find the event that is currently playing for this key by its note (and not
            // by the current octave, as during sequencer playback the octave might have been
            // adjusted to match the last played note in the pattern)
            const noteEvent = this.playingNotes.find( noteEvent => noteEvent.note === name );
            if ( !noteEvent ) {
                return;
            }
            const index = this.playingNotes.indexOf( noteEvent );
            this.playingNotes.splice( index, 1 );
            if ( InstrumentUtil.onKeyUp( noteEvent, this.$store ) && unsetDownState ) {
                // we manage the down state separately from the amount of notes in
                // the playingNotes list as we want to allow legato playing when
                // moving from one key to the other
                this.isKeyDown = this.playingNotes.length > 0;
            }
        },
        /**
         * Invoked whenever the user is using the keys of the computer
         * keyboard to play notes. This can be used to highlight the currently
         * playing notes in the keyboard UI.
         */
        handleKeyboardEntry( type: string, audioEvent: EffluxAudioEvent ): void {
            const id = `${audioEvent.note}${audioEvent.octave}`;
            if ( type === "on" && !this.keyboardNotes.includes( id )) {
                this.keyboardNotes.push( id );
            }
            if ( type === "off" ) {
                const index = this.keyboardNotes.indexOf( id );
                if ( index > -1 ) {
                    this.keyboardNotes.splice( index, 1 );
                }
            }
        },
        displayAsActive( noteData: MappedNoteData ): boolean {
            const octave = noteData.higher ? this.octave + 1 : this.octave;
            const id = `${noteData.name}${octave}`;
            if ( this.keyboardNotes.includes( id )) {
                return true;
            }
            return noteData.name === this.note && !noteData.higher;
        },
    }
};
</script>

<style lang="scss" scoped>
@use "@/styles/_colors";
@use "@/styles/_mixins";
@use "@/styles/_variables";
@use "@/styles/typography";

$largeWidth: 700px;

.note-entry-editor {
    @include mixins.noSelect();
    @include mixins.boxSize();
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX( -50% );
    background-color: colors.$color-editor-background;
    height: variables.$note-entry-editor-height;
    padding: variables.$spacing-small variables.$spacing-large 0;
    border-top: 2px solid colors.$color-background;

    @include mixins.large() {
        display: flex;
        flex-direction: row;
    }

    .divider {
        width: calc(100% + #{variables.$spacing-large * 2});
        margin: variables.$spacing-medium 0 variables.$spacing-medium -#{variables.$spacing-large};
    }

    @include mixins.mobile() {
        z-index: variables.$z-keyboard;
        padding: variables.$spacing-small variables.$spacing-medium;
        width: 100% !important;
    }

    &.large {
        height: variables.$note-entry-editor-height-expanded;

        .keyboard {
            width: $largeWidth;
            height: 112px;

            &__key {
                height: 100%;

                &.sharp {
                    height: 60%;
                }
            }
        }
    }
}

.note-entry-editor__keyboard {
    vertical-align: top;
}

.note-entry-editor__octaves {
    vertical-align: top;

    @include mixins.mobile() {
        display: none;
    }
}

.title {
    @include typography.toolFont();
    margin-top: 0;
}

.keyboard {
    $keyboardWidth: 425px; // ideal width for 1.5 octaves
    @include mixins.list();
    display: inline-block;
    position: relative;
    vertical-align: top;
    width: $keyboardWidth;
    height: variables.$spacing-xlarge + variables.$spacing-small;
    margin-bottom: variables.$spacing-small;

    &__key {
        display: inline-block;
        cursor: pointer;
        position: relative;
        width: 7.835%;
        height: 75%;
        background-color: #666;
        vertical-align: top;
        margin-right: variables.$spacing-small;

        &.sharp {
            position: absolute;
            z-index: 1;
            margin: 0 0 0 -5%;
            // smaller size than normal key
            width: 7%;
            height: 45%;
            background-color: #000;
        }

        &-name {
            position: absolute;
            bottom: 0;
            left: variables.$spacing-xsmall;
            @include typography.toolFont();
        }

        &.active {
            background-color: colors.$color-1;
            color: #000;
        }

        &:hover {
            background-color: #FFF;
        }

        &:after {
            position: absolute;
            bottom: variables.$spacing-small;
            left: variables.$spacing-small;
            pointer-events: none;
        }
    }

    @include mixins.minWidthFallback( $keyboardWidth ) {
        width: 100%;
        margin-left: variables.$spacing-small;

        &__key {
            width: 11.111%; // just a single octave

            max-width: 42px;
            &.sharp {
                width: 11.111%;
                margin-left: -7%;
            }
            &.higher,
            &-name {
                display: none;
            }
        }
    }
}

.octaves {
    @include mixins.list();
    @include typography.toolFont();
    text-transform: uppercase;
    display: flex;

    li {
        border: 2px solid #666;
        padding: variables.$spacing-small variables.$spacing-medium variables.$spacing-small variables.$spacing-xsmall;
        margin: variables.$spacing-xsmall variables.$spacing-small 0 0;
        text-indent: variables.$spacing-small;
        cursor: pointer;

        &.selected {
            background-color: colors.$color-1;
            color: #000;
        }

        &:hover {
            background-color: #FFF;
            color: #000;
        }
    }
}

.large-view-control {
    position: absolute;
    top: variables.$spacing-medium;
    right: variables.$spacing-small;

    @include mixins.minWidthFallback( $largeWidth ) {
        display: none;
    }

    &__title {
        @include typography.toolFont();
        margin-right: variables.$spacing-small;
    }
}
</style>
