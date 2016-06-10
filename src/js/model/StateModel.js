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
     * all stored states
     *
     * @private
     * @type {Array.<*>}
     */
    this._states = [];

    /**
     * index of the current state
     *
     * @private
     * @type {number}
     */
    this._current = -1;

    /**
     * the amount of states to store
     * before flushing the oldest ones
     *
     * @private
     * @type {number}
     */
    this._statesToSave = ( typeof statesToSave === "number" ) ? statesToSave : 99;
}

/* public methods */

/**
 * @public
 * @param {*} data
 */
StateModel.prototype.store = function( data )
{
    let amountOfStates = this.getAmountOfStates();
    let maxIndex       = amountOfStates - 1;

    // in case we're storing a new action midway in history, remove the end of
    // history beyond this store point

    if ( this._current < maxIndex )
        this._states = this._states.slice( 0, this._current );

    // if we're exceeding the maximum amount of recordable states, remove the first saved state

    else if ( this.getAmountOfStates() === this._statesToSave )
        this._states.shift();

    this._states.push( data );
    ++this._current;
};

/**
 * return to the previously stored state
 *
 * @public
 * @return {*|null} state we're returning to will be null
 *         when there is nothing to restore to (reached beginning of history)
 */
StateModel.prototype.undo = function()
{
    if ( this._current > 0 )
        return this._states[ --this._current ];

    return null;
};

/**
 * return to the next stored state
 *
 * @public
 * @return {*|null} state we're returning to will be null
  *        when there is nothing to restore to (reached end of history)
 */
StateModel.prototype.redo = function()
{
    if ( this._current < ( this.getAmountOfStates() - 1 ))
        return this._states[ ++this._current ];

    return null;
};

/**
 * @public
 * @return {number}
 */
StateModel.prototype.getAmountOfStates = function()
{
    return this._states.length;
};

/**
 * clears entire history
 *
 * @public
 */
StateModel.prototype.flush = function()
{
    this._states  = [];
    this._current = -1;
};
