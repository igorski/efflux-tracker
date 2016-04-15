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
module.exports = SelectionModel;

var Config         = require( "../config/Config" );
var PatternFactory = require( "../factory/PatternFactory" );
var EventUtil      = require( "../utils/EventUtil" );
var ObjectUtil     = require( "../utils/ObjectUtil" );

function SelectionModel()
{
    /* instance properties */

    /**
     * @public
     * @type {Array.<Array.<number>>}
     */
    this.selection = [];

    /**
     * @private
     * @type {Array.<Array<AUDIO_EVENT>>}
     */
    this._copySelection = null;

    /* initialize */

    this.clearSelection();
}

/**
 * sets the selection for given channel to the range selectionStart - selectionEnd
 *
 * @public
 *
 * @param {number} activeChannel
 * @param {number} selectionStart
 * @param {number} selectionEnd
 */
SelectionModel.prototype.setSelection = function( activeChannel, selectionStart, selectionEnd )
{
    var prevLength    = this.getMinValue();
    var forceEqualize = this.selection[( activeChannel === 0 ) ? 1 : 0 ].length > 0;
    this.clearSelection();

    var patterns = this.selection[ activeChannel ];

    for ( var i = selectionStart; i < selectionEnd; ++i )
        patterns.push( i );

    if ( prevLength === 0 && patterns.length === this.selection.length )
        forceEqualize = false;

    this.equalizeSelection( activeChannel, forceEqualize );
};

/**
 * equalize selection length for all channels (if the other channels
 * had a selection, or when force is true)
 *
 * @public
 *
 * @param {number} minSelect
 * @param {number} maxSelect
 * @param {boolean=} force optional defaults to false
 */
SelectionModel.prototype.equalizeSelection = function( minSelect, maxSelect, force )
{
    // equalize selection length for both channels (if other channel had selection)

    if (( force === true ))
    {
        var selection      = this.selection,
            currentChannel = selection[ minSelect ],
            otherChannel;

        currentChannel.forEach( function( pattern, index )
        {
            for ( var i = minSelect; i < maxSelect; ++i )
            {
                otherChannel = selection[ i ];

                if ( otherChannel.indexOf( pattern ) === -1 )
                    otherChannel.push( pattern );
            }
        });
    }
    this.sort();
};

/**
 * clears the current selection
 *
 * @public
 */
SelectionModel.prototype.clearSelection = function()
{
    this.selection = [];

    for ( var i = 0; i < Config.INSTRUMENT_AMOUNT; ++i )
        this.selection.push( [] );
};

/**
 * retrieve the maximum value contained in the selection
 *
 * @public
 * @return {number}
 */
SelectionModel.prototype.getMinValue = function()
{
    var min = 0;

    for ( var i = 0, l = this.selection.length; i < l; ++i )
        min = Math.min( min, Math.min.apply( Math, this.selection[ i ]));

    return min;
};

/**
 * retrieve the maximum value contained in the selection
 *
 * @public
 * @return {number}
 */
SelectionModel.prototype.getMaxValue = function()
{
    var max = 0;

    for ( var i = 0, l = this.selection.length; i < l; ++i )
        max = Math.max( max, Math.max.apply( Math, this.selection[ i ]));

    return max;
};

/**
 * @public
 * @return {number}
 */
SelectionModel.prototype.getSelectionLength = function()
{
    var length = 0;

    for ( var i = 0, l = this.selection.length; i < l; ++i )
        length = Math.max( length, this.selection[ i ].length );

    return length;
};

/**
 * @public
 * @return {boolean}
 */
SelectionModel.prototype.hasSelection = function()
{
    return this.getSelectionLength() > 0;
};

/**
 * copies the contents within the current selection
 *
 * @public
 *
 * @param {Object} song
 * @param {number} activePattern
 */
SelectionModel.prototype.copySelection = function( song, activePattern )
{
    if ( this.getSelectionLength() === 0 )
        return;

    var i = 0, max = this.selection.length;

    this._copySelection = [];

    for ( i; i < max; ++i )
        this._copySelection.push( [] );

    var pattern = song.patterns[ activePattern], stepValue;

    for ( i = 0; i < max; ++i )
    {
        if ( this.selection[ i ].length > 0 )
        {
            for ( var j = this.getMinValue(), l = this.getMaxValue(); j <= l; ++j ) {
                stepValue = pattern.channels[ i ][ j ];
                this._copySelection[ i ].push(( stepValue ) ? ObjectUtil.clone( stepValue ) : null );
            }
        }
    }
};

/**
 * cuts the contents within the current selection
 * (copies their data and deletes them)
 *
 * @public
 *
 * @param {Object} song
 * @param {number} activePattern
 */
SelectionModel.prototype.cutSelection = function( song, activePattern )
{
    if ( this.getSelectionLength() === 0 )
        return;

    // copy first
    this.copySelection( song, activePattern );

    // delete second
    this.deleteSelection( song, activePattern );
};

/**
 * deletes the contents within the current selection
 *
 * @public
 *
 * @param {Object} song
 * @param {number} activePattern
 */
SelectionModel.prototype.deleteSelection = function( song, activePattern )
{
    if ( this.getSelectionLength() === 0 )
        return;

    var pattern = song.patterns[ activePattern ];

    for ( var i = 0, max = this.selection.length; i < max; ++i )
    {
        if ( this.selection[ i ].length > 0 )
        {
            for ( var j = this.getMinValue(), l = this.getMaxValue(); j <= l; ++j )
                delete pattern.channels[ i ][ j ];
        }
    }
};

/**
 * @public
 *
 * @param {Object} song
 * @param {number} activePattern
 * @param {number} activeChannel
 * @param {number} activeStep
 */
SelectionModel.prototype.pasteSelection = function( song, activePattern, activeChannel, activeStep )
{
    if ( this._copySelection !== null )
    {
        var target = song.patterns[ activePattern ];
        var targetPattern, writeIndex, clone;
        var j = 0;

        if (( activeChannel === 0 && this._copySelection[ 0 ].length === 0 ) ||
            ( activeChannel === 1 && this._copySelection[ 0 ].length === 0 ))
        {
            j = 1;
        }

        var max = this.selection.length;
        for ( var i = activeChannel; i < max && j < max; ++i, ++j )
        {
            targetPattern = target.channels[ i ];

            this._copySelection[ j ].forEach( function( event, index )
            {
                writeIndex = activeStep + index;

                if ( writeIndex < targetPattern.length ) {
                    if ( event && event.action !== 0 ) {
                        clone = ObjectUtil.clone( event );

                        EventUtil.setPosition( clone, target, activePattern, writeIndex, song.meta.tempo, clone.seq.length );
                        targetPattern[ writeIndex ] = clone;
                    }
                }
            });
        }
    }
    this.clearSelection();
};

/* private methods */

SelectionModel.prototype.sort = function()
{
    var sortMethod = function( a, b ){ return a-b; };

    var i = this.selection.length;
    while ( i-- )
        this.selection[ i ].sort( sortMethod );
};
