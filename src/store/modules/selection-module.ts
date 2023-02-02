/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2022 - https://www.igorski.nl
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
import type { Module } from "vuex";
import Vue from "vue";
import { writeToClipboard } from "@/utils/clipboard-util";
import EventUtil from "@/utils/event-util";
import type LinkedList from "@/utils/linked-list";
import { clone } from "@/utils/object-util";
import { ACTION_IDLE } from "@/model/types/audio-event";
import type { EffluxAudioEvent } from "@/model/types/audio-event";
import type { EffluxChannel } from "@/model/types/channel";
import type { EffluxPattern } from "@/model/types/pattern";
import type { EffluxSong } from "@/model/types/song";

type ChannelSelection = number[];

export interface SelectionState {
    selectedChannels: ChannelSelection[],
    firstSelectedChannel: number,
    lastSelectedChannel: number,
    minSelectedStep: number, // lowest index within the selection
    maxSelectedStep: number, // highest index within the selection
    copySelection: EffluxChannel[] | null,
    // contains states associated with the current selection action triggered by key events (@see pattern-track-list.vue)
    actionCache: {
        stepOnSelection: number;
        channelOnSelection: number;
        shrinkSelection: boolean;
        minOnSelection: number;
        maxOnSelection: number;
    },
};

/* internal methods */

const sort = ( state: SelectionState ): void => {
    let i = state.selectedChannels.length;

    while ( i-- ) {
        const channel = state.selectedChannels[ i ];
        if ( channel ) {
            channel.sort(( a: number, b: number ) => a - b );
        }
    }
};

const clearSelection = ( state: SelectionState ): void => {
    state.selectedChannels     = [];
    state.minSelectedStep      =
    state.maxSelectedStep      =
    state.firstSelectedChannel =
    state.lastSelectedChannel  = 0;

    const ac = state.actionCache;

    ac.stepOnSelection    = -1;
    ac.channelOnSelection = -1;
    ac.shrinkSelection    = false;
    ac.minOnSelection     = -1;
    ac.maxOnSelection     = -1;
};

const hasSelection = ( state: SelectionState ): boolean => state.selectedChannels.length > 0;
const getSelectionLength = ( state: SelectionState ): number => ( state.maxSelectedStep - state.minSelectedStep ) + 1;

/**
 * copies the contents within the current selection
 *
 * note: optOutputArray os an optional Array to copy selection contents
 * into (when undefined, this will by default store the selection inside
 * this model so it can later on be pasted from this model)
 */
const copySelection = ( state: SelectionState, { song, activePattern, optOutputArray } :
{ song: EffluxSong, activePattern: number, optOutputArray?: EffluxChannel[] }): void => {
    if ( getSelectionLength( state ) === 0 ) {
        return;
    }
    let i, max = state.selectedChannels.length;

    if ( !Array.isArray( optOutputArray )) {
        state.copySelection = [];
        optOutputArray = state.copySelection;
    }

    for ( i = 0; i < max; ++i ) {
        optOutputArray.push( [] );
    }
    let pattern = song.patterns[ activePattern ];
    let copyIndex = 0;

    for ( i = 0; i < max; ++i ) {
        const channel = state.selectedChannels[ i ];
        if ( channel && channel.length > 0 ) {
            for ( let j = state.minSelectedStep, l = state.maxSelectedStep; j <= l; ++j ) {
                const stepValue = pattern.channels[ i ][ j ];
                optOutputArray[ copyIndex ].push(( stepValue ) ? clone( stepValue ) : null );
            }
            ++copyIndex;
        }
    }
    // by writing into the clipboard we ensure that copied files are no
    // longer in the clipboard history (prevents double load on paste shortcut)
    writeToClipboard( JSON.stringify( optOutputArray ));
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
const deleteSelection = ( state: SelectionState,
    {
        song, eventList, activePattern, optSelectionContent, optFirstSelectedChannel, optLastSelectedChannel,
        optMinSelectedStep, optMaxSelectedStep
    }: {
        song: EffluxSong, eventList: LinkedList[], activePattern: number, optSelectionContent?: number,
        optFirstSelectedChannel?: number, optLastSelectedChannel?: number,
        optMinSelectedStep?: number, optMaxSelectedStep?: number
    }) => {

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
    else if ( getSelectionLength( state ) === 0 ) {
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
                // @ts-expect-error we allow '0' as a falsy value to specify an empty event within the channel
                pattern.channels[ channelIndex ][ sIndex ] = 0;
            }
        }
    }
};

