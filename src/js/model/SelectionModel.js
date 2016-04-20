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

    /**
     * Value Object containing the states associated
     * with the current selection action triggered by key events, see
     * PatternTrackListController
     *
     * @public
     * @type {Object}
     */
    this.actionCache = {};

    /* initialize */

    this.clearSelection();
}

/**
 * sets the channels that are present in the selection
 *
 * @public
 *
 * @param {number} firstChannel
 * @param {number=} lastChannel optional (defaults to firstChannel for single channel selection)
 */
SelectionModel.prototype.setSelectionChannelRange = function( firstChannel, lastChannel )
{
    if ( typeof lastChannel !== "number" )
        lastChannel = firstChannel;

    this.firstSelectedChannel = firstChannel;
    this.lastSelectedChannel  = lastChannel;

    for ( var i = this.firstSelectedChannel; i <= this.lastSelectedChannel; ++i )
        this.selectedChannels[ i ] = [];

    this.setSelection( this.minSelectedStep, this.maxSelectedStep );
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
    //if ( !this.selectedChannels.length > 0 )
        //throw new Error( "cannot set selection range if no selection channel range had been specified" );

    // update to new values

    this.minSelectedStep = Math.min( selectionStart, selectionEnd );
    this.maxSelectedStep = Math.max( selectionEnd, selectionStart );

    var i, j, patterns;

    this.selectedChannels = [];

    for ( i = this.firstSelectedChannel; i <= this.lastSelectedChannel; ++i )
    {
        patterns = this.selectedChannels[ i ] = [];

        for ( j = this.minSelectedStep; j <= this.maxSelectedStep; ++j )
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
    this.selectedChannels     = [];
    this.minSelectedStep      =
    this.maxSelectedStep      =
    this.firstSelectedChannel =
    this.lastSelectedChannel  = 0;

    var ac = this.actionCache;

    ac.stepOnSelection      = -1;
    ac.channelOnSelection   = -1;
    ac.directionOnSelection = 0;
    ac.shrinkSelection      = false;
    ac.minOnSelection       = -1;
    ac.maxOnSelection       = -1;
    ac.prevHorizontalKey    = -1;
    ac.prevVerticalKey      = -1;
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
 *
 * @param {number} keyCode determining the vertical direction we're moving in (38 = up, 40 = down)
 * @param {number} activeChannel the active channel in the track list
 * @param {number} curStep the current active step within the current pattern
 * @param {number} activeStep the next active step within the current pattern
 */
SelectionModel.prototype.handleVerticalKeySelectAction = function( keyCode, activeChannel, curStep, activeStep )
{
    var ac           = this.actionCache,
        isUp         = ( keyCode === 38 ),
        hadSelection = this.hasSelection();

    if ( !hadSelection )
        ac.channelOnSelection = activeChannel;

    if ( isUp )
    {
        // moving up

        if ( ac.stepOnSelection === -1 || ac.prevVerticalKey !== keyCode )
        {
            ac.shrinkSelection = ( curStep === ( this.maxSelectedStep ));
            ac.minOnSelection  = this.minSelectedStep;
            ac.maxOnSelection  = this.maxSelectedStep;
            ac.stepOnSelection = (( ac.minOnSelection === curStep ) ? ac.minOnSelection : activeStep ) + 2;
        }

        if ( !hadSelection )
            this.setSelectionChannelRange( activeChannel );

        if ( ac.shrinkSelection )
        {
            if ( ac.minOnSelection === activeStep )
                ac.stepOnSelection = -1;

            this.setSelection( ac.minOnSelection, activeStep );
        }
        else
            this.setSelection( activeStep, ac.stepOnSelection - 1 );
    }
    else
    {
        // moving down

        if ( ac.stepOnSelection === -1 || ac.prevVerticalKey !== keyCode )
        {
            ac.shrinkSelection = ( ac.prevVerticalKey !== keyCode && curStep === this.minSelectedStep && activeStep !== 1 );
            ac.minOnSelection  = this.minSelectedStep;
            ac.maxOnSelection  = this.maxSelectedStep;
            ac.stepOnSelection = ( ac.maxOnSelection === ( activeStep - 1 )) ? ac.minOnSelection : activeStep - 1;
        }

        if ( !hadSelection )
            this.setSelectionChannelRange( activeChannel );

        if ( ac.shrinkSelection )
        {
            if ( ac.maxOnSelection === activeStep + 1 )
                ac.stepOnSelection = -1;

            this.setSelection( activeStep, ac.maxOnSelection );
        }
        else
            this.setSelection( ac.stepOnSelection, Math.max( this.maxSelectedStep, activeStep ));
    }
    ac.prevVerticalKey = keyCode;
};

/**
 * @public
 *
 * @param {number} keyCode the horizontal direction we're moving in (37 = left, 39 = right)
 * @param {number} activeChannelOnStart the active channel when the horizontal selection started
 * @param {number} activeStepOnStart the active step when the horizontal selection started
 */
SelectionModel.prototype.handleHorizontalKeySelectAction = function( keyCode, activeChannelOnStart, activeStepOnStart )
{
    var ac           = this.actionCache,
        isLeft       = ( keyCode === 37 ),
        hadSelection = this.hasSelection();

    if ( !hadSelection ) {

        this.minSelectedStep      = activeStepOnStart;
        this.maxSelectedStep      = activeStepOnStart;
        this.lastSelectedChannel  = activeChannelOnStart;
        this.firstSelectedChannel = activeChannelOnStart;
        this.lastSelectedChannel  = activeChannelOnStart;
        ac.channelOnSelection     = activeChannelOnStart;
        ac.directionOnSelection   = keyCode;
    }

    var targetLastSelectedChannel = ( isLeft ) ? this.lastSelectedChannel - 1 : this.lastSelectedChannel + 1;

    if ( hadSelection && ac.prevHorizontalKey !== keyCode )
        targetLastSelectedChannel = ( isLeft ) ? this.lastSelectedChannel - 1 : activeChannelOnStart + 1;

    // scenario : shrinking a selection that started with left movement, by moving to the right

    if ( hadSelection && !isLeft && ac.prevHorizontalKey === 37 && ac.prevHorizontalKey === ac.directionOnSelection ) {
        this.setSelectionChannelRange( this.firstSelectedChannel + 1, --targetLastSelectedChannel );
        return;
    }

    if ( targetLastSelectedChannel >= ac.channelOnSelection )
        this.setSelectionChannelRange( ac.channelOnSelection, targetLastSelectedChannel );
    else
        this.setSelectionChannelRange( this.firstSelectedChannel - 1, this.lastSelectedChannel );

    ac.prevHorizontalKey = keyCode;
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

    var i, max = this.selectedChannels.length;

    this._copySelection = [];

    for ( i = 0; i < max; ++i )
        this._copySelection.push( [] );

    var pattern = song.patterns[ activePattern], stepValue;
    var channel;

    var copyIndex = 0;
    for ( i = 0; i < max; ++i )
    {
        channel = this.selectedChannels[ i ];
        if ( channel && channel.length > 0 )
        {
            for ( var j = this.minSelectedStep, l = this.maxSelectedStep; j <= l; ++j ) {
                stepValue = pattern.channels[ i ][ j ];
                this._copySelection[ copyIndex ].push(( stepValue ) ? ObjectUtil.clone( stepValue ) : null );
            }
            ++copyIndex;
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

    for ( var i = this.firstSelectedChannel; i <= this.lastSelectedChannel; ++i )
    {
        if ( this.selectedChannels[ i ].length > 0 )
        {
            for ( var j = this.minSelectedStep, l = this.maxSelectedStep; j <= l; ++j )
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
        var selectionLength = this._copySelection.length;

        for ( var i = activeChannel, max = target.channels.length, j = 0; i < max && j < selectionLength; ++i, ++j )
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
    var i = this.selectedChannels.length, channel;

    while ( i-- ) {
        channel = this.selectedChannels[ i ];
        if ( channel )
            channel.sort( sortMethod );
    }
};

function sortMethod( a, b ) {
    return a - b;
}
