/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2023 - https://www.igorski.nl
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
import type { Commit, Module } from "vuex";
// @ts-expect-error has no types
import UndoManager from "undo-manager";
import { forceProcess, flushQueue } from "@/model/factories/history-state-factory";

const STATES_TO_SAVE = 99;

export interface HistoryState {
    undoManager: UndoManager;
    historyIndex: number; // used for reactivity (as undo manager isn't bound to Vue, goes to STATES_TO_SAVE - 1 )
    totalSaved: number; // total amount of states saved, this can exceed STATES_TO_SAVE
};

export const createHistoryState = ( props?: Partial<HistoryState> ): HistoryState => ({
    undoManager  : null, // pass explicitly in props
    historyIndex : -1,
    totalSaved   : 0,
    ...props
} as HistoryState );

// a module to store states so the application can undo/redo changes
// made to the song. We do this by applying save and restore functions for
// individual changes made to a song. This is preferred over cloning
// entire song structures as this will consume a large amount of memory!
// by using Vue.set() and Vue.delete() in the undo/redo functions reactivity
// will be retained.

const HistoryModule: Module<HistoryState, any> = {
    state: createHistoryState({ undoManager: new UndoManager() }),
    getters: {
        canUndo        : ( state: HistoryState ) => state.historyIndex >= 0 && state.undoManager.hasUndo(),
        canRedo        : ( state: HistoryState ) => state.historyIndex < STATES_TO_SAVE && state.undoManager.hasRedo(),
        amountOfStates : ( state: HistoryState ) => state.historyIndex + 1,
        totalSaved     : ( state: HistoryState ) => state.totalSaved,
    },
    mutations: {
        /**
         * store a state change inside the history
         */
        saveState( state: HistoryState, { undo, redo }: { undo: () => void, redo: () => void }): void {
            // @ts-expect-error 'import.meta' property not allowed, not an issue Vite takes care of it
            if ( import.meta.env.MODE !== "production" ) {
                if ( typeof undo !== "function" || typeof redo !== "function" ) {
                    throw new Error( "cannot store a state without specifying valid undo and redo actions" );
                }
            }
            state.undoManager.add({ undo, redo });
            state.historyIndex = state.undoManager.getIndex();
            ++state.totalSaved;
        },
        setHistoryIndex( state: HistoryState, value: number ): void {
            state.historyIndex = value;
        },
        /**
         * clears entire history
         */
        resetHistory( state: HistoryState ): void {
            flushQueue();
            state.undoManager.clear();
            state.historyIndex = state.undoManager.getIndex();
            state.totalSaved = 0;
        }
    },
    actions: {
        /**
         * apply the previously stored state
         */
        async undo({ state, getters, commit }: { state: HistoryState, getters: any, commit: Commit }): Promise<void> {
            forceProcess();
            return new Promise( resolve => {
                if ( getters.canUndo ) {
                    state.undoManager.undo();
                    commit( "setHistoryIndex", state.undoManager.getIndex());
                }
                resolve(); // always resolve, application should not break if history cannot be accessed
            });
        },
        /**
         * apply the next stored state
         */
        redo({ state, getters, commit }: { state: HistoryState, getters: any, commit: Commit }): Promise<void> {
            return new Promise( resolve => {
                if ( getters.canRedo ) {
                    state.undoManager.redo();
                    commit( "setHistoryIndex", state.undoManager.getIndex());
                }
                resolve(); // always resolve, application should not break if history cannot be accesse
            });
        }
    }
};
export default HistoryModule;

/* initialization */

// @ts-expect-error undoManager has no types
HistoryModule.state.undoManager.setLimit( STATES_TO_SAVE );
