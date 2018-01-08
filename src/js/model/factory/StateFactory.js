/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2018 - http://www.igorski.nl
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

const States     = require( "../../definitions/States" );
const EventUtil  = require( "../../utils/EventUtil" );
const ObjectUtil = require( "../../utils/ObjectUtil" );

module.exports = {

    /**
     * retrieve the appropriate undo/redo actions to
     * perform when changing data of given type
     *
     * @param {string} type
     * @param {Object} data
     * @return {{ undo: Function, redo: Function}|null}
     */
    getAction( type, data ) {
        switch ( type ) {
            default:
                return null;

            case States.ADD_EVENT:
                return addSingleEventAction( data );

            case States.DELETE_EVENT:
                return deleteSingleEventOrSelectionAction( data );

            case States.DELETE_MODULE_AUTOMATION:
                return deleteModuleAutomationAction( data );

            case States.CUT_SELECTION:
                return cutSelectionAction( data );

            case States.PASTE_SELECTION:
                return pasteSelectionAction( data );
        }
    }
};

/* private methods */

/**
 * adds a single AUDIO_EVENT into a pattern
 *
 * @private
 * @param {Object} data
 */
function addSingleEventAction( data ) {

    const song        = data.efflux.activeSong,
          eventList   = data.efflux.eventList,
          editorModel = data.efflux.EditorModel,
          event       = data.event;

    // active instrument and pattern for event (can be different to currently visible pattern
    // e.g. undo/redo action performed when viewing another pattern)

    let patternIndex = editorModel.activePattern,
        channelIndex = editorModel.activeInstrument,
        step         = editorModel.activeStep;

    // currently active instrument and pattern (e.g. visible on screen)

    const activePattern    = editorModel.activePattern,
          activeInstrument = editorModel.activeInstrument;

    let advanceStepOnAddition = true;

    // if options Object was given, use those values instead of current sequencer values

    let optData;
    if ( optData = data.optEventData ) {
        patternIndex = ( typeof optData.patternIndex === "number" ) ? optData.patternIndex : patternIndex;
        channelIndex = ( typeof optData.channelIndex === "number" ) ? optData.channelIndex : channelIndex;
        step         = ( typeof optData.step         === "number" ) ? optData.step         : step;

        if ( typeof optData.advanceOnAddition === "boolean" )
            advanceStepOnAddition = optData.advanceOnAddition;
    }

    const pattern = song.patterns[ patternIndex ],
          channel = pattern.channels[ channelIndex ];

    function add() {
        EventUtil.setPosition(
            event, pattern, patternIndex, step, song.meta.tempo
        );

        // remove previous event if one existed at the insertion point
        // (but take its module parameter automation when existing for non-off events)

        if ( channel[ step ]) {
            if ( event.action !== 2 && !event.mp && channel[ step ].mp )
                event.mp = ObjectUtil.clone( channel[ step ].mp );
            EventUtil.clearEvent( song, patternIndex, channelIndex, step, eventList[ patternIndex ]);
        }
        channel[ step ] = event;

        // update linked list for AudioEvents
        EventUtil.linkEvent( event, channelIndex, song, eventList );

        if ( optData && optData.newEvent === true ) {

            // new events by default take the instrument of the previously declared note in
            // the current patterns event channel

            const node = eventList[ channelIndex ].getNodeByData( event );
            let prevNode = ( node ) ? node.previous : null;

            // but don't take a noteOff instruction into account (as it is not assigned to an instrument)
            // keep on traversing backwards until we find a valid event

            while ( prevNode && prevNode.data.action === 2 ) {
                prevNode = prevNode.previous;
            }

            // only do this for events within the same measure though

            if ( prevNode && prevNode.data.seq.startMeasure === event.seq.startMeasure &&
                 prevNode.instrument !== activeInstrument &&
                 event.instrument    === activeInstrument ) {

                event.instrument = prevNode.data.instrument;
            }
        }
        data.updateHandler( advanceStepOnAddition ); // syncs view with model changes
        advanceStepOnAddition = false;
    }

    // add the event as it was the trigger for this action
    add();

    // return the state change handlers so the StateModel can store appropriate undo/redo actions

    return {
        undo() {
            EventUtil.clearEvent(
                song,
                activePattern,
                activeInstrument,
                step,
                eventList[ activeInstrument ]
            );
            data.updateHandler(); // syncs view with model changes
        },
        redo() {
            add();
        }
    };
}

/**
 * removes a single AUDIO_EVENT or multiple AUDIO_EVENTS within a selection
 * from a pattern
 *
 * @private
 * @param {Object} data
 */
