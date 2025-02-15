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
            :colspan="column.colspan"
            :class="{
                'piano-roll-row__column--selected' : selectedStep === column.index,
                'piano-roll-row__column--line'     : column.line,
                'piano-roll-row__column--dragging' : rangeDragging && column.index >= dragRange.min && column.index <= dragRange.max,
            }"
            @drop="handleDrop( $event )"
            @dragover.prevent="handleDragOver( $event )"
            @pointerdown="handleDrawStart( $event, column )"
            @dragenter.prevent
            @touchstart="handlePanStart( $event )"
            class="piano-roll-row__column"
        >
            <div
                v-if="column.event"
                ref="event"
                class="piano-roll-row__column-content"
                :class="{
                    'piano-roll-row__column-content--playing': playingStep >= column.index && playingStep <= column.index + column.colspan,
                }"
                role="button"
                :style="{ width: column.width }"
                draggable
                @dblclick.stop="handleNoteDelete( column )"
                @dragstart="handleDragStart( $event, column, false )"
                @touchstart="handleTouchStart( $event, column )"
                @touchcancel="handleTouchEnd( $event )"
                @touchend="handleTouchEnd( $event )"
                @touchmove="handleTouchMove( $event )"
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
    line: boolean;
};

export type DragListener = { element: Element, type: string, handler: ( event: Event ) => void };

function serializeData( dragStartX: number, note: string, octave: number, event: PianoRollEvent ): string {
    return JSON.stringify({ note, octave, step: event.step, length: event.length, dragStartX });
}

function deserialiseData( serialized?: string ): SerializedRowEvent | undefined {
    try {
        return JSON.parse( serialized! );
    } catch {}
}

export const NOTE_WIDTH = 48; // @see variables.$piano-roll-column-width

let lastTouchStart = 0;
let dataTransfer: DataTransfer;

/**
 * Renders a single row inside the piano roll.
 * Arguably using a HTML <table> based solution could be replaced with a more efficient Canvas routine, however
 * the DOM API allows for easy pointer event manipulation and the result is performant enough.
 */
