/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2019 - https://www.igorski.nl
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
import UndoManager from 'undo-manager';

const STATES_TO_SAVE = 99;

// a module to store states so the application can undo/redo changes
// made to the song. We do this by applying save and restore functions for
// individual changes made to a song. This is preferred over cloning
// entire song structures as this will consume a large amount of memory!
// by using Vue.set() and Vue.delete() in the undo/redo functions reactivity
// will be retained.

const module = {
    state: {
        undoManager: new UndoManager()
    },
    getters: {
        canUndo(state) {
            return state.undoManager.hasUndo();
        },
        canRedo(state) {
            return state.undoManager.hasRedo();
        },
        amountOfStates(state) {
            return state.undoManager.getIndex() + 1;
        }
    },
    mutations: {
        /**
         * store a state change inside the history
         *
         * @param {Object} state
         * @param {Function} undo
         * @param {Function} redo
         */
        store( state, { undo, redo }) {
            if ( typeof undo !== 'function' || typeof redo !== 'function' )
                throw new Error( 'cannot store a state without specifying valid undo and redo actions' );

            state.undoManager.add({ undo, redo });
        },
        /**
         * clears entire history
         */
        flush(state) {
            state.undoManager.clear();
        }
    },
    actions: {
        /**
         * apply the previously stored state
         *
         * @return {boolean} whether an undo action took place
         */
        undo({ state, getters }) {
            return new Promise(resolve => {
                if ( getters.canUndo ) {
                    state.undoManager.undo();
                    resolve();
                } else {
                    reject();
                };
            });
        },
        /**
         * apply the next stored state
         *
         * @return {boolean} whether a redo action took place
         */
        redo({ state, getters }) {
            return new Promise((resolve, reject) => {
                if ( getters.canRedo ) {
                    state.undoManager.redo();
                    resolve();
                } else {
                    reject();
                }
            });
        }
    }
};

/* initialization */

module.state.undoManager.setLimit( STATES_TO_SAVE );

export default module;
