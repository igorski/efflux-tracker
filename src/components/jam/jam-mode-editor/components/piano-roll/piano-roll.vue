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
    <div class="piano-roll">
        <section class="header">
            <h2 class="header__title">{{ title }}</h2>
            <button
                type="button"
                class="close-button"
                @click="$emit('close')"
            >x</button>
        </section>
        <hr class="divider" />
        <section class="piano-roll__body">
            <table class="piano-roll__table">
                <tbody>
                    <piano-roll-row
                        v-for="(row) in rows"
                        :key="`${row.note}_${row.octave}`"
                        :note="row.note"
                        :octave="row.octave"
                        :events="row.events"
                        :columns="columnAmount"
                        :playing-step="playingStep"
                        class="piano-roll__table-row"
                        :class="{
                            'piano-roll__table-row--sharp': row.note.includes( '#' )
                        }"
                        @note:add="handleNoteAdd( row, $event )"
                        @note:move="handleNoteMove( row, $event )"
                        @note:delete="handleNoteDelete( row, $event )"
                        @note:resize="handleNoteResize( row, $event )"
                    />
                </tbody>
            </table>
        </section>
    </div>
</template>

<script lang="ts">
import { mapState, mapGetters, mapMutations } from "vuex";
import Config from "@/config";
import PianoRollRow, { type SerializedRowEvent } from "./components/piano-roll-row.vue";
import moveEvent from "@/model/actions/event-move";
import resizeEvent from "@/model/actions/event-resize";
import EventFactory from "@/model/factories/event-factory";
import { type EffluxAudioEvent, ACTION_NOTE_ON, ACTION_NOTE_OFF } from "@/model/types/audio-event";
import { type Instrument } from "@/model/types/instrument";
import { type Pattern } from "@/model/types/pattern";
import Pitch from "@/services/audio/pitch";
import EventUtil from "@/utils/event-util";

export type PianoRollEvent = {
    event: EffluxAudioEvent;
    step: number;
    length: number;
};

type PianoRollRow = {
    note: string;
    octave: number;
    events: PianoRollEvent[];
};

export default {
    components: {
        PianoRollRow,
    },
    computed: {
        ...mapState({
            selectedInstrument : state => state.editor.selectedInstrument,
            currentStep        : state => state.sequencer.currentStep,
            jam                : state => state.sequencer.jam,
            stepPrecision      : state => state.sequencer.stepPrecision,
        }),
        ...mapGetters([
            "activeSong",
        ]),
        playingPatternIndex(): number {
            return this.jam[ this.selectedInstrument ].playingPatternIndex;
        },
        instrument(): Instrument {
            return this.activeSong.instruments[ this.selectedInstrument ];
        },
        title(): string {
            let { name, presetName } = this.instrument;
            if ( name.startsWith( "Instrument ")) {
                // instrument has preset, use its name
                name = ( presetName || name || "" ).replace( "FACTORY ", "" );
            }
            return `${name} - ${this.playingPatternIndex + 1}`;
        },
        pattern(): Pattern {
            return this.activeSong.patterns[ this.playingPatternIndex ];
        },
        patternEvents(): EffluxAudioEvent[] {
            return this.pattern.channels[ this.selectedInstrument ];
        },
        rows(): PianoRollRow[] {
            const out: PianoRollRow[] = [];
            for ( let octave = 1; octave <= Config.MAX_OCTAVE; ++octave ) {
                for ( const note of Pitch.OCTAVE_SCALE ) {
                    const events: PianoRollEvent[] = this.patternEvents.map(( event, index ) => {
                        if ( event?.note === note && event?.octave === octave ) {
                            let length = 1;
                            for ( let i = index + 1, l = this.patternEvents.length; i < l; ++i ) {
                                if ( this.patternEvents[ i ]) {
                                    break;
                                }
                                ++length;
                            }
                            return { event, length, step: index };
                        }
                        return undefined;
                    }).filter( Boolean );

                    out.push({ note, octave, events });
                }
            }
            return out.reverse();
        },
        columnAmount(): number {
            return this.pattern.steps;
        },
        playingStep(): number {
            const stepsInPattern = this.pattern.steps + 1;
            const diff = this.stepPrecision / stepsInPattern;

            return Math.floor( this.currentStep / diff ) % stepsInPattern;
        },
    },
    methods: {
        ...mapMutations([
            "addEventAtPosition",
            "saveState",
        ]),
        handleNoteAdd( row: PianoRollRow, step: number ): void {
            this.addEventAtPosition({
                event : EventFactory.create( this.selectedInstrument, row.note, row.octave, ACTION_NOTE_ON ),
                store : this.$store,
                optData: {
                    patternIndex : this.playingPatternIndex,
                    channelIndex : this.selectedInstrument,
                    short: true,
                    step,
                }
            });
        },
        handleNoteMove( row: PianoRollRow, { payload, newStep } : { payload: SerializedRowEvent, newStep: number }): void {
            this.saveState( moveEvent( this.$store, {
                patternIndex: this.playingPatternIndex,
                channelIndex: this.selectedInstrument,
                oldStep: payload.step,
                newStep,
                optProps: { note: row.note, octave: row.octave }
            }));
        },
        handleNoteDelete( row: PianoRollRow, event: PianoRollEvent ): void {
            const { playingPatternIndex, selectedInstrument } = this;
            const act = (): void => {
                EventUtil.clearEvent( this.activeSong, playingPatternIndex, selectedInstrument, event.step );
            };
            act();
            this.saveState({
                undo: (): void => {
                    const pattern = this.activeSong.patterns[ playingPatternIndex ];
                    EventUtil.setPosition( event.event, pattern, event.step, this.activeSong.meta.tempo );
                    this.$set( pattern.channels[ selectedInstrument ], event.step, event.event );
                },
                redo: act,
            });
        },
        handleNoteResize( row: PianoRollRow, { payload, newLength } : { payload: SerializedRowEvent, newLength: number }): void {
            const { playingPatternIndex, selectedInstrument } = this;
            this.saveState( resizeEvent( this.$store, playingPatternIndex, selectedInstrument, payload.step, newLength ));
        },
    },
};
</script>

<style lang="scss" scoped>
@use "sass:math";

@import "@/styles/_mixins";

$ideal-width: 840px;

.piano-roll {
    @include editorComponent();
    @include overlay();

    /* ideal size and above (tablet/desktop) */

    @media screen and ( min-width: $ideal-width )  {
        left: 50%;
        width: $ideal-width;
        margin-left: math.div( -$ideal-width, 2 );
    }

    @media screen and ( min-height: 600px ) {
        top: 50%;
        margin-top: math.div( -600px, 2 );
        height: 600px;
    }

    .header__title {
        margin-left: $spacing-medium !important;
    }

    &__body {
        height: calc(100% - 60px); // 60px being header height
        overflow-y: auto;
    }

    &__table {
        min-width: 100%;
        display: table-cell;
        border-collapse: collapse;

        &-row {
            &--sharp {
                background-color: $color-pattern-odd;
                border-color: $color-pattern-odd;
            }
        }
    }
}
</style>