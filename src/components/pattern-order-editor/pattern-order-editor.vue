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
    <div class="pattern-order-editor">
        <pattern-order-entry
            v-for="(entry) in entries"
            :key="`e_${entry.index}`"
            :pattern="entry.pattern"
            :index="entry.index"
            :active="entry.active"
            :editing="entry.editing"
            @toggle-edit-mode="toggleEditMode( $event, entry )"
        >
            <template v-if="entry.editing">
                <button
                    type="button"
                    v-t="'select'"
                    class="pattern-order-entry__context-menu-button"
                    :disabled="entry.active"
                    @click="selectPattern( entry )"
                ></button>
                <button
                    type="button"
                    v-t="'repeat'"
                    class="pattern-order-entry__context-menu-button"
                    @click="repeatPattern( entry )"
                ></button>
                <button
                    type="button"
                    v-t="'delete'"
                    class="pattern-order-entry__context-menu-button"
                    @click="deletePattern( entry )"
                ></button>
            </template>
        </pattern-order-entry>
    </div>
</template>

<script lang="ts">
import { mapState, mapMutations, type Store } from "vuex";
import { enqueueState } from "@/model/factories/history-state-factory";
import type { EffluxPatternOrder } from "@/model/types/pattern-order";
import type { EffluxState } from "@/store";
import PatternOrderUtil from "@/utils/pattern-order-util";
import PatternOrderEntry from "./components/pattern-order-entry.vue";
import messages from "./messages.json";

type WrappedPatternOrderEntry = {
    pattern: number; // index of pattern
    index: number;   // index of entry within order list
    active: boolean;
    editing: boolean;
};

export default {
    i18n: { messages },
    components: {
        PatternOrderEntry,
    },
    data: () => ({
        editableEntry: -1,
    }),
    computed: {
        ...mapState({
            activeSong : state => state.song.activeSong,
            activeOrderIndex: state => state.sequencer.activeOrderIndex,
        }),
        entries(): WrappedPatternOrderEntry[] {
            return this.activeSong.order.map(( pattern: number, index: number ) => ({
                pattern,
                index,
                active: this.activeOrderIndex === index,
                editing: this.editableEntry === index,
            }));
        },
    },
    methods: {
        ...mapMutations([
            "setActiveOrderIndex",
            "replacePatternOrder",
        ]),
        selectPattern( entry: WrappedPatternOrderEntry ): void {
            this.setActiveOrderIndex( entry.index );
            this.stopEditing();
        },
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
        updateOrder( newOrder: EffluxPatternOrder ): void {
            const store: Store<EffluxState> = this.$store;
            const existingValue = [ ...this.activeSong.order ];

            const commit = (): void => store.commit( "replacePatternOrder", newOrder );
            commit();

            enqueueState( "songOrder", {
                undo(): void {
                    store.commit( "replacePatternOrder", existingValue );
                },
                redo(): void {
                    commit();
                },
            });
        },
    }
};
</script>

<style lang="scss" scoped>
.pattern-order-editor {
    display: flex;
}
</style>