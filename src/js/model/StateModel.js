/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016 - http://www.igorski.nl
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
"use strict";

const UndoManager = require( "undo-manager" );

module.exports = StateModel;

/**
 * a model to store states so the application can
 * undo/redo changes
 *
 * @constructor
 * @param {number=} statesToSave optional, the amount of states
 *        to save, defaults to 99
 */
function StateModel( statesToSave )
{
    /* instance properties */

    /**
     * @private
     * @type {UndoManager}
     */
    this._undoManager = new UndoManager();

    /* initialization */

    this._undoManager.setLimit(( typeof statesToSave === "number" ) ? statesToSave : 99 );
}

/* public methods */

/**
 * @public
 * @param {{ undo: Function, redo: Function }} undoRedoAction
 */
StateModel.prototype.store = function( undoRedoAction )
{
    if ( !undoRedoAction || typeof undoRedoAction.undo !== "function" || typeof undoRedoAction.redo !== "function" )
        throw new Error( "cannot store a state without specifying valid undo and redo actions" );

    this._undoManager.add( undoRedoAction );
};

/**
 * @public
 * @return {boolean}
 */
StateModel.prototype.canUndo = function() {
    return this._undoManager.hasUndo();
};

/**
 * return to the previously stored state
 *
 * @public
 * @return {boolean} whether an undo action took place
 */
StateModel.prototype.undo = function()
{
    if ( this.canUndo() ) {
        this._undoManager.undo();
        return true;
    }
    return false;
};

/**
 * @public
 * @return {boolean}
 */
StateModel.prototype.canRedo = function() {
    return this._undoManager.hasRedo();
};

/**
 * return to the next stored state
 *
 * @public
 * @return {boolean} whether a redo action took place
 */
StateModel.prototype.redo = function()
{
    if ( this.canRedo() ) {
        this._undoManager.redo();
        return true;
    }
    return false;
};

/**
 * return the number of recorded states in its history stack
 *
 * @public
 * @return {number}
 */
StateModel.prototype.getAmountOfStates = function() {
    return this._undoManager.getIndex() + 1;
};

/**
 * clears entire history
 *
 * @public
 */
StateModel.prototype.flush = function()
{
    this._undoManager.clear();
};
