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
import ObjectUtil from '../../utils/ObjectUtil';

/* internal methods */

const sort = state => {
    let i = state.selectedChannels.length, channel;

    while ( i-- ) {
        channel = state.selectedChannels[ i ];
        if ( channel )
            channel.sort(( a, b ) => a - b );
    }
};

const clearSelection = state => {
    state.selectedChannels     = [];
    state.minSelectedStep      =
    state.maxSelectedStep      =
    state.firstSelectedChannel =
    state.lastSelectedChannel  = 0;

    const ac = state.actionCache;

    ac.stepOnSelection      = -1;
    ac.channelOnSelection   = -1;
    ac.directionOnSelection = 0;
    ac.shrinkSelection      = false;
    ac.minOnSelection       = -1;
    ac.maxOnSelection       = -1;
    ac.prevHorizontalKey    = -1;
    ac.prevVerticalKey      = -1;
};

const hasSelection = state => state.selectedChannels.length > 0;
const getSelectionLength = state => ( state.maxSelectedStep - state.minSelectedStep ) + 1;

/**
 * copies the contents within the current selection
 *
 * @param {Object} state
 * @param {Object} song
 * @param {number} activePattern
 * @param {Array=} optOutputArray optional Array to copy selection contents
 *        into (when null, this will by default store the selection inside
 *        this model so it can later on be pasted from this model
 */
const copySelection = ( state, song, activePattern, optOutputArray ) => {
    if ( getSelectionLength(state) === 0 )
        return;

    let i, max = state.selectedChannels.length;

    if ( !Array.isArray( optOutputArray )) {
        state.copySelection = [];
        optOutputArray = state.copySelection;
    }

    for ( i = 0; i < max; ++i )
        optOutputArray.push( [] );

    let pattern = song.patterns[ activePattern], stepValue;
    let channel;
    let copyIndex = 0;

    for ( i = 0; i < max; ++i )
    {
        channel = state.selectedChannels[ i ];
        if ( channel && channel.length > 0 )
        {
            for ( let j = state.minSelectedStep, l = state.maxSelectedStep; j <= l; ++j ) {
                stepValue = pattern.channels[ i ][ j ];
                optOutputArray[ copyIndex ].push(( stepValue ) ? ObjectUtil.clone( stepValue ) : null );
            }
            ++copyIndex;
        }
    }
};

const setSelectionChannelRange = ( state, firstChannel, lastChannel) => {
    if ( typeof lastChannel !== "number" )
        lastChannel = firstChannel;

    state.firstSelectedChannel = firstChannel;
    state.lastSelectedChannel  = lastChannel;

    for ( let i = state.firstSelectedChannel; i <= state.lastSelectedChannel; ++i )
        state.selectedChannels[ i ] = [];

    setSelection( state, state.minSelectedStep, state.maxSelectedStep );
};

/**
 * equalize selection length for all channels
 * (if the other channels had a selection)
 */
const equalizeSelection = state => {
    let i, j, currentChannel, otherChannel;
    let selection = state.selectedChannels;
    for ( i = state.firstSelectedChannel; i < state.lastSelectedChannel; ++i ) {
        currentChannel = selection[ i ];
        currentChannel.forEach(pattern => {
            for ( j = state.minSelectedStep; j < state.maxSelectedStep; ++j ) {
                otherChannel = selection[ i ];

                if ( !otherChannel.includes( pattern ))
                    otherChannel.push( pattern );
            }
        });
    }
    sort(state);
};

/**
 * sets the selected steps within the selection to given range
 *
 * @param {Object} state
 * @param {number} selectionStart the index of the first step in the selection
 * @param {number=} selectionEnd the index of the last step in the selection optional,
 *                  defaults to selectionStart when not given
 */
const setSelection = ( state, selectionStart, selectionEnd ) => {
    //if ( !state.selectedChannels.length > 0 )
        //throw new Error( "cannot set selection range if no selection channel range had been specified" );

    if ( typeof selectionEnd !== "number" )
        selectionEnd = selectionStart;

    // update to new values

    state.minSelectedStep = Math.min( selectionStart, selectionEnd );
    state.maxSelectedStep = Math.max( selectionEnd, selectionStart );

    let i, j, patterns;

    state.selectedChannels = [];

    for ( i = state.firstSelectedChannel; i <= state.lastSelectedChannel; ++i ) {
        patterns = state.selectedChannels[ i ] = [];

        for ( j = state.minSelectedStep; j <= state.maxSelectedStep; ++j )
            patterns.push( j );
    }
    equalizeSelection(state);
};

// selection module maintains selections inside the pattern editor
// this allows for cutting, copying and pasting pattern data across
// tracks and patterns within a song