const setSelectionChannelRange = ( state: SelectionState, firstChannel: number, lastChannel?: number ): void => {
    if ( typeof lastChannel !== "number" ) {
        lastChannel = firstChannel;
    }
    state.firstSelectedChannel = firstChannel;
    state.lastSelectedChannel  = lastChannel;

    for ( let i = state.firstSelectedChannel; i <= state.lastSelectedChannel; ++i ) {
        state.selectedChannels[ i ] = [];
    }
    setSelection( state, state.minSelectedStep, state.maxSelectedStep );
};

/**
 * equalize selection length for all channels
 * (if the other channels had a selection)
 */
const equalizeSelection = ( state: SelectionState ):void => {
    const selection = state.selectedChannels;
    for ( let i = state.firstSelectedChannel; i < state.lastSelectedChannel; ++i ) {
        const currentChannel = selection[ i ];
        currentChannel.forEach(( step: number ): void => {
            for ( let j = state.minSelectedStep; j < state.maxSelectedStep; ++j ) {
                const otherChannel = selection[ i ];
                if ( !otherChannel.includes( step )) {
                    otherChannel.push( step );
                }
            }
        });
    }
    sort( state );
};

/**
 * sets the selected steps within the selection to given range
 *
 * @param {Object} state
 * @param {number} selectionStart the index of the first step in the selection
 * @param {number=} selectionEnd the index of the last step in the selection optional,
 *                  defaults to selectionStart when not given
 */
const setSelection = ( state: SelectionState, selectionStart: number, selectionEnd?: number ): void => {
    //if ( !state.selectedChannels.length > 0 )
        //throw new Error( "cannot set selection range if no selection channel range had been specified" );

    if ( typeof selectionEnd !== "number" ) {
        selectionEnd = selectionStart;
    }

    // update to new values

    state.minSelectedStep = Math.min( selectionStart, selectionEnd );
    state.maxSelectedStep = Math.max( selectionEnd, selectionStart );

    state.selectedChannels = [];

    for ( let i = state.firstSelectedChannel; i <= state.lastSelectedChannel; ++i ) {
        const patterns: number[] = state.selectedChannels[ i ] = [];

        for ( let j = state.minSelectedStep; j <= state.maxSelectedStep; ++j ) {
            patterns.push( j );
        }
    }
    equalizeSelection( state );
};

// selection module maintains selections inside the pattern editor
// this allows for cutting, copying and pasting pattern data across
// tracks and patterns within a song