export default {
    emits: [ "note:delete", "note:resize", "note:move", "note:add" ],
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
            default: () => ([]),
        },
        selectedStep: {
            type: Number,
            required: true,
        },
        playingStep: {
            type: Number,
            required: true,
        },
        editMode: {
            type: Boolean,
            default: true,
        },
        scrollIntoView: {
            type: Boolean,
            default: false,
        },
    },
    data: () => ({
        // range dragging values are set to draw the delta between drag start and current/end drag position
        // when either resizing existing events or creating new longer duration events in a single click+drag motion
        rangeDragging: false,
        dragRange: {
            min: 0,
            max: 0,
        },
    }),
    computed: {
        formattedColumns(): FormattedColumn[] {
            const out: FormattedColumn[] = [];
            for ( let index = 0; index < this.columns; ) {
                const event   = this.getEventForIndex( index );
                const width   = `${NOTE_WIDTH * event?.length}px`;
                const colspan = event?.length ?? 1;

                out.push({ index, event, width, colspan, line: ( index > 0 && index % 4 === 0 ) });

                index += colspan;
            }
            return out;
        },
    },
    watch: {
        scrollIntoView( value: boolean ): void {
            if ( value ) { 
                this.$el?.scrollIntoView?.({ block: "center" });
            }
        }
    },
    created(): void {
        this.dragListeners = [] as DragListener[];
    },
    beforeUnmount(): void {
        this.removeListeners();
    },
    methods: {
        getEventForIndex( index: number ): PianoRollEvent | undefined {
            return this.events.find( event => event.step === index );
        },
        handleNoteDelete( column: FormattedColumn ): void {
            if ( !this.editMode ) {
                return;
            }
            this.$emit( "note:delete", this.getEventForIndex( column.index ));
        },
        handleDragStart( dragEvent: DragEvent, column: FormattedColumn, isResize: boolean ): void {
            if ( !this.editMode || !dragEvent.dataTransfer ) {
                return;
            }
            if ( !isResize ) {
                dragEvent.dataTransfer.dropEffect = "move";
            }
            dragEvent.dataTransfer.setData( "event",
                serializeData( dragEvent.clientX, this.note, this.octave, this.getEventForIndex( column.index ))
            );
            this.rangeDragging = isResize;

            this.dragStartX    = dragEvent.clientX;
            this.dragRange.min = column.index + ( column.colspan - 1 );
            this.dragRange.max = this.dragRange.min;
        },
        handleDragOver( dragEvent: DragEvent ): void {
            if ( !this.rangeDragging ) {
                return;
            }
            this.calcDragRange( dragEvent.clientX );
        },
        handleDrop( dragEvent: DragEvent ): void {
            const payload = deserialiseData( dragEvent.dataTransfer?.getData( "event" ));
            if ( payload ) {
                const delta = dragEvent.clientX - payload.dragStartX;
                const moved = Math.round( delta / NOTE_WIDTH ); // amount of slot steps we traversed during drag
            
                if ( this.rangeDragging ) {
                    this.$emit( "note:resize", { payload, newLength: Math.max( 1, payload.length + moved ) });
                } else {
                    this.$emit( "note:move", { payload, newStep: payload.step + moved });
                }
            }
            this.rangeDragging = false;
        },
        handleDrawStart( event: PointerEvent, column: FormattedColumn ): void {
            if ( !this.editMode || column.event ) {
                return; // an event already exists at this position, click+drag creation not supported
            }
            this.rangeDragging = true;
            this.dragStartX    = event.clientX;
            this.dragRange.min = column.index + ( column.colspan - 1 );
            this.dragRange.max = this.dragRange.min;

            this.dragListeners.push({ element: window, type: "mousemove", handler: this.handleMove.bind( this ) });
            this.dragListeners.push({ element: window, type: "mouseup", handler: this.handleDrawEnd.bind( this ) });
            this.dragListeners.push({ element: window, type: "touchmove", handler: this.handleTouchMove.bind( this ) });
            this.dragListeners.push({ element: event.target, type: "touchcancel", handler: this.handleDrawEnd.bind( this ) });
            this.dragListeners.push({ element: event.target, type: "touchend", handler: this.handleDrawEnd.bind( this ) });
         
            for ( const entry of this.dragListeners ) {
                entry.element.addEventListener( entry.type, entry.handler );
            }
        },
        handleDrawEnd( event: Event ): void {
            this.rangeDragging = false;
            const length = Math.min(
                Math.max( 1, ( this.dragRange.max - this.dragRange.min ) + 1 ),
                this.columns - this.dragRange.min,
            );
            this.$emit( "note:add", {
                step: this.dragRange.min,
                length,
            });
            this.removeListeners();
        },
        handleMove( event: MouseEvent ): void {
            this.calcDragRange( event.clientX );
        },
        calcDragRange( currentX: number ): void {
            const delta = currentX - this.dragStartX;
            const moved = Math.round( delta / NOTE_WIDTH ); // amount of slot steps we traversed during drag

            this.dragRange.max = this.dragRange.min + moved;
        },
        handlePanStart( event: TouchEvent ): void {
            if ( this.editMode ) {
                event.preventDefault();
            }
        },
        removeListeners(): void {
            for ( const entry of this.dragListeners ) {
                entry.element.removeEventListener( entry.type, entry.handler );
            }
            this.dragListeners.length = 0;
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

            // when range dragging, the target is the ".piano_roll-row__column"-element that captures the drop
            // otherwise we need get the Element at the provided coordinates from the DOM (to allow dragging across rows)
            const target = this.rangeDragging ? event.target?.parentNode?.parentNode : document.elementFromPoint( touch.pageX, touch.pageY );
            target?.dispatchEvent( new DragEvent( "drop", {
                clientX: touch.clientX,
                clientY: touch.clientY,
                dataTransfer,
            }));
        },
        handleTouchMove( event: TouchEvent ): void {
            if ( !this.rangeDragging ) {
                return;
            }
            const [ touch ] = event.touches;
            touch && this.calcDragRange( touch.pageX );
        },
    }
};
</script>

<style lang="scss" scoped>
@use "@/styles/_colors";
@use "@/styles/_variables";
@use "@/styles/_mixins";
@use "@/styles/typography";

.piano-roll-row {
    background-color: colors.$color-pattern-even;
 
    &__name {
        @include typography.toolFont();
        background-color: colors.$color-editor-background;
        border: 0;
        width: variables.$piano-roll-name-width;

        @include mixins.mobile() {
            position: sticky; // always in view
            z-index: 1;
            left: 0;
        }
    }
    
    &__column {
        cursor: pointer;
        content: "---";
        height: 24px;
        // see NOTE_WIDTH, this min & max looks weird (why not use width: 48px?) but necessary due to table-cell rendering
        min-width: variables.$piano-roll-column-width;
        max-width: variables.$piano-roll-column-width;
        box-sizing: border-box;
        border: 1px solid colors.$color-pattern-odd;
        border-right: none;
        border-top: none;
        border-bottom: none;

        &:hover {
            background-color: colors.$color-3;
            color: #000;
        }

        &--selected {
            background-color: rgba(48,48,48,0.5);
        }

        &--line {
            border-left: 1px solid colors.$color-editor-background;
        }

        &--dragging {
            background-color: colors.$color-4;
            border-color: colors.$color-4;
        }

        &-content {
            cursor: move;
            position: relative;
            background-color: colors.$color-2;
            height: 20px;
            box-sizing: border-box;

            &--playing {
                background-color: colors.$color-1;
            }
        }

        &-size-handle {
            cursor: ew-resize;
            position: absolute;
            right: 0;
            top: 0;
            background-color: colors.$color-5;
            height: inherit;
            width: 10px;
        }
    }
}
</style>