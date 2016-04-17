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
    this.selectedChannels = [];

    /**
     * index of the first selected channel in the selection
     *
     * @public
     * @type {number}
     */
    this.firstSelectedChannel = 0;

    /**
     * index of the last selected channel in the selection
     *
     * @public
     * @type {number}
     */
    this.lastSelectedChannel = 0;

    /**
     * the lowest index within the selection
     *
     * @public
     * @type {number}
     */
    this.minSelectedStep = 0;

    /**
     * the highest index within the selection
     *
     * @public
     * @type {number}
     */
    this.maxSelectedStep = 0;

    /**
     * @private
     * @type {Array.<Array<AUDIO_EVENT>>}
     */
    this._copySelection = null;

    /* initialize */

    this.clearSelection();
}

/**
 * sets the channels that are present in the selection
 *
 * @public
 *
 * @param {number} firstChannel
 * @param {number=} lastChannel optional defaults to firstChannel for single channel selection
 */
SelectionModel.prototype.setSelectionChannelRange = function( firstChannel, lastChannel )
{
    if ( typeof lastChannel !== "number" )
        lastChannel = firstChannel;

    this.firstSelectedChannel = firstChannel;
    this.lastSelectedChannel  = 1 + lastChannel;

    for ( var i = this.firstSelectedChannel; i < this.lastSelectedChannel; ++i )
    {
        if ( !this.hasSelectionForChannel( i ))
            this.selectedChannels[ i ] = [];
    }
};

/**
 * sets the selected steps within the selection to given range
 *
 * @public
 *
 * @param {number} selectionStart the index of the first step in the selection
 * @param {number} selectionEnd the index of the last step in the selection
 */
SelectionModel.prototype.setSelection = function( selectionStart, selectionEnd )
{
    // get current range in existing selections

    var minValue = this.minSelectedStep,
        maxValue = this.maxSelectedStep;

    // update to new values

    this.minSelectedStep = selectionStart;
    this.maxSelectedStep = selectionEnd;

    this.clearSelection();

    var i, j, patterns;

    for ( i = this.firstSelectedChannel; i < this.lastSelectedChannel; ++i )
    {
        patterns = this.selectedChannels[ i ] = [];

        for ( j = this.minSelectedStep; j < this.maxSelectedStep; ++j )
            patterns.push( j );
    }
    this.equalizeSelection( this.minSelectedStep, this.maxSelectedStep );
};

/**
 * equalize selection length for all channels (if the other channels
 * had a selection, or when force is true)
 *
 * @public
 *
 * @param {number} minSelect the index of the first step in the selection to equalize
 * @param {number} maxSelect the index of the last step in the selection to equalize
 */
SelectionModel.prototype.equalizeSelection = function( minSelect, maxSelect )
{
    var i, j, currentChannel, otherChannel;
    var selection = this.selectedChannels;

    for ( i = this.firstSelectedChannel; i < this.lastSelectedChannel; ++i )
    {
        currentChannel = selection[ i ];
        currentChannel.forEach( function( pattern, index )
        {
            for ( j = minSelect; j < maxSelect; ++j )
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
    this.selectedChannels = [];
};

/**
 * retrieve the minimum value contained in the selection
 *
 * @public
 * @return {number}
 */
SelectionModel.prototype.getMinValue = function()
{
    var min = 0;

    for ( var i = 0, l = this.selectedChannels.length; i < l; ++i  )
        min = Math.min( min, Math.min.apply( Math, this.selectedChannels[ i ]));

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

    for (var i = 0, l = this.selectedChannels.length; i < l; ++i )
        max = Math.max( max, Math.max.apply( Math, this.selectedChannels[ i ]));

    return max;
};

/**
 * @public
 * @return {number}
 */
SelectionModel.prototype.getSelectionLength = function()
{
    return ( this.maxSelectedStep - this.minSelectedStep );
};

/**
 * @public
 * @return {boolean}
 */
SelectionModel.prototype.hasSelection = function()
{
    return ( this.selectedChannels.length > 0 );
};

/**
 * @public
 * @param {number} channel
 * @return {boolean}
 */
SelectionModel.prototype.hasSelectionForChannel = function( channel )
{
    return ( this.selectedChannels[ channel ] instanceof Array && this.selectedChannels[ channel ].length > 0 );
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

    var i = 0, max = this.selectedChannels.length;

    this._copySelection = [];

    for ( i; i < max; ++i )
        this._copySelection.push( [] );

    var pattern = song.patterns[ activePattern], stepValue;

    for ( i = 0; i < max; ++i )
    {
        if ( this.selectedChannels[ i ].length > 0 )
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

    for (var i = 0, max = this.selectedChannels.length; i < max; ++i )
    {
        if ( this.selectedChannels[ i ].length > 0 )
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

        var max = this.selectedChannels.length;
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

    var i = this.selectedChannels.length;
    while ( i-- )
        this.selectedChannels[ i ].sort( sortMethod );
};
