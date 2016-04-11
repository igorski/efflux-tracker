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
    this.selection = [
        [], []
    ];

    /**
     * @private
     * @type {Array.<Array<AUDIO_EVENT>>}
     */
    this._copySelection = null;
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

    if ( prevLength === 0 && patterns.length === 2 )
        forceEqualize = false;

    this.equalizeSelection( activeChannel, forceEqualize );
};

/**
 * equalize selection length for both channels (if the other channel
 * had a selection, or when force is true)
 *
 * @public
 *
 * @param {number} activeChannel
 * @param {boolean=} force optional defaults to false
 */
SelectionModel.prototype.equalizeSelection = function( activeChannel, force )
{
    // equalize selection length for both channels (if other channel had selection)

    if (( force === true ))
    {
        var currentChannel = this.selection[ activeChannel ];
        var otherChannel   = this.selection[ ( activeChannel === 0 ) ? 1 : 0 ];

        currentChannel.forEach( function( pattern, index )
        {
            if ( otherChannel.indexOf( pattern ) === -1 ) {
                otherChannel.push( pattern ) ;
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
    this.selection = [ [], [] ];
};

/**
 * retrieve the maximum value contained in the selection
 *
 * @public
 * @return {number}
 */
SelectionModel.prototype.getMinValue = function()
{
    var val1 = Math.min.apply( Math, this.selection[ 0 ]);
    var val2 = Math.min.apply( Math, this.selection[ 1 ]);

    return Math.min( val1, val2 );
};

/**
 * retrieve the maximum value contained in the selection
 *
 * @public
 * @return {number}
 */
SelectionModel.prototype.getMaxValue = function()
{
    var val1 = Math.max.apply( Math, this.selection[ 0 ]);
    var val2 = Math.max.apply( Math, this.selection[ 1 ]);

    return Math.max( val1, val2 );
};

/**
 * @public
 * @return {number}
 */
SelectionModel.prototype.getSelectionLength = function()
{
    return Math.max( this.selection[ 0 ].length, this.selection[ 1 ].length );
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

    this._copySelection = [ [], [] ];

    var pattern = song.patterns[ activePattern], stepValue;

    for ( var i = 0; i < 2; ++i )
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

    for ( var i = 0; i < 2; ++i )
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

        for ( var i = activeChannel; i < 2 && j < 2; ++i, ++j )
        {
            targetPattern = target.channels[ i ];

            this._copySelection[ j ].forEach( function( event, index )
            {
                writeIndex = activeStep + index;

                if ( writeIndex < targetPattern.length ) {
                    if ( event && event.action !== 0 ) {
                        clone = ObjectUtil.clone( event );

                        EventUtil.setPosition( clone, target, activePattern, writeIndex, clone.seq.length, song.meta.tempo );
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

    this.selection[ 0 ].sort( sortMethod );
    this.selection[ 1 ].sort( sortMethod );
};