const module = {
    state: {
        /**
         * @type {Array.<Array.<number>>}
         */
        selectedChannels : [],
        firstSelectedChannel : 0,
        lastSelectedChannel : 0,
        /**
         * the lowest index within the selection
         */
        minSelectedStep : 0,
        /**
         * the highest index within the selection
         */
        maxSelectedStep : 0,
        /**
         * @type {Array.<Array<AUDIO_EVENT>>}
         */
        copySelection : null,
        /**
         * Value Object containing the states associated
         * with the current selection action triggered by key events, see
         * PatternTrackList
         */
        actionCache : {}
    },
    getters: {
        hasSelection,
        getSelectionLength,
        /**
         * retrieve the contents of the current selection
         *
         * @return {Array.<Object>}
         */
        getSelection(state) {
            const out = [];
            copySelection( state, state.song, state.activePattern, out );
            return out;
        }
    },
    mutations: {
        /**
         * cuts the contents within the current selection
         * (copies their data and deletes them)
         */
        cutSelection( state ) {
            if ( getSelectionLength(state) === 0 )
                return;

            // copy first
            copySelection( state, state.song, state.activePattern );

            // delete second
            deleteSelection( state, state.song, state.activePattern, state.lists );
        },
        /**
         * deletes the contents within the current selection
         *
         * @param {Array=} optSelectionContent optional selection content to paste from, when null this method
         *        will by default paste from the selection stored inside this model
         * @param {number=} optFirstSelectedChannel optional first selection channel to paste from, defaults to selection stored in this model
         * @param {number=} optLastSelectedChannel optional last selection channel to paste from, defaults to selection stored in this model
         * @param {number=} optMinSelectedStep optional minimum selection step to paste from, defaults to selection stored in this model
         * @param {number=} optMaxSelectedStep optional maximum selection step to paste from, defaults to selection stored in this model
         */
        deleteSelection(state, { optSelectionContent, optFirstSelectedChannel, optLastSelectedChannel,
                                 optMinSelectedStep, optMaxSelectedStep }) {
            let firstSelectedChannel = state.firstSelectedChannel,
                lastSelectedChannel  = state.lastSelectedChannel,
                minSelectedStep      = state.minSelectedStep,
                maxSelectedStep      = state.maxSelectedStep;

            if ( Array.isArray( optSelectionContent )) {
                firstSelectedChannel = optFirstSelectedChannel;
                lastSelectedChannel  = optLastSelectedChannel;
                minSelectedStep      = optMinSelectedStep;
                maxSelectedStep      = optMaxSelectedStep;
            }
            else if ( getSelectionLength(state) === 0 ) {
                return;
            }
            const selectedChannels = ( Array.isArray( optSelectionContent )) ? optSelectionContent : state.selectedChannels;

            const pattern = state.song.patterns[ state.activePattern ];
            let event;

            for ( let channelIndex = firstSelectedChannel; channelIndex <= lastSelectedChannel; ++channelIndex )
            {
                if ( selectedChannels[ channelIndex ].length > 0 )
                {
                    for ( let sIndex = minSelectedStep, l = maxSelectedStep; sIndex <= l; ++sIndex ) {

                        event = pattern.channels[ channelIndex ][ sIndex ];

                        EventUtil.clearEvent(
                            state.song,
                            state.activePattern,
                            channelIndex,
                            sIndex,
                            state.lists[ state.activePattern ]
                        );
                        pattern.channels[ channelIndex ][ sIndex ] = 0;
                    }
                }
            }
        },
        /**
         * @param {Object} state
         * @param {Array=} optSelectionContent optional selection content to paste from, when null this method
         *        will by default paste from the selection stored inside this model
         */
        pasteSelection(state, optSelectionContent ) {
            if ( !Array.isArray( optSelectionContent )) {
                optSelectionContent = state.copySelection;
            }

            if ( Array.isArray( optSelectionContent ) && optSelectionContent.length > 0 ) {
                let target = state.song.patterns[ state.activePattern ];
                let targetPattern, writeIndex, clone;
                let selectionLength = optSelectionContent.length;

                for ( let cIndex = state.activeChannel, max = target.channels.length, j = 0;
                      cIndex < max && j < selectionLength; ++cIndex, ++j ) {
                    targetPattern = target.channels[ cIndex ];

                    optSelectionContent[ j ].forEach(( event, index ) => {
                        writeIndex = state.activeStep + index;

                        if ( writeIndex < targetPattern.length ) {
                            if ( event && ( event.action !== 0 || event.mp )) {

                                clone = ObjectUtil.clone( event );
                                clone.instrument  = cIndex;
                                clone.seq.playing = false;
                                EventUtil.setPosition( clone, target, state.activePattern, writeIndex, state.song.meta.tempo, clone.seq.length );
                                targetPattern[ writeIndex ] = clone;
                                EventUtil.linkEvent( clone, cIndex, state.song, state.lists );
                            }
                        }
                    });
                }
            }
            clearSelection(state);
        },
        /**
         * hook for KeyboardController
         *
         * @param {number} keyCode determining the vertical direction we're moving in (38 = up, 40 = down)
         * @param {number} activeChannel the active channel in the track list
         * @param {number} curStep the current active step within the current pattern
         * @param {number} activeStep the next active step within the current pattern
         */
        handleVerticalKeySelectAction( state, { keyCode, activeChannel, curStep, activeStep }) {
            const ac           = state.actionCache,
                  isUp         = ( keyCode === 38 ),
                  hadSelection = hasSelection(state);

            if ( !hadSelection )
                ac.channelOnSelection = activeChannel;

            if ( isUp )
            {
                // moving up

                if ( ac.stepOnSelection === -1 || ac.prevVerticalKey !== keyCode )
                {
                    ac.shrinkSelection = ( curStep === ( state.maxSelectedStep ));
                    ac.minOnSelection  = state.minSelectedStep;
                    ac.maxOnSelection  = state.maxSelectedStep;
                    ac.stepOnSelection = (( ac.minOnSelection === curStep ) ? ac.minOnSelection : activeStep ) + 2;
                }

                if ( !hadSelection )
                    setSelectionChannelRange( state, activeChannel );

                if ( ac.shrinkSelection ) {
                    if ( ac.minOnSelection === activeStep ) {
                        ac.stepOnSelection = -1;
                    }
                    setSelection( state, ac.minOnSelection, activeStep );
                }
                else
                    setSelection( state, activeStep, ac.stepOnSelection - 1 );
            }
            else {
                // moving down

                if ( ac.stepOnSelection === -1 || ac.prevVerticalKey !== keyCode ) {
                    ac.shrinkSelection = ( ac.prevVerticalKey !== keyCode && curStep === state.minSelectedStep && activeStep !== 1 );
                    ac.minOnSelection  = state.minSelectedStep;
                    ac.maxOnSelection  = state.maxSelectedStep;
                    ac.stepOnSelection = ( ac.maxOnSelection === ( activeStep - 1 )) ? ac.minOnSelection : activeStep - 1;
                }

                if ( !hadSelection )
                    setSelectionChannelRange( state, activeChannel );

                if ( ac.shrinkSelection )
                {
                    if ( ac.maxOnSelection === activeStep + 1 )
                        ac.stepOnSelection = -1;

                    setSelection( state, activeStep, ac.maxOnSelection );
                }
                else
                    setSelection( state, ac.stepOnSelection, Math.max( state.maxSelectedStep, activeStep ));
            }
            ac.prevVerticalKey = keyCode;
        },
        /**
         * hook for KeyboardController
         *
         * @param {number} keyCode the horizontal direction we're moving in (37 = left, 39 = right)
         * @param {number} activeChannelOnStart the active channel when the horizontal selection started
         * @param {number} activeStepOnStart the active step when the horizontal selection started
         */
        handleHorizontalKeySelectAction( state, { keyCode, activeChannelOnStart, activeStepOnStart }) {
            const ac           = state.actionCache,
                  isLeft       = ( keyCode === 37 ),
                  hadSelection = hasSelection(state);

            if ( !hadSelection ) {
                state.minSelectedStep     = activeStepOnStart;
                state.maxSelectedStep      = activeStepOnStart;
                state.lastSelectedChannel  = activeChannelOnStart;
                state.firstSelectedChannel = activeChannelOnStart;
                state.lastSelectedChannel  = activeChannelOnStart;
                ac.channelOnSelection      = activeChannelOnStart;
                ac.directionOnSelection    = keyCode;
            }

            let targetLastSelectedChannel = ( isLeft ) ? state.lastSelectedChannel - 1 : state.lastSelectedChannel + 1;

            if ( hadSelection && ac.prevHorizontalKey !== keyCode )
                targetLastSelectedChannel = ( isLeft ) ? state.lastSelectedChannel - 1 : activeChannelOnStart + 1;

            // scenario : shrinking a selection that started with left movement, by moving to the right

            if ( hadSelection && !isLeft && ac.prevHorizontalKey === 37 && ac.prevHorizontalKey === ac.directionOnSelection ) {
                setSelectionChannelRange( state, state.firstSelectedChannel + 1, --targetLastSelectedChannel );
                return;
            }

            if ( targetLastSelectedChannel >= ac.channelOnSelection )
                setSelectionChannelRange( state, ac.channelOnSelection, targetLastSelectedChannel );
            else
                setSelectionChannelRange( state, state.firstSelectedChannel - 1, state.lastSelectedChannel );

            ac.prevHorizontalKey = keyCode;
        },
        /**
         * sets the channels that are present in the selection
         *
         * @param {Object} state
         * @param {number} firstChannel
         * @param {number=} lastChannel optional (defaults to firstChannel for single channel selection)
         */
        setSelectionChannelRange(state, { firstChannel, lastChannel }) {
            setSelectionChannelRange(state, firstChannel, lastChannel);
        },
        equalizeSelection,
        clearSelection,
        setSelection
    }
};

// set initial values
clearSelection(module.state);

export default module;
