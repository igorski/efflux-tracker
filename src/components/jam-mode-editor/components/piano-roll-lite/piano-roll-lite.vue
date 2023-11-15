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
    <div class="piano-roll-lite">
        <div
            v-for="(event, index) in eventList"
            :key="`event_${index}`"
            :style="event.style"
            class="piano-roll-lite__note"
            :class="{
                'piano-roll-lite__note--empty': !event.note,
                'piano-roll-lite__note--selected' : index === selectedStep,
            }"
        ></div>
        <div
            class="piano-roll-lite__editor-position"
            :style="editorPositionStyle"
        ></div>
        <div
            class="piano-roll-lite__sequencer-position"
            :style="sequencerPositionStyle"
        ></div>
        <button
            :title="$t('editPattern')"
            type="button"
            class="piano-roll-lite__edit-button"
            @click.stop="openPianoRoll()"
        ><img src="@/assets/icons/icon-pencil.svg" :alt="$t('editPattern')" /></button>
    </div>
</template>

<script lang="ts">
import { mapState, mapGetters, mapMutations } from "vuex";
import ModalWindows from "@/definitions/modal-windows";
import { type Pattern } from "@/model/types/pattern";
import Pitch from "@/services/audio/pitch";
import { getMeasureDurationInSeconds } from "@/utils/audio-math";

import messages from "./messages.json";

type EventEntry = {
    note: string;
    octave: number;
    style: {
        marginTop: string;
    };
};

export default {
    i18n: { messages },
    props: {
        channel: {
            type: Object, /* type JamChannel */
            required: true,
        },
        patternIndex: {
            type: Number,
            required: true,
        },
    },
    data: () => ({
        entryWidth: 0, // in pct
    }),
    computed: {
        ...mapState({
            selectedStep  : state => state.editor.selectedStep,
            currentStep   : state => state.sequencer.currentStep,
            stepPrecision : state => state.sequencer.stepPrecision,
        }),
        ...mapGetters([
            "activeSong",
            "isPlaying",
        ]),
        pattern(): Pattern {
            return this.channel.patterns[ this.patternIndex ];
        },
        eventList(): EventEntry[] {
            const sorted = this.pattern.filter( Boolean ).sort(( a, b ) => {
                if ( !a || !b ) {
                    return 0;
                }
                if ( a.note === b.note && a.octave === b.octave ) {
                    return 0;
                }
                if ( a.octave === b.octave ) {
                    const aNoteIndex = Pitch.OCTAVE_SCALE.indexOf( a.note );
                    const bNoteIndex = Pitch.OCTAVE_SCALE.indexOf( b.note );

                    return ( aNoteIndex > bNoteIndex ) ? 1 : -1;
                }
                return ( a.octave > b.octave ) ? 1 : -1;
            }).reverse();

            if ( sorted.length === 0 ) {
                return [];
            }

            return this.pattern.map(( event, index ) => {
                let nextIndex = this.pattern.findIndex(( event, compareIndex ) => {
                    return compareIndex > index && !!event;
                });
                if ( nextIndex === -1 ) {
                    nextIndex = this.pattern.length - 1;
                }
                return {
                    note: event?.note,
                    octave: event?.octave,
                    style: {
                        width: `${this.entryWidth}%`, // `${!!event ? (( nextIndex  - index ) * this.entryWidth ) : this.entryWidth}%`,
                        marginTop: !!event ? ( sorted.findIndex( entry => {
                            return entry.note === event.note && entry.octave === event.octave;
                        }) * 8 ) + "px" : undefined,
                    },
                };
            });
        },
        editorPositionStyle(): Record<string, string> {
            return {
                "left"  : `${this.selectedStep * this.entryWidth}%`,
                "width" : `${this.entryWidth}%`,
            };
        },
        sequencerPositionStyle(): Record<string, string> {
            const stepsInPattern = this.pattern.length;
            const diff = this.stepPrecision / stepsInPattern;

            const playingStep = Math.floor( this.currentStep / diff ) % stepsInPattern;
            let targetPct = 100;
            let speed = getMeasureDurationInSeconds( this.activeSong.meta.tempo, 4 );
            
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
    },
    created(): void {
        this.entryWidth = 100 / this.pattern.length;
        this.lastStep = 0;
    },
    methods: {
        ...mapMutations([
            "openModal",
            "setSelectedInstrument",
        ]),
        openPianoRoll(): void {
            this.setSelectedInstrument( this.channel.index );
            this.openModal( ModalWindows.JAM_MODE_PIANO_ROLL );
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/_variables";
@import "@/styles/forms";

.piano-roll-lite {
    position: relative;
    display: flex;
    background-color: #666;
    width: 100%;
    height: 100px;
    overflow: hidden;

    &__note {
        height: 8px;
        background-color: $color-2;

        &--empty {
            background: none !important;
        }

        &--selected {
            background-color: $color-5;
        }
        
        &--active {
            background-color: $color-3;
        }
    }

    &__sequencer-position {
        position: absolute;
        width: 2px;
        height: 100%;
        background-color: #FFF;
        transition: left 0.1s linear;
    }

    &__editor-position {
        position: absolute;
        height: 100%;
        background-color: rgba(255,255,255,0.15);
    }

    &__edit-button {
        position: absolute;
        right: 0;
        bottom: $spacing-small;
        padding: $spacing-xsmall $spacing-small;
        background-color: #b6b6b6;
    }
}
</style>