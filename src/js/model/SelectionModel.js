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

module.exports = SelectionModel;

const Config         = require( "../config/Config" );
const PatternFactory = require( "../model/factory/PatternFactory" );
const EventUtil      = require( "../utils/EventUtil" );
const ObjectUtil     = require( "../utils/ObjectUtil" );

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

    for ( let i = this.firstSelectedChannel; i <= this.lastSelectedChannel; ++i )
        this.selectedChannels[ i ] = [];

    this.setSelection( this.minSelectedStep, this.maxSelectedStep );
};

/**
 * retrieve the contents of the current selection
 *
 * @public
 * @param {Object} song
 * @param {number} activePattern
 * @return {Array.<Object>}
 */
SelectionModel.prototype.getSelection = function( song, activePattern ) {
    const out = [];
    this.copySelection( song, activePattern, out );
    return out;
};

/**
 * sets the selected steps within the selection to given range
 *
 * @public
 *
 * @param {number} selectionStart the index of the first step in the selection
 * @param {number=} selectionEnd the index of the last step in the selection optional,
 *                  defaults to selectionStart when not given
 */
SelectionModel.prototype.setSelection = function( selectionStart, selectionEnd )
{
    //if ( !this.selectedChannels.length > 0 )
        //throw new Error( "cannot set selection range if no selection channel range had been specified" );

    if ( typeof selectionEnd !== "number" )
        selectionEnd = selectionStart;

    // update to new values

    this.minSelectedStep = Math.min( selectionStart, selectionEnd );
    this.maxSelectedStep = Math.max( selectionEnd, selectionStart );

    let i, j, patterns;

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
    let i, j, currentChannel, otherChannel;
    let selection = this.selectedChannels;

    for ( i = this.firstSelectedChannel; i < this.lastSelectedChannel; ++i )
    {
        currentChannel = selection[ i ];
        currentChannel.forEach(( pattern, index ) =>
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

    let ac = this.actionCache;

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
    return ( this.maxSelectedStep - this.minSelectedStep ) + 1;
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
    let ac           = this.actionCache,
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
    let ac           = this.actionCache,
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

    let targetLastSelectedChannel = ( isLeft ) ? this.lastSelectedChannel - 1 : this.lastSelectedChannel + 1;

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
 * @param {Array=} optOutputArray optional Array to copy selection contents
 *        into (when null, this will by default store the selection inside
 *        this model so it can later on be pasted from this model
 */
SelectionModel.prototype.copySelection = function( song, activePattern, optOutputArray )
{
    if ( this.getSelectionLength() === 0 )
        return;

    let i, max = this.selectedChannels.length;

    if ( !Array.isArray( optOutputArray )) {
        this._copySelection = [];
        optOutputArray = this._copySelection;
    }

    for ( i = 0; i < max; ++i )
        optOutputArray.push( [] );

    let pattern = song.patterns[ activePattern], stepValue;
    let channel;
    let copyIndex = 0;

    for ( i = 0; i < max; ++i )
    {
        channel = this.selectedChannels[ i ];
        if ( channel && channel.length > 0 )
        {
            for ( let j = this.minSelectedStep, l = this.maxSelectedStep; j <= l; ++j ) {
                stepValue = pattern.channels[ i ][ j ];
                optOutputArray[ copyIndex ].push(( stepValue ) ? ObjectUtil.clone( stepValue ) : null );
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
 * @param {Array.<LinkedList>} lists
 */
SelectionModel.prototype.cutSelection = function( song, activePattern, lists )
{
    if ( this.getSelectionLength() === 0 )
        return;

    // copy first
    this.copySelection( song, activePattern );

    // delete second
    this.deleteSelection( song, activePattern, lists );
};

/**
 * deletes the contents within the current selection
 *
 * @public
 *
 * @param {Object} song
 * @param {number} activePattern
 * @param {Array.<LinkedList>} lists
 * @param {Array=} optSelectionContent optional selection content to paste from, when null this method
 *        will by default paste from the selection stored inside this model
 * @param {number=} optFirstSelectedChannel optional first selection channel to paste from, defaults to selection stored in this model
 * @param {number=} optLastSelectedChannel optional last selection channel to paste from, defaults to selection stored in this model
 * @param {number=} optMinSelectedStep optional minimum selection step to paste from, defaults to selection stored in this model
 * @param {number=} optMaxSelectedStep optional maximum selection step to paste from, defaults to selection stored in this model
 */
SelectionModel.prototype.deleteSelection = function( song, activePattern, lists, optSelectionContent, optFirstSelectedChannel,
    optLastSelectedChannel, optMinSelectedStep, optMaxSelectedStep )
{
    let firstSelectedChannel = this.firstSelectedChannel,
        lastSelectedChannel  = this.lastSelectedChannel,
        minSelectedStep      = this.minSelectedStep,
        maxSelectedStep      = this.maxSelectedStep;

    if ( Array.isArray( optSelectionContent )) {
        firstSelectedChannel = optFirstSelectedChannel;
        lastSelectedChannel  = optLastSelectedChannel;
        minSelectedStep      = optMinSelectedStep;
        maxSelectedStep      = optMaxSelectedStep;
    }
    else if ( this.getSelectionLength() === 0 ) {
        return;
    }
    const selectedChannels = ( Array.isArray( optSelectionContent )) ? optSelectionContent : this.selectedChannels;

    const pattern = song.patterns[ activePattern ];
    let event;

    for ( let channelIndex = firstSelectedChannel; channelIndex <= lastSelectedChannel; ++channelIndex )
    {
        if ( selectedChannels[ channelIndex ].length > 0 )
        {
            for ( let sIndex = minSelectedStep, l = maxSelectedStep; sIndex <= l; ++sIndex ) {

                event = pattern.channels[ channelIndex ][ sIndex ];

                EventUtil.clearEvent(
                    song,
                    activePattern,
                    channelIndex,
                    sIndex,
                    lists[ activePattern ]
                );
                pattern.channels[ channelIndex ][ sIndex ] = 0;
            }
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
 * @param {Array.<LinkedList>} lists
 * @param {Array=} optSelectionContent optional selection content to paste from, when null this method
 *        will by default paste from the selection stored inside this model
 */
SelectionModel.prototype.pasteSelection = function( song, activePattern, activeChannel, activeStep, lists, optSelectionContent )
{
    if ( !Array.isArray( optSelectionContent )) {
        optSelectionContent = this._copySelection;
    }

    if ( Array.isArray( optSelectionContent ) && optSelectionContent.length > 0 )
    {
        let target = song.patterns[ activePattern ];
        let targetPattern, writeIndex, clone;
        let selectionLength = optSelectionContent.length;

        for ( let cIndex = activeChannel, max = target.channels.length, j = 0; cIndex < max && j < selectionLength; ++cIndex, ++j )
        {
            targetPattern = target.channels[ cIndex ];

            optSelectionContent[ j ].forEach(( event, index ) =>
            {
                writeIndex = activeStep + index;

                if ( writeIndex < targetPattern.length ) {

                    if ( event && ( event.action !== 0 || event.mp )) {

                        clone = ObjectUtil.clone( event );
                        clone.instrument  = cIndex;
                        clone.seq.playing = false;
                        EventUtil.setPosition( clone, target, activePattern, writeIndex, song.meta.tempo, clone.seq.length );
                        targetPattern[ writeIndex ] = clone;
                        EventUtil.linkEvent( clone, cIndex, song, lists );
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
    let i = this.selectedChannels.length, channel;

    while ( i-- ) {
        channel = this.selectedChannels[ i ];
        if ( channel )
            channel.sort(( a, b ) => a - b );
    }
};