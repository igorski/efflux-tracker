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
    <tr class="piano-roll-row">
        <td class="piano-roll-row__name">
            {{ note }}{{ octave }}
        </td>
        <td
            v-for="(column, index) in columns"
            :key="`column_${column}`"
            class="piano-roll-row__column"
            :class="{
                'piano-roll-row__column--playing': step === column,
            }"
            @click="handleEmptySlotClick( index )"
            @drop="handleDrop( $event, index )"
            @dragover.prevent
            @dragenter.prevent
        >
            <!-- todo cache the .find() lookups... -->
            <div
                v-if="events.find( event => event.step === index )"
                ref="event"
                class="piano-roll-row__column--content"
                role="button"
                @click.stop="handleNoteClick( events.find( event => event.step === index ))"
                @dblclick.stop="handleNoteDelete( events.find( event => event.step === index ))"
                @dragstart="handleDragStart( $event, events.find( event => event.step === index ))"
                draggable
            >
            </div>
        </td>
    </tr>
</template>

<script lang="ts">
import { type PianoRollEvent } from "../piano-roll.vue";

export type SerializedRowEvent = {
    note: string;
    octave: number;
    step: number;
};

function serializeData( note: string, octave: number, event: PianoRollEvent ): string {
    return JSON.stringify({ note, octave, step: event.step });
}

function deserialiseData( serialized?: string ): SerializedRowEvent | undefined {
    try {
        return JSON.parse( serialized! );
    } catch {}
}

export default {
    props: {
        note: {
            type: String,
            required: true,
        },
        octave: {
            type: Number,
            required: true,
        },
        columns: {
            type: Number,
            required: true,
        },
        events: {
            type: Array, // PianoRollEvent[]
            required: true,
        },
        step: {
            type: Number,
            required: true,
        },
    },
    mounted(): void {
        // @todo should this just go to piano-roll.vue instead?
        if ( !!this.$refs.event ) {
            this.$refs.event[ 0 ]?.scrollIntoView?.({ block: "center" });
        }
    },
    methods: {
        handleEmptySlotClick( step: number ): void {
            this.$emit( "note:add", step );
        },
        handleNoteClick( event: PianoRollEvent ): void {
            console.info("clicked", event);
        },
        handleNoteDelete( event: PianoRollEvent ): void {
            this.$emit( "note:delete", event );
        },
        handleDragStart( dragEvent: DragEvent, event: PianoRollEvent ): void {
            if ( !dragEvent.dataTransfer ) {
                return;
            }
            dragEvent.dataTransfer.dropEffect = "move";
            dragEvent.dataTransfer.setData( "event", serializeData( this.note, this.octave, event ));
        },
        handleDrop( dragEvent: DragEvent, newStep: Number ): void {
            const payload = deserialiseData( dragEvent.dataTransfer?.getData( "event" ));
            if ( payload ) {
                this.$emit( "note:move", { payload, newStep });
            }
        },
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/typography";
@import "@/styles/_variables";

.piano-roll-row {
    background-color: $color-pattern-even;
    border-top-color: #000;
    border-bottom-color: $color-pattern-odd;
    // the below effectively cancel out selection outlines during playback
    border-left: none;
    border-right: none;

    &__name {
        @include toolFont();
        background-color: $color-editor-background;
        border: 0;
        width: 25px;
    }
    
    &__column {
        cursor: pointer;
        content: "---";
        height: 24px;
        width: 48px;

        &:hover {
            background-color: $color-3;
            color: #000;
        }

        &--playing {
            background-color: $color-4;
            border: 0 !important;
        }

        &--content {
            background-color: $color-2;
            border: 2px solid $color-5;
            height: 20px;
        }
    }
}
</style>