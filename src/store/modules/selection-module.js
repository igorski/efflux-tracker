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
import Vue from 'vue';
import EventUtil from '../../utils/event-util';
import ObjectUtil from '../../utils/object-util';

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
const copySelection = ( state, { song, activePattern, optOutputArray }) => {
    if ( getSelectionLength(state) === 0 )
        return;

    let i, max = state.selectedChannels.length;

    if ( !Array.isArray( optOutputArray )) {
        state.copySelection = [];
        optOutputArray = state.copySelection;
    }

    for ( i = 0; i < max; ++i )
        optOutputArray.push( [] );

    let pattern = song.patterns[activePattern], stepValue;
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
const deleteSelection = (state, { song, eventList, activePattern,
                                  optSelectionContent, optFirstSelectedChannel, optLastSelectedChannel,
                                  optMinSelectedStep, optMaxSelectedStep }) => {
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
    const pattern = song.patterns[ activePattern ];

    for ( let channelIndex = firstSelectedChannel; channelIndex <= lastSelectedChannel; ++channelIndex ) {
        if ( selectedChannels[ channelIndex ].length > 0 ) {
            for ( let sIndex = minSelectedStep, l = maxSelectedStep; sIndex <= l; ++sIndex ) {
                EventUtil.clearEvent(
                    song,
                    activePattern,
                    channelIndex,
                    sIndex,
                    eventList[ activePattern ]
                );
                pattern.channels[ channelIndex ][ sIndex ] = 0;
            }
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

    if ( typeof selectionEnd !== 'number' )
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
         * @type {Array<Array<number>>}
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
         * @type {Array<Array<AUDIO_EVENT>>}
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
         * @return {Array<Object>}
         */
        getSelection: state => ({ song, activePattern }) => {
            const out = [];
            copySelection( state, { song, activePattern, out });
            return out;
        }
    },
    mutations: {
        setMinSelectedStep(state, value) {
            state.minSelectedStep = value;
        },
        setMaxSelectedStep(state, value) {
            state.maxSelectedStep = value;
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
        setStepOnSelection(state, step) {
            state.actionCache.stepOnSelection = step;
        },
        /**
         * cuts the contents within the current selection
         * (copies their data and deletes them)
         */
        cutSelection( state, { song, activePattern, eventList }) {
            if ( getSelectionLength(state) === 0 )
                return;

            // copy first
            copySelection( state, { song, activePattern });

            // delete second
            deleteSelection( state, { song, activePattern, eventList });
        },
        /**
         * @param {Object} state
         * @param {Array=} optSelectionContent optional selection content to paste from, when null this method
         *        will by default paste from the selection stored inside this model
         */
        pasteSelection(state, { song, eventList, activePattern, selectedInstrument, selectedStep, optSelectionContent = null }) {
            if ( !Array.isArray( optSelectionContent )) {
                optSelectionContent = state.copySelection;
            }

            if ( Array.isArray( optSelectionContent ) && optSelectionContent.length > 0 ) {
                const targetPattern   = song.patterns[activePattern];
                const selectionLength = optSelectionContent.length;

                for ( let cIndex = selectedInstrument, max = targetPattern.channels.length, j = 0;
                      cIndex < max && j < selectionLength; ++cIndex, ++j ) {
                    const targetChannel = targetPattern.channels[ cIndex ];

                    optSelectionContent[ j ].forEach(( event, index ) => {
                        const writeIndex = selectedStep + index;

                        if ( writeIndex < targetChannel.length ) {
                            if ( event && ( event.action !== 0 || event.mp )) {

                                const clone = ObjectUtil.clone( event );
                                clone.instrument  = cIndex;
                                clone.seq.playing = false;
                                
                                EventUtil.setPosition( clone, targetPattern, activePattern, writeIndex, song.meta.tempo, clone.seq.length );
                                Vue.set(targetChannel, writeIndex, clone);
                                EventUtil.linkEvent( clone, cIndex, song, eventList );
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
         * @param {number} selectedChannel the active channel in the track list
         * @param {number} selectedStep the currently selected step within the current pattern
         */
        handleVerticalKeySelectAction(state, { keyCode, selectedChannel, selectedStep }) {
            const ac           = state.actionCache,
                  isUp         = ( keyCode === 38 ),
                  hadSelection = hasSelection(state);

            if ( !hadSelection )
                ac.channelOnSelection = selectedChannel;

            if ( isUp )
            {
                // moving up

                if ( ac.stepOnSelection === -1 || ac.prevVerticalKey !== keyCode )
                {
                    ac.shrinkSelection = ( selectedStep === ( state.maxSelectedStep ));
                    ac.minOnSelection  = state.minSelectedStep;
                    ac.maxOnSelection  = state.maxSelectedStep;
                    ac.stepOnSelection = (( ac.minOnSelection === selectedStep ) ? ac.minOnSelection : selectedStep ) + 2;
                }

                if ( !hadSelection )
                    setSelectionChannelRange( state, selectedChannel );

                if ( ac.shrinkSelection ) {
                    if ( ac.minOnSelection === selectedStep ) {
                        ac.stepOnSelection = -1;
                    }
                    setSelection( state, ac.minOnSelection, selectedStep );
                }
                else
                    setSelection( state, selectedStep, ac.stepOnSelection - 1 );
            }
            else {
                // moving down

                if ( ac.stepOnSelection === -1 || ac.prevVerticalKey !== keyCode ) {
                    ac.shrinkSelection = ( ac.prevVerticalKey !== keyCode && selectedStep === state.minSelectedStep && selectedStep !== 1 );
                    ac.minOnSelection  = state.minSelectedStep;
                    ac.maxOnSelection  = state.maxSelectedStep;
                    ac.stepOnSelection = ( ac.maxOnSelection === ( selectedStep - 1 )) ? ac.minOnSelection : selectedStep - 1;
                }

                if ( !hadSelection )
                    setSelectionChannelRange( state, selectedChannel );

                if ( ac.shrinkSelection )
                {
                    if ( ac.maxOnSelection === selectedStep + 1 )
                        ac.stepOnSelection = -1;

                    setSelection( state, selectedStep, ac.maxOnSelection );
                }
                else
                    setSelection( state, ac.stepOnSelection, Math.max( state.maxSelectedStep, selectedStep ));
            }
            ac.prevVerticalKey = keyCode;
        },
        /**
         * hook for KeyboardController
         *
         * @param {number} keyCode the horizontal direction we're moving in (37 = left, 39 = right)
         * @param {number} selectedChannelOnStart the selected channel when the horizontal selection started
         * @param {number} selectedStepOnStart the selected step when the horizontal selection started
         */
        handleHorizontalKeySelectAction(state, { keyCode, selectedChannelOnStart, selectedStepOnStart }) {
            const ac           = state.actionCache,
                  isLeft       = ( keyCode === 37 ),
                  hadSelection = hasSelection(state);

            if ( !hadSelection ) {
                state.minSelectedStep      = selectedStepOnStart;
                state.maxSelectedStep      = selectedStepOnStart;
                state.lastSelectedChannel  = selectedChannelOnStart;
                state.firstSelectedChannel = selectedChannelOnStart;
                state.lastSelectedChannel  = selectedChannelOnStart;
                ac.channelOnSelection      = selectedChannelOnStart;
                ac.directionOnSelection    = keyCode;
            }

            let targetLastSelectedChannel = ( isLeft ) ? state.lastSelectedChannel - 1 : state.lastSelectedChannel + 1;

            if ( hadSelection && ac.prevHorizontalKey !== keyCode )
                targetLastSelectedChannel = ( isLeft ) ? state.lastSelectedChannel - 1 : selectedChannelOnStart + 1;

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
        setSelection(state, { selectionStart, selectionEnd }) {
            setSelection(state, selectionStart, selectionEnd);
        },
        equalizeSelection,
        copySelection,
        clearSelection,
        deleteSelection
    }
};

// set initial values
clearSelection(module.state);

export default module;