const SelectionModule: Module<SelectionState, any> = {
    state: {
        selectedChannels : [],
        firstSelectedChannel : 0,
        lastSelectedChannel : 0,
        minSelectedStep : 0,
        maxSelectedStep : 0,
        copySelection : null,
        actionCache : {
            stepOnSelection: -1,
            channelOnSelection: -1,
            shrinkSelection: false,
            minOnSelection: -1,
            maxOnSelection: -1
        }
    },
    getters: {
        hasSelection,
        getSelectionLength,
        /**
         * retrieve the contents of the current selection
         */
        getSelection: ( state: SelectionState ) => ({ song, activePattern }: { song: EffluxSong, activePattern: number }): EffluxChannel[] => {
            const optOutputArray = [] as EffluxChannel[];
            copySelection( state, { song, activePattern, optOutputArray });
            return optOutputArray;
        },
        hasCopiedEvents: ( state: SelectionState ): boolean => !!state.copySelection?.length,
    },
    mutations: {
        setMinSelectedStep( state: SelectionState, value: number ): void {
            state.minSelectedStep = value;
        },
        setMaxSelectedStep( state: SelectionState, value: number ): void {
            state.maxSelectedStep = value;
        },
        /**
         * sets the channels that are present in the selection
         * note: lastChannel is optional (defaults to firstChannel for single channel selection)
         */
        setSelectionChannelRange( state: SelectionState,
            { firstChannel, lastChannel } : { firstChannel: number, lastChannel?: number }): void {
            setSelectionChannelRange( state, firstChannel, lastChannel );
        },
        setStepOnSelection( state: SelectionState, step: number ): void {
            state.actionCache.stepOnSelection = step;
        },
        /**
         * cuts the contents within the current selection
         * (copies their data and deletes them)
         */
        cutSelection( state: SelectionState, { song, activePattern, eventList }:
            { song: EffluxSong, activePattern: number, eventList: LinkedList[] }): void {
            if ( getSelectionLength( state ) === 0 ) {
                return;
            }
            // copy first
            copySelection( state, { song, activePattern });

            // delete second
            deleteSelection( state, { song, activePattern, eventList });
        },
        /**
         * note: optSelectionContent is optional selection content to paste from, when undefined this method
         * will by default paste from the selection stored inside this model
         */
        pasteSelection( state: SelectionState,
            { song, eventList, activePattern, selectedInstrument, selectedStep, optSelectionContent = null }:
            { song: EffluxSong, eventList: LinkedList[], activePattern: number, selectedInstrument: number,
              selectedStep: number, optSelectionContent?: EffluxChannel[] | null }
        ): void {
            if ( !Array.isArray( optSelectionContent )) {
                optSelectionContent = state.copySelection as EffluxChannel[];
            }
            if ( Array.isArray( optSelectionContent ) && optSelectionContent.length > 0 ) {
                const targetPattern   = song.patterns[activePattern];
                const selectionLength = optSelectionContent.length;

                for ( let cIndex = selectedInstrument, max = targetPattern.channels.length, j = 0;
                      cIndex < max && j < selectionLength; ++cIndex, ++j ) {
                    const targetChannel = targetPattern.channels[ cIndex ];

                    optSelectionContent[ j ].forEach(( event: EffluxAudioEvent, index: number ): void => {
                        const writeIndex = selectedStep + index;

                        if ( writeIndex < targetChannel.length ) {
                            if ( event && ( event.action !== ACTION_IDLE || event.mp )) {

                                const clonedEvent = clone( event ) as EffluxAudioEvent;
                                clonedEvent.instrument  = cIndex;
                                clonedEvent.seq.playing = false;

                                EventUtil.setPosition( clonedEvent, targetPattern, activePattern, writeIndex, song.meta.tempo, clonedEvent.seq.length );
                                Vue.set( targetChannel, writeIndex, clonedEvent );
                                EventUtil.linkEvent( clonedEvent, cIndex, song, eventList );
                            }
                        }
                    });
                }
            }
            clearSelection( state );
        },
        /**
         * hook for KeyboardController
         *
         * @param {number} keyCode determining the vertical direction we're moving in (38 = up, 40 = down)
         * @param {number} selectedChannel the active channel in the track list
         * @param {number} selectedStep the currently selected step within the current pattern
         */
        handleVerticalKeySelectAction( state: SelectionState,
            { keyCode, selectedChannel, selectedStep }: { keyCode: number, selectedChannel: number, selectedStep: number }): void {
            const ac            = state.actionCache,
                  isUp          = isUpKey( keyCode ),
                  hadSelection  = hasSelection( state );

            if ( !hadSelection ) {
                ac.channelOnSelection = selectedChannel;
            }

            const { minSelectedStep, maxSelectedStep } = state;

            if ( isUp ) {
                // moving up
                if ( ac.stepOnSelection === -1 ) {
                    ac.shrinkSelection = selectedStep === maxSelectedStep;
                    ac.minOnSelection  = minSelectedStep;
                    ac.maxOnSelection  = maxSelectedStep;
                    ac.stepOnSelection = ( ac.minOnSelection === selectedStep ? ac.minOnSelection : selectedStep ) + 1;
                }

                if ( !hadSelection ) {
                    setSelectionChannelRange( state, selectedChannel );
                }
                if ( ac.shrinkSelection ) {
                    if ( ac.minOnSelection === selectedStep ) {
                        ac.stepOnSelection = -1;
                    }
                    setSelection( state, ac.minOnSelection, selectedStep );
                }
                else {
                    setSelection( state, selectedStep, ac.stepOnSelection );
                }
            }
            else {
                // moving down
                if ( ac.stepOnSelection === -1 ) {
                    ac.shrinkSelection = selectedStep === minSelectedStep;
                    ac.minOnSelection  = minSelectedStep;
                    ac.maxOnSelection  = maxSelectedStep;
                    ac.stepOnSelection = ( ac.maxOnSelection === ( selectedStep - 1 )) ? ac.maxOnSelection : selectedStep - 1;
                }

                if ( !hadSelection ) {
                    setSelectionChannelRange( state, selectedChannel );
                }
                if ( ac.shrinkSelection ) {
                    if ( ac.maxOnSelection === selectedStep + 1 ) {
                        ac.stepOnSelection = -1;
                    }
                    setSelection( state, selectedStep, ac.maxOnSelection );
                }
                else {
                    setSelection( state, Math.min( ac.stepOnSelection, selectedStep ), Math.max( maxSelectedStep, selectedStep ));
                }
            }
        },
        /**
         * hook for KeyboardController
         *
         * @param {number} keyCode the horizontal direction we're moving in (37 = left, 39 = right)
         * @param {number} selectedChannel the currently selected channel within the current pattern
         * @param {number} selectedStep the currently selected step within the current pattern
         */
        handleHorizontalKeySelectAction( state: SelectionState,
            { keyCode, selectedChannel, selectedStep } :
            { keyCode: number, selectedChannel: number, selectedStep: number }): void
        {
            const ac = state.actionCache, isLeft = keyCode === 37;

            if ( !hasSelection( state )) {
                state.minSelectedStep      = selectedStep;
                state.maxSelectedStep      = selectedStep;
                state.lastSelectedChannel  = selectedChannel;
                state.firstSelectedChannel = selectedChannel;
                state.lastSelectedChannel  = selectedChannel;
                ac.channelOnSelection      = selectedChannel;
            }
            let firstChannelInSelection = state.firstSelectedChannel;
            let lastChannelInSelection  = state.lastSelectedChannel;

            if ( isLeft ) {
                if ( selectedChannel < state.firstSelectedChannel ) {
                    --firstChannelInSelection;
                } else {
                    if ( selectedChannel < ac.channelOnSelection ) {
                        return; // nothing left to do
                    }
                    if ( state.lastSelectedChannel === state.firstSelectedChannel ) {
                        --firstChannelInSelection;
                    } else {
                        --lastChannelInSelection;
                    }
                }
            } else {
                if ( selectedChannel < state.lastSelectedChannel ) {
                    ++firstChannelInSelection;
                } else {
                    ++lastChannelInSelection;
                }
            }
            setSelectionChannelRange( state, Math.max( 0, firstChannelInSelection ), Math.min( 7, lastChannelInSelection ));
        },
        setSelection( state: SelectionState,
            { selectionStart, selectionEnd }: { selectionStart: number, selectionEnd: number }): void {
            setSelection( state, selectionStart, selectionEnd );
        },
        equalizeSelection,
        copySelection,
        clearSelection,
        deleteSelection
    }
};

// set initial values
clearSelection( SelectionModule.state as SelectionState );

export default SelectionModule;

/* internal methods */

const UP_KEYS = [ 33, 36, 38 ]; // page up, home, up
function isUpKey( keyCode: number ): boolean {
    return UP_KEYS.includes( keyCode );
}
