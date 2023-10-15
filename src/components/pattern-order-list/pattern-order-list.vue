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
    <div class="pattern-order-list">
        <label
            class="pattern-order-list__label"
            v-t="'patternOrder'"
        ></label>
        <button
            :title="$t('previous')"
            :disabled="!canNavBack"
            type="button"
            class="pattern-order-list__navigate-button pattern-order-list__navigate-button_left"
            @click="handleBackClick()"
        ><</button>
        <pattern-order-entry
            v-for="(entry) in visibleEntries"
            :key="`e_${entry.name}_${entry.index}`"
            :name="entry.name"
            :index="entry.index"
            :active="entry.active"
            :editing="entry.editing"
            @toggle-edit-mode="toggleEditMode( $event, entry )"
        >
            <template v-if="entry.editing">
                <button
                    type="button"
                    v-t="'repeat'"
                    class="pattern-order-entry__context-menu-button"
                    @click="repeatPattern( entry )"
                ></button>
                <button
                    type="button"
                    v-t="'delete'"
                    :disabled="!canDelete"
                    class="pattern-order-entry__context-menu-button"
                    @click="deletePattern( entry )"
                ></button>
            </template>
        </pattern-order-entry>
        <button
            :title="$t('next')"
            :disabled="!canNavNext"
            type="button"
            class="pattern-order-list__navigate-button pattern-order-list__navigate-button_right"
            @click="handleNextClick()"
        >></button>
        <button
            :title="$t('edit')"
            type="button"
            class="pattern-order-list__edit-button"
            @click="handleEditClick()"
        ><img src="@/assets/icons/icon-pencil.svg" :alt="$t('edit')" /></button>
    </div>
</template>

<script lang="ts">
import { mapState, mapGetters, mapMutations, type Store } from "vuex";
import Actions from "@/definitions/actions";
import ModalWindows from "@/definitions/modal-windows";
import createAction from "@/model/factories/action-factory";
import type { EffluxPatternOrder } from "@/model/types/pattern-order";
import PatternOrderUtil from "@/utils/pattern-order-util";
import PatternOrderEntry from "./components/pattern-order-entry.vue";
import messages from "./messages.json";

type WrappedPatternOrderEntry = {
    pattern: number; // index of pattern in pattern list
    name: string;
    index: number;   // index of pattern within order list
    active: boolean;
    editing: boolean;
};

const TOTAL_PER_PAGE = 5;

export default {
    i18n: { messages },
    components: {
        PatternOrderEntry,
    },
    data: () => ({
        editableEntry: -1,
        offset: 0,
    }),
    computed: {
        ...mapState({
            activeSong : state => state.song.activeSong,
        }),
        ...mapGetters([
            "activeOrderIndex",
        ]),
        entries(): WrappedPatternOrderEntry[] {
            return this.activeSong.order
                .map(( pattern: number, index: number ) => ({
                    pattern,
                    index,
                    name: this.activeSong.patterns[ pattern ].name,
                    active: this.activeOrderIndex === index,
                    editing: this.editableEntry === index,
                }));
        },
        visibleEntries(): WrappedPatternOrderEntry[] {
            const sliceOffset = this.visibleRangeStart;
            return this.entries.slice( sliceOffset, sliceOffset + TOTAL_PER_PAGE );
        },
        canDelete(): boolean {
            return this.entries.length > 1;
        },
        canNavBack(): boolean {
            return this.offset > 0;
        },
        canNavNext(): boolean {
            return ( this.visibleRangeStart + TOTAL_PER_PAGE ) < this.entries.length;
        },
        visibleRangeStart(): number {
            return this.offset * TOTAL_PER_PAGE;
        },
    },
    watch: {
        activeOrderIndex( value: number ) {
            if ( value < this.visibleRangeStart || value >= this.visibleRangeStart + TOTAL_PER_PAGE ) {
                this.offset = Math.floor( value / TOTAL_PER_PAGE );
            }
        },
    },
    methods: {
        ...mapMutations([
            "openModal",
            "replacePatternOrder",
            "setActiveOrderIndex",
        ]),
        repeatPattern( entry: WrappedPatternOrderEntry ): void {
            const newOrder = [ ...this.activeSong.order ];
            const tail = newOrder.splice( entry.index + 1 );
            this.updateOrder([ ...newOrder, entry.pattern, ...tail ]);
            this.stopEditing();
        },
        deletePattern( entry: WrappedPatternOrderEntry ): void {
            this.updateOrder( PatternOrderUtil.removePatternAtIndex( this.activeSong.order, entry.index ) );
            this.stopEditing();
        },
        toggleEditMode( isEditing: boolean, entry: WrappedPatternOrderEntry ): void {
            if ( !isEditing ) {
                return this.stopEditing();
            }
            this.editableEntry = entry.index;
        },
        stopEditing(): void {
            this.editableEntry = -1;
        },
        updateOrder( order: EffluxPatternOrder ): void {
            createAction( Actions.UPDATE_PATTERN_ORDER, { store: this.$store, order });
            if ( this.activeOrderIndex >= order.length ) {
                this.setActiveOrderIndex( order.length - 1 );
            }
        },
        handleEditClick(): void {
            this.openModal( ModalWindows.PATTERN_ORDER_WINDOW );
        },
        handleBackClick(): void {
            this.offset = Math.max( 0, this.offset - 1 );
        },
        handleNextClick(): void {
            this.offset += 1;
        },
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/mixins";

.pattern-order-list {
    display: flex;
    align-items: center;

    &__label {
        margin-right: $spacing-small;
        @include toolFont();
    }

    &__navigate-button {
        @include toolFont();
        
        &_left {
            margin-right: $spacing-xsmall;
        }
        &_right {
            margin-left: $spacing-xxsmall;
        }
    }

    &__edit-button {
        @include button();
        padding: $spacing-xsmall $spacing-small;
        margin: $spacing-small;
    }
}
</style>