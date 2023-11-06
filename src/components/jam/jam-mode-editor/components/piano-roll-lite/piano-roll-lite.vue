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
        <div
            v-for="(event, index) in eventList"
            :key="`event${index}`"
            :style="event.style"
            class="piano-roll__note"
            :class="{
                'piano-roll__note--empty': !event.note,
                'piano-roll__note--selected' : index === selectedStep,
            }"
        ></div>
        <div
            class="piano-roll__editor-position"
            :style="{
                'left': `${selectedStep * 12}px`
            }"
        ></div>
        <div
            class="piano-roll__sequencer-position"
            :style="{
                'left': `${playingStep * 12}px`
            }"
        ></div>
    </div>
</template>

<script lang="ts">
import { mapState } from "vuex";
import { type Pattern } from "@/model/types/pattern";
import Pitch from "@/services/audio/pitch";

type EventEntry = {
    note: string;
    octave: number;
    style: {
        marginTop: string;
    };
};

export default {
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
    computed: {
        ...mapState({
            selectedStep  : state => state.editor.selectedStep,
            currentStep   : state => state.sequencer.currentStep,
            stepPrecision : state => state.sequencer.stepPrecision,
        }),
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
                if ( !event ) {
                    return undefined;
                }
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
                        width: !!event ? (( nextIndex  - index ) * 12 ) + "px" : "12px",
                        marginTop: !!event ? ( sorted.findIndex( entry => {
                            return entry.note === event.note && entry.octave === event.octave;
                        }) * 8 ) + "px" : undefined,
                    },
                };
            }).filter( Boolean );
        },
        playingStep(): number {
            const stepsInPattern = this.pattern.length;
            const diff = this.stepPrecision / stepsInPattern;

            return Math.floor( this.currentStep / diff ) % stepsInPattern;
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/_variables";

.piano-roll {
    position: relative;
    display: inline-flex;

    &__note {
        width: 12px;
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
    }

    &__editor-position {
        position: absolute;
        width: 12px;
        height: 100%;
        background-color: rgba(255,255,255,0.5);
    }
}
</style>