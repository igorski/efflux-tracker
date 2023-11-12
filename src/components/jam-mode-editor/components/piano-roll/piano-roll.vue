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
            <div class="header__actions">
                <button
                    type="button"
                    :title="$t('previousPattern')"
                    :disabled="activePatternIndex === 0"
                    @click="gotoPreviousPattern()"
                >&lt;</button>
                <button
                    type="button"
                    :title="$t('nextPattern')"
                    :disabled="activePatternIndex === maxPatternIndex"
                    @click="gotoNextPattern()"
                >></button>
                <button
                    v-t="'copy'"
                    type="button"
                    @click="handlePatternCopy()"
                ></button>
                <button
                    v-t="'paste'"
                    type="button"
                    :disabled="!patternCopy"
                    @click="handlePatternPaste()"
                ></button>
            </div>
            <button
                type="button"
                class="close-button"
                :title="$t('close')"
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
import { clone } from "@/utils/object-util";
import { getInstrumentName } from "@/utils/string-util";
import messages from "./messages.json";

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
    i18n: { messages },
    components: {
        PianoRollRow,
    },
    data: () => ({
        patternCopy: null,
    }),
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
        activePatternIndex(): number {
            return this.jam[ this.selectedInstrument ].activePatternIndex;
        },
        instrument(): Instrument {
            return this.activeSong.instruments[ this.selectedInstrument ];
        },
        title(): string {
            return `${getInstrumentName( this.instrument )} - ${this.activePatternIndex + 1}`;
        },
        pattern(): Pattern {
            return this.activeSong.patterns[ this.activePatternIndex ];
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
    created(): void {
        this.maxPatternIndex = this.activeSong.patterns.length - 1;
    },
    methods: {
        ...mapMutations([
            "addEventAtPosition",
            "setJamChannelPosition",
            "saveState",
        ]),
        gotoPreviousPattern(): void {
            this.setJamChannelPosition({ instrumentIndex: this.selectedInstrument, patternIndex: this.activePatternIndex - 1 });
        },
        gotoNextPattern(): void {
            this.setJamChannelPosition({ instrumentIndex: this.selectedInstrument, patternIndex: this.activePatternIndex + 1 });
        },
        handlePatternCopy(): void {
            this.patternCopy = clone( this.pattern.channels[ this.selectedInstrument ] );
        },
        handlePatternPaste(): void {
            const { selectedInstrument, activePatternIndex, $store } = this;
            const song = this.activeSong;
            
            const orgPattern = clone( this.pattern );
            const newPattern = clone( orgPattern );

            newPattern.channels[ selectedInstrument ] = this.patternCopy;

            const act = (): void => {
                $store.commit( "replacePattern", { patternIndex: activePatternIndex, pattern: newPattern });
                $store.commit( "invalidateChannelCache", { song });
            };
            act();

            this.saveState({
                undo(): void {
                    $store.commit( "replacePattern", { patternIndex: activePatternIndex, pattern: orgPattern });
                    $store.commit( "invalidateChannelCache", { song });
                },
                redo: act
            });
        },
        handleNoteAdd( row: PianoRollRow, step: number ): void {
            this.addEventAtPosition({
                event : EventFactory.create( this.selectedInstrument, row.note, row.octave, ACTION_NOTE_ON ),
                store : this.$store,
                optData: {
                    patternIndex : this.activePatternIndex,
                    channelIndex : this.selectedInstrument,
                    step,
                }
            });
        },
        handleNoteMove( row: PianoRollRow, { payload, newStep } : { payload: SerializedRowEvent, newStep: number }): void {
            this.saveState( moveEvent( this.$store,
                this.activePatternIndex,
                this.selectedInstrument,
                payload.step,
                newStep,
                { note: row.note, octave: row.octave }
            ));
        },
        handleNoteDelete( row: PianoRollRow, event: PianoRollEvent ): void {
            const { activePatternIndex, selectedInstrument } = this;
            const act = (): void => {
                const pattern = this.activeSong.patterns[ activePatternIndex ];
                this.$set( pattern.channels[ selectedInstrument ], event.step, EventFactory.create( selectedInstrument, "", 0, ACTION_NOTE_OFF ));
            };
            act();
            this.saveState({
                undo: (): void => {
                    const pattern = this.activeSong.patterns[ activePatternIndex ];
                    EventUtil.setPosition( event.event, pattern, event.step, this.activeSong.meta.tempo );
                    this.$set( pattern.channels[ selectedInstrument ], event.step, event.event );
                },
                redo: act,
            });
        },
        handleNoteResize( row: PianoRollRow, { payload, newLength } : { payload: SerializedRowEvent, newLength: number }): void {
            const { activePatternIndex, selectedInstrument } = this;
            this.saveState( resizeEvent( this.$store, activePatternIndex, selectedInstrument, payload.step, newLength ));
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

    .header__actions button {
        @include button();
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