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
                <button
                    type="button"
                    :title="$t('help')"
                    @click="handleHelp()"
                >?</button>
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
                        v-for="(row, index) in rows"
                        :key="`${row.note}_${row.octave}`"
                        :note="row.note"
                        :octave="row.octave"
                        :events="row.events"
                        :columns="columnAmount"
                        :selected-step="selectedStep"
                        :playing-step="isPlaying ? playingStep : -1"
                        :edit-mode="!isPanMode"
                        :scroll-into-view="focusedRow === index"
                        class="piano-roll__table-row"
                        :class="{
                            'piano-roll__table-row--sharp': row.note.includes( '#' )
                        }"
                        @note:add="handleNoteAdd( row, $event )"
                        @note:move="handleNoteMove( row, $event )"
                        @note:delete="handleNoteDelete( row, $event )"
                        @note:resize="handleNoteResize( row, $event )"
                    />
                    <button
                        v-if="supportsTouch"
                        :title="isPanMode ? 'draw' : 'pan'"
                        type="button"
                        class="piano-roll__table-touch-mode-toggle"
                        @click="toggleTouchMode()"
                    ><img v-if="isPanMode" src="@/assets/icons/icon-pencil.svg" /><img v-else src="@/assets/icons/icon-drag.svg" /></button>
                </tbody>
                <div
                    class="piano-roll__sequencer-position"
                    :style="sequencerPositionStyle"
                ></div>
            </table>
        </section>
    </div>
</template>

<script lang="ts">
import { mapState, mapGetters, mapMutations } from "vuex";
import Config from "@/config";
import ManualURLs from "@/definitions/manual-urls";
import PianoRollRow, { type SerializedRowEvent } from "./components/piano-roll-row.vue";
import { invalidateCache } from "@/model/actions/event-actions";
import moveEvent from "@/model/actions/event-move";
import resizeEvent from "@/model/actions/event-resize";
import EventFactory from "@/model/factories/event-factory";
import { type EffluxAudioEvent, ACTION_NOTE_ON, ACTION_NOTE_OFF } from "@/model/types/audio-event";
import { type Instrument } from "@/model/types/instrument";
import { type Pattern } from "@/model/types/pattern";
import Pitch from "@/services/audio/pitch";
import { getMeasureDurationInSeconds } from "@/utils/audio-math";
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

// we can't draw and pan at the same time on small screens, force user to select interaction type
enum TouchMode {
    PAN = 0,
    DRAW
};

export default {
    i18n: { messages },
    components: {
        PianoRollRow,
    },
    data: () => ({
        patternCopy: null,
        focusedRow: 0,
        touchMode: TouchMode.DRAW,
    }),
    computed: {
        ...mapState({
            selectedInstrument : state => state.editor.selectedInstrument,
            selectedStep       : state => state.editor.selectedStep,
            currentStep        : state => state.sequencer.currentStep,
            jam                : state => state.sequencer.jam,
            stepPrecision      : state => state.sequencer.stepPrecision,
            supportsTouch      : state => state.supportsTouch,
        }),
        ...mapGetters([
            "activeSong",
            "isPlaying",
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
        sequencerPositionStyle(): Record<string, string> {
            const stepsInPattern = this.pattern.steps;
            const diff = this.stepPrecision / stepsInPattern;

            const playingStep = Math.floor( this.currentStep / diff ) % stepsInPattern;
            let targetPct = Math.round( this.seqPosMult * 100 );
            let speed = getMeasureDurationInSeconds( this.activeSong.meta.tempo, 4 ) * this.seqPosMult;
            
            // wrap back to beginning
            if ( !this.isPlaying || ( playingStep === 0 && this.lastStep !== 0 )) {
                targetPct = 0;
                speed = 0;
            }

            this.lastStep = playingStep;

            return {
                "left" : `${targetPct}%`,
                "transition-duration": `${speed}s`,
            };
        },
        isPanMode(): boolean {
            return this.supportsTouch && this.touchMode === TouchMode.PAN;
        },
    },
    created(): void {
        this.maxPatternIndex = this.activeSong.patterns.length - 1;
        this.seqPosMult = ( this.pattern.steps - 1 ) / this.pattern.steps;
        this.lastStep = 0;
    },
    mounted(): void {
        // on mount, scroll the first row with content centrally into the view
        let i = this.rows.length;
        this.focusedRow = this.rows.findIndex( row => row.note === "C" && row.octave === 3 );
        while ( i-- ) {
            const row = this.rows[ i ];
            if ( row.events.length ) {
                this.focusedRow = i;
                break;
            }
        }
        // console.info( `Focusing on row #${this.focusedRow}`, this.rows[ this.focusedRow ]);
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
                invalidateCache( $store, song, selectedInstrument );
            };
            act();

            this.saveState({
                undo(): void {
                    $store.commit( "replacePattern", { patternIndex: activePatternIndex, pattern: orgPattern });
                    invalidateCache( $store, song, selectedInstrument );
                },
                redo: act
            });
        },
        handleNoteAdd( row: PianoRollRow, { step, length } : { step: number, length: number }): void {
            this.addEventAtPosition({
                event : EventFactory.create( this.selectedInstrument, row.note, row.octave, ACTION_NOTE_ON ),
                store : this.$store,
                optData: {
                    advanceOnAddition : false,
                    patternIndex : this.activePatternIndex,
                    channelIndex : this.selectedInstrument,
                    length,
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
                pattern.channels[ selectedInstrument ][event.step] = EventFactory.create( selectedInstrument, "", 0, ACTION_NOTE_OFF );
            };
            act();
            this.saveState({
                undo: (): void => {
                    const pattern = this.activeSong.patterns[ activePatternIndex ];
                    EventUtil.setPosition( event.event, pattern, event.step, this.activeSong.meta.tempo );
                    pattern.channels[ selectedInstrument ][event.step] = event.event;
                },
                redo: act,
            });
        },
        handleNoteResize( row: PianoRollRow, { payload, newLength } : { payload: SerializedRowEvent, newLength: number }): void {
            const { activePatternIndex, selectedInstrument } = this;
            this.saveState( resizeEvent( this.$store, activePatternIndex, selectedInstrument, payload.step, newLength ));
        },
        toggleTouchMode(): void {
            this.touchMode = this.touchMode === TouchMode.PAN ? TouchMode.DRAW : TouchMode.PAN;
        },
        handleHelp(): void {
            window.open( ManualURLs.PATTERN_JAM_SESSION );
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

    @include mobile() {
        position: fixed;
        top: 0;// $menu-height + $transport-height !important;
        margin: 0 !important;
        height: 100%;
    }

    .header__title {
        margin-left: $spacing-medium !important;
        visibility: hidden;

        @media screen and ( min-width: $mobile-width ) {
            visibility: visible;
        }
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
        position: relative;

        &-row {
            &--sharp {
                background-color: $color-pattern-odd;
                border-color: $color-pattern-odd;
            }
        }

        &-touch-mode-toggle {
            @include button();
            @include toolFont();
            @include noSelect();
            background-color: $color-4;
            border-radius: 50%;
            width: 54px;
            height: 54px;
            position: fixed;
            right: $spacing-large;
            bottom: $spacing-large * 2;

            &:focus {
                background-color: $color-4;
                outline: none;
            }
        }
    }

    &__sequencer-position {
        position: absolute;
        top: 0;
        width: 2px;
        height: 100%;
        margin-left: 27px; // after note labels
        background-color: #FFF;
        transition: left 0.1s linear;
    }
}
</style>