function deleteSingleEventOrSelectionAction( data ) {

    const song             = data.efflux.activeSong,
          eventList        = data.efflux.eventList,
          editorModel      = data.efflux.EditorModel,
          selectionModel   = data.efflux.SelectionModel,
          activePattern    = editorModel.activePattern,
          activeInstrument = editorModel.activeInstrument,
          activeStep       = editorModel.activeStep,
          event            = song.patterns[ activePattern ].channels[ activeInstrument ][ activeStep ];

    // if a selection is set, store its state for redo purposes

    const selection            = selectionModel.getSelection( song, activePattern );
    const hadSelection         = ( selection.length > 0 );
    const selectedFirstChannel = selectionModel.firstSelectedChannel;
    const selectedLastChannel  = selectionModel.lastSelectedChannel;
    const selectedMinStep      = selectionModel.minSelectedStep;
    const selectedMaxStep      = selectionModel.maxSelectedStep;

    function remove( optSelection ) {
        if ( hadSelection ) {
            // pass selection when redoing a delete action on a selection
            selectionModel.deleteSelection(
                song, activePattern, eventList,
                optSelection, selectedFirstChannel, selectedLastChannel, selectedMinStep, selectedMaxStep
            );
        }
        else {
            EventUtil.clearEvent(
                song,
                activePattern,
                activeInstrument,
                activeStep,
                eventList[ activeInstrument ]
            );
        }
        data.updateHandler(); // syncs view with model changes
    }

    // delete the event as it was the trigger for this action
    remove();

    // return the state change handlers so the StateModel can store appropriate undo/redo actions

    return {
        undo() {
            if ( hadSelection ) {
                selectionModel.pasteSelection(
                    song, activePattern, activeInstrument, activeStep, eventList, selection
                );
            }
            else {
                data.addHandler( event, {
                    patternIndex: activePattern,
                    channelIndex: activeInstrument,
                    step: activeStep
                }, false ); // false flag prevents storing in undo/redo again, kinda important!
            }
            data.updateHandler(); // syncs view with model changes
        },
        redo() {
            remove( selection );
        }
    };
}

/**
 * @private
 * @param {Object} data
 */
function deleteModuleAutomationAction( data ) {

    const event = data.event;
    const clonedAutomation = ObjectUtil.clone( event.mp );
    const remove = () => {
        delete event.mp;
        data.updateHandler(); // syncs view with model changes
    };

    // perform action
    remove();

    return {
        undo() {
            event.mp = clonedAutomation;
            data.updateHandler(); // syncs view with model changes
        },
        redo() {
            remove();
        }
    };
}

/**
 * @private
 * @param {Object} data
 */
function cutSelectionAction( data ) {

    const song           = data.efflux.activeSong,
          editorModel    = data.efflux.EditorModel,
          selectionModel = data.efflux.SelectionModel;

    if ( !selectionModel.hasSelection() ) {
        selectionModel.setSelectionChannelRange( editorModel.activeInstrument );
        selectionModel.setSelection( editorModel.activeStep );
    }
    const activePattern        = editorModel.activePattern;
    const selectedFirstChannel = selectionModel.firstSelectedChannel;
    const selectedLastChannel  = selectionModel.lastSelectedChannel;
    const selectedMinStep      = selectionModel.minSelectedStep;
    const selectedMaxStep      = selectionModel.maxSelectedStep;

    const originalPatternData = clonePattern( song, activePattern );
    let cutData;
    function cut() {
        if ( cutData ) {
            song.patterns[ activePattern ] = cutData;
        }
        else {
            selectionModel.cutSelection( song, activePattern, data.efflux.eventList );
            cutData = clonePattern( song, activePattern );
        }
        selectionModel.clearSelection();
        data.updateHandler(); // syncs view with model changes
    }

    // cut the data as it was the trigger for this action
    cut();

    // return the state change handlers so the StateModel can store appropriate undo/redo actions

    return {
        undo() {
            // set the cloned pattern data back
            song.patterns[ activePattern ] = originalPatternData;

            // restore selection model to previous state
            selectionModel.minSelectedStep = selectedMinStep;
            selectionModel.maxSelectedStep = selectedMaxStep;
            selectionModel.setSelectionChannelRange( selectedFirstChannel, selectedLastChannel );

            data.updateHandler(); // syncs view with model changes
        },
        redo() {
            cut();
        }
    };
}

/**
 * @private
 * @param {Object} data
 */
function pasteSelectionAction( data ) {

    const song             = data.efflux.activeSong,
          eventList        = data.efflux.eventList,
          editorModel      = data.efflux.EditorModel,
          selectionModel   = data.efflux.SelectionModel,
          activePattern    = editorModel.activePattern,
          activeInstrument = editorModel.activeInstrument,
          activeStep       = editorModel.activeStep;

    let originalPatternData = clonePattern( song, activePattern );
    let pastedData;

    const selectedFirstChannel = selectionModel.firstSelectedChannel;
    const selectedLastChannel  = selectionModel.lastSelectedChannel;
    const selectedMinStep      = selectionModel.minSelectedStep;
    const selectedMaxStep      = selectionModel.maxSelectedStep;

    function paste() {
        if ( pastedData ) {
            song.patterns[ activePattern ] = pastedData;
        }
        else {
            selectionModel.pasteSelection(
                song, activePattern, activeInstrument, activeStep, eventList
            );
            pastedData = clonePattern( song, activePattern );
        }
        data.updateHandler(); // syncs view with model changes
    }

    // delete the data as it was the trigger for this action
    paste();

    // return the state change handlers so the StateModel can store appropriate undo/redo actions

    return {
        undo() {
            // set the cloned pattern data back
            song.patterns[ activePattern ] = originalPatternData;

            // we can safely override the existing selection of the model when undoing an existing paste
            // this means we are returning the model to the state prior to the pasting
            // restore selection model to previous state

            selectionModel.minSelectedStep = selectedMinStep;
            selectionModel.maxSelectedStep = selectedMaxStep;
            selectionModel.setSelectionChannelRange( selectedFirstChannel, selectedLastChannel );

            data.updateHandler(); // syncs view with model changes
        },
        redo() {
            paste( originalPatternData );
        }
    };
}

/**
 * convenience method to clone all event and channel data
 * for given pattern
 *
 * @param {SONG} song
 * @param {number} activePattern
 * @returns {Object}
 */
function clonePattern( song, activePattern ) {
    return ObjectUtil.clone(
        song.patterns[ activePattern ]
    );
}
