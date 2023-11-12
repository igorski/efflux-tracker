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
            v-for="(column) in formattedColumns"
            :key="`column_${column.index}`"
            class="piano-roll-row__column"
            :class="{
                'piano-roll-row__column--playing': playingStep === column.index,
            }"
            @click="handleEmptySlotClick( column )"
            @drop="handleDrop( $event, column )"
            @dragover.prevent
            @dragenter.prevent
            :colspan="column.colspan"
        >
            <div
                v-if="column.event"
                ref="event"
                class="piano-roll-row__column-content"
                role="button"
                :style="{ width: column.width }"
                draggable
                @dblclick.stop="handleNoteDelete( column )"
                @dragstart="handleDragStart( $event, column, false )"
                @touchstart="handleTouchStart( $event, column )"
                @touchcancel="handleTouchEnd( $event )"
                @touchend="handleTouchEnd( $event )"
            >
                <div
                    class="piano-roll-row__column-size-handle"
                    role="button"
                    draggable
                    @dragstart.stop="handleDragStart( $event, column, true )"
                ></div>
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
    length: number;
    dragStartX: number;
};

type FormattedColumn = {
    event?: PianoRollEvent;
    index: number;
    width: string;
    colspan: number;
};

function serializeData( dragStartX: number, note: string, octave: number, event: PianoRollEvent ): string {
    return JSON.stringify({ note, octave, step: event.step, length: event.length, dragStartX });
}

function deserialiseData( serialized?: string ): SerializedRowEvent | undefined {
    try {
        return JSON.parse( serialized! );
    } catch {}
}

const NOTE_WIDTH = 48;
let lastTouchStart = 0;
let dataTransfer: DataTransfer;

/**
 * Renders a single row inside the piano roll.
 * Arguably using a HTML <table> based solution could be replaced with a more efficient Canvas routine, however
 * the DOM API allows for easy pointer event manipulation and the result is performant enough.
 */
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
        playingStep: {
            type: Number,
            required: true,
        },
    },
    data: () => ({
        resizing: false,
    }),
    computed: {
        formattedColumns(): FormattedColumn[] {
            const out = [];
            for ( let index = 0; index < this.columns; ) {
                const event   = this.getEventForIndex( index );
                const width   = `${NOTE_WIDTH * event?.length}px`;
                const colspan = event?.length ?? 1;

                out.push({ index, event, width, colspan });

                index += colspan;
            }
            return out;
        },
    },
    mounted(): void {
        // @todo should this just go to piano-roll.vue instead?
        if ( !!this.$refs.event ) {
            this.$refs.event[ 0 ]?.scrollIntoView?.({ block: "center" });
        }
    },
    methods: {
        getEventForIndex( index: number ): PianoRollEvent | undefined {
            return this.events.find( event => event.step === index );
        },
        handleEmptySlotClick( column: FormattedColumn ): void {
            this.$emit( "note:add", column.index );
        },
        handleNoteDelete( column: FormattedColumn ): void {
            this.$emit( "note:delete", this.getEventForIndex( column.index ));
        },
        handleDragStart( dragEvent: DragEvent, column: FormattedColumn, isResize: boolean ): void {
            if ( !dragEvent.dataTransfer ) {
                return;
            }
            if ( !isResize ) {
                dragEvent.dataTransfer.dropEffect = "move";
            }
            dragEvent.dataTransfer.setData( "event",
                serializeData( dragEvent.clientX, this.note, this.octave, this.getEventForIndex( column.index ))
            );
            this.resizing = isResize;
        },
        handleDrop( dragEvent: DragEvent, column: FormattedColumn ): void {
            const payload = deserialiseData( dragEvent.dataTransfer?.getData( "event" ));
            if ( payload ) {
                const delta = dragEvent.clientX - payload.dragStartX;
                const moved = Math.round( delta / NOTE_WIDTH ); // amount of slot steps we traversed during drag
            
                if ( this.resizing ) {
                    this.$emit( "note:resize", { payload, newLength: Math.max( 1, payload.length + moved ) });
                } else {
                    this.$emit( "note:move", { payload, newStep: payload.step + moved });
                }
            }
            this.resizing = false;
        },
        /**
         * Overrides for touch screens. As the drag events don't exist there, we create a synthetic
         * DragEvent from the touch start / end actions, granting us a somewhat unified API
         */
        handleTouchStart( event: TouchEvent, column: FormattedColumn ): void {
            const [ touch ] = event.touches;
            if ( !touch ) {
                return;
            }
            event.preventDefault(); // prevents table scroll

            const now = Date.now();
            if (( now - lastTouchStart ) < 300 ) {
                return this.handleNoteDelete( column );
            }
            lastTouchStart = now;

            dataTransfer = new DataTransfer();
            event.target?.dispatchEvent( new DragEvent( "dragstart", {
                clientX: touch.clientX,
                clientY: touch.clientY,
                dataTransfer,
            }));
        },
        handleTouchEnd( event: TouchEvent ): void {
            const [ touch ] = event.changedTouches;
            if ( !touch ) {
                return;
            }
            event.preventDefault(); // prevents table scroll

            // when resizing the target is the .piano_roll-row__column element that captures the drop
            // otherwise we need get the Element at the provided coordinates from the DOM (to allow dragging across rows)
            const target = this.resizing ? event.target?.parentNode?.parentNode : document.elementFromPoint( touch.pageX, touch.pageY );
            target?.dispatchEvent( new DragEvent( "drop", {
                clientX: touch.clientX,
                clientY: touch.clientY,
                dataTransfer,
            }));
        },
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/typography";
@import "@/styles/_variables";

.piano-roll-row {
    background-color: $color-pattern-even;

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
        // see NOTE_WIDTH, this min & max looks weird (why not use width: 48px?) but necessary due to table-cell rendering
        min-width: 48px;
        max-width: 48px;
        box-sizing: border-box;
        border: 1px solid $color-pattern-odd;
        border-top-color: #000;

        &:hover {
            background-color: $color-3;
            color: #000;
        }

        &--playing {
            background-color: $color-4;
            // opacity: 0.5;
        }

        &-content {
            cursor: move;
            position: relative;
            background-color: $color-2;
            // border: 2px solid $color-5;
            height: 20px;
            box-sizing: border-box;
        }

        &-size-handle {
            cursor: ew-resize;
            position: absolute;
            right: 0;
            top: 0;
            background-color: $color-5;
            height: inherit;
            width: 10px;
        }
    }
}
</style>