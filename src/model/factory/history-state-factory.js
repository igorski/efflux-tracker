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
import Vue            from 'vue';
import HistoryStates  from '../../definitions/history-states';
import PatternFactory from './pattern-factory';
import EventUtil      from '../../utils/event-util';
import ObjectUtil     from '../../utils/object-util';
import PatternUtil    from '../../utils/pattern-util';

export default {

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

            case HistoryStates.ADD_EVENT:
                return addSingleEventAction( data );

            case HistoryStates.DELETE_EVENT:
                return deleteSingleEventOrSelectionAction( data );

            case HistoryStates.DELETE_SELECTION:
                return deleteSelectionAction( data );

            case HistoryStates.DELETE_MODULE_AUTOMATION:
                return deleteModuleAutomationAction( data );

            case HistoryStates.CLEAR_PATTERN:
                return clearPattern( data );

            case HistoryStates.PASTE_PATTERN:
                return pastePattern( data );

            case HistoryStates.ADD_PATTERN:
                return addPattern( data );

            case HistoryStates.DELETE_PATTERN:
                return deletePattern( data );

            case HistoryStates.CUT_SELECTION:
                return cutSelectionAction( data );

            case HistoryStates.PASTE_SELECTION:
                return pasteSelectionAction( data );
        }
    }
};

/* internal methods */

/**
 * adds a single AUDIO_EVENT into a pattern
 */
function addSingleEventAction({ store, event, optEventData, updateHandler }) {

    const song        = store.state.song.activeSong,
          eventList   = store.state.editor.eventList;

    // active instrument and pattern for event (can be different to currently visible pattern
    // e.g. undo/redo action performed when viewing another pattern)

    let patternIndex = store.state.sequencer.activePattern,
        channelIndex = store.state.editor.selectedInstrument,
        step         = store.state.editor.selectedStep;

    // currently active instrument and pattern (e.g. visible on screen)

    const activePattern = store.state.sequencer.activePattern;
    let advanceStepOnAddition = true;

    // if options Object was given, use those values instead of current sequencer values

    if ( optEventData ) {
        patternIndex = ( typeof optEventData.patternIndex === 'number' ) ? optEventData.patternIndex : patternIndex;
        channelIndex = ( typeof optEventData.channelIndex === 'number' ) ? optEventData.channelIndex : channelIndex;
        step         = ( typeof optEventData.step         === 'number' ) ? optEventData.step         : step;

        if ( typeof optEventData.advanceOnAddition === 'boolean' )
            advanceStepOnAddition = optEventData.advanceOnAddition;
    }

    function add() {
        const pattern = song.patterns[ patternIndex ],
              channel = pattern.channels[ channelIndex ];

        EventUtil.setPosition(
            event, pattern, patternIndex, step, song.meta.tempo
        );

        // remove previous event if one existed at the insertion point
        // (but take its module parameter automation when existing for non-off events)

        if ( channel[ step ]) {
            if ( event.action !== 2 && !event.mp && channel[ step ].mp )
                Vue.set(event, 'mp', ObjectUtil.clone( channel[ step ].mp ));

            EventUtil.clearEvent( song, patternIndex, channelIndex, step, eventList[ patternIndex ]);
        }
        Vue.set(channel, step, event);

        // update linked list for AudioEvents
        EventUtil.linkEvent( event, channelIndex, song, eventList );

        if ( optEventData && optEventData.newEvent === true ) {

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
                 prevNode.instrument !== channelIndex &&
                 event.instrument    === channelIndex ) {

                event.instrument = prevNode.data.instrument;
            }
        }
        updateHandler( advanceStepOnAddition );
        advanceStepOnAddition = false;
    }
    add(); // perform action

    return {
        undo() {
            EventUtil.clearEvent(
                song,
                activePattern,
                channelIndex,
                step,
                eventList[ channelIndex ]
            );
            updateHandler();
        },
        redo() {
            add();
        }
    };
}

/**
 * removes a single AUDIO_EVENT or multiple AUDIO_EVENTS within a selection
 * from a pattern
 */
function deleteSingleEventOrSelectionAction({ store }) {
    const song               = store.state.song.activeSong,
          eventList          = store.state.editor.eventList,
          activePattern      = store.state.sequencer.activePattern,
          selectedInstrument = store.state.editor.selectedInstrument,
          selectedStep       = store.state.editor.selectedStep,
          event              = song.patterns[activePattern].channels[selectedInstrument][selectedStep];

    // if a selection is set, store its state for redo purposes

    const selection            = store.getters.getSelection({ song, activePattern });
    const hadSelection         = selection.length > 0;
    const selectedFirstChannel = store.state.selection.firstSelectedChannel;
    const selectedLastChannel  = store.state.selection.lastSelectedChannel;
    const selectedMinStep      = store.state.selection.minSelectedStep;
    const selectedMaxStep      = store.state.selection.maxSelectedStep;

    function remove( optSelection ) {
        if ( hadSelection ) {
            // pass selection when redoing a delete action on a selection
            store.commit('deleteSelection', {
                song, activePattern, eventList,
                optSelectionContent: optSelection, optFirstSelectedChannel: selectedFirstChannel,
                optLastSelectedChannel: selectedLastChannel, optMinSelectedStep: selectedMinStep, optMaxSelectedStep: selectedMaxStep
            });
        }
        else {
            EventUtil.clearEvent(
                song,
                activePattern,
                selectedInstrument,
                selectedStep,
                eventList[ selectedInstrument ]
            );
        }
    }

    // delete the event(s)
    remove(selection);

    return {
        undo() {
            if ( hadSelection ) {

                store.commit('pasteSelection', {
                    song, eventList, activePattern, selectedInstrument, selectedStep, optSelectionContent: selection
                });
            }
            else {
                store.commit('addEventAtPosition', {
                    event,
                    store,
                    optData: {
                        patternIndex: activePattern,
                        channelIndex: selectedInstrument,
                        step: selectedStep
                    },
                    optStoreInUndoRedo: false // prevents storing in undo/redo again, kinda important!
                });
            }
        },
        redo() {
            remove(selection);
        }
    };
}

function deleteModuleAutomationAction({ event }) {
    const clonedAutomation = ObjectUtil.clone( event.mp );
    const remove = () => Vue.delete(event, 'mp');

    remove(); // perform action

    return {
        undo() {
            Vue.set(event, 'mp', clonedAutomation);
        },
        redo() {
            remove();
        }
    };
}

function clearPattern({ store }) {
    const song          = store.state.song.activeSong,
          patternIndex  = store.state.sequencer.activePattern,
          amountOfSteps = store.getters.amountOfSteps;

    const pattern = song.patterns[patternIndex];

    function remove() {
        store.commit('replacePattern', { patternIndex, pattern: PatternFactory.createEmptyPattern(amountOfSteps) });
        store.commit('createLinkedList', song);
    }
    remove(); // perform action

    return {
        undo() {
            store.commit('replacePattern', { patternIndex, pattern });
            store.commit('createLinkedList', song);
        },
        redo() {
            remove();
        }
    };
}

function pastePattern({ store, patternCopy }) {
    const song          = store.state.song.activeSong,
          patternIndex  = store.state.sequencer.activePattern;

    const targetPattern = song.patterns[patternIndex];
    const pastedPattern = PatternFactory.mergePatterns(targetPattern, patternCopy, patternIndex);

    function paste() {
        store.commit('replacePattern', { patternIndex, pattern: pastedPattern });
        store.commit('createLinkedList', song);
    }
    paste(); // perform action

    return {
        undo() {
            store.commit('replacePattern', { patternIndex, pattern: targetPattern });
            store.commit('createLinkedList', song);
        },
        redo() {
            paste();
        }
    };
}

function addPattern({ store }) {
    const song            = store.state.song.activeSong,
          patterns        = song.patterns,
          patternIndex    = store.state.sequencer.activePattern,
          amountOfSteps   = store.getters.amountOfSteps;

    const pattern = PatternFactory.createEmptyPattern(amountOfSteps);

    function add() {
        store.commit('replacePatterns', PatternUtil.addPatternAtIndex(patterns, patternIndex, amountOfSteps, pattern));
        store.commit('createLinkedList', song);
    }
    add(); // perform action

    return {
        undo() {
            store.commit('setActivePattern', patternIndex);
            store.commit('replacePatterns', PatternUtil.removePatternAtIndex(patterns, patternIndex + 1));
            store.commit('createLinkedList', song);
        },
        redo() {
            add();
        }
    };
}

function deletePattern({ store }) {
    const song            = store.state.song.activeSong,
          patterns        = song.patterns,
          patternIndex    = store.state.sequencer.activePattern,
          amountOfSteps   = store.getters.amountOfSteps,
          targetIndex     = patternIndex === (patterns.length - 1) ? patternIndex - 1 : patternIndex,
          pattern         = patterns[patternIndex];

    function deleteP() {
        store.commit('setActivePattern', targetIndex);
        store.commit('replacePatterns', PatternUtil.removePatternAtIndex(patterns, patternIndex));
        store.commit('createLinkedList', song);
    }
    deleteP(); // perform action

    return {
        undo() {
            store.commit('setActivePattern', targetIndex);
            store.commit('replacePatterns', PatternUtil.addPatternAtIndex(patterns, patternIndex, amountOfSteps, pattern));
            store.commit('createLinkedList', song);
        },
        redo() {
            deleteP();
        }
    };
}

function cutSelectionAction({ store }) {
    const song = store.state.song.activeSong;

    if ( !store.getters.hasSelection) {
        store.commit('setSelectionChannelRange', { firstChannel: store.state.editor.selectedInstrument });
        store.commit('setSelection', { selectionStart: store.state.editor.selectedStep });
    }
    const activePattern   = store.state.sequencer.activePattern;
    const firstChannel    = store.state.selection.firstSelectedChannel;
    const lastChannel     = store.state.selection.lastSelectedChannel;
    const selectedMinStep = store.state.selection.minSelectedStep;
    const selectedMaxStep = store.state.selection.maxSelectedStep;

    const originalPatternData = clonePattern(song, activePattern);
    let cutData;
    function cut() {
        if ( cutData ) {
            Vue.set(song.patterns, activePattern, cutData);
        }
        else {
            store.commit('cutSelection', { song, activePattern, eventList: store.state.editor.eventList });
            cutData = clonePattern(song, activePattern);
        }
        store.commit('clearSelection');
    }
    cut(); // perform action

    return {
        undo() {
            // set the original pattern data back
            Vue.set(song.patterns, activePattern, originalPatternData);

            // restore selection model to previous state
            store.commit('setMinSelectedStep', selectedMinStep);
            store.commit('setMaxSelectedStep', selectedMaxStep);
            store.commit('setSelectionChannelRange', { firstChannel, lastChannel });
        },
        redo() {
            cut();
        }
    };
}

function deleteSelectionAction({ store }) {
    const song = store.state.song.activeSong;

    const activePattern   = store.state.sequencer.activePattern;
    const firstChannel    = store.state.selection.firstSelectedChannel;
    const lastChannel     = store.state.selection.lastSelectedChannel;
    const selectedMinStep = store.state.selection.minSelectedStep;
    const selectedMaxStep = store.state.selection.maxSelectedStep;

    const originalPatternData = song.patterns[activePattern];
    let cutData;
    function deleteSelection() {
        if ( cutData ) {
            Vue.set(song.patterns, activePattern, cutData);
        } else {
            store.commit('deleteSelection', { song, activePattern, eventList: store.state.editor.eventList });
            cutData = song.patterns[activePattern];
        }
        store.commit('clearSelection');
    }
    deleteSelection(); // perform action

    return {
        undo() {
            // set the original pattern data back
            Vue.set(song.patterns, activePattern, originalPatternData);

            // restore selection model to previous state
            store.commit('setMinSelectedStep', selectedMinStep);
            store.commit('setMaxSelectedStep', selectedMaxStep);
            store.commit('setSelectionChannelRange', { firstChannel, lastChannel });
       },
        redo() {
            deleteSelection();
        }
    };
}

function pasteSelectionAction({ store }) {
    const song               = store.state.song.activeSong,
          eventList          = store.state.editor.eventList,
          activePattern      = store.state.sequencer.activePattern,
          selectedInstrument = store.state.editor.selectedInstrument,
          selectedStep       = store.state.editor.selectedStep;

    const originalPatternData = clonePattern(song, activePattern);

    const firstChannel    = store.state.selection.firstSelectedChannel;
    const lastChannel     = store.state.selection.lastSelectedChannel;
    const selectedMinStep = store.state.selection.minSelectedStep;
    const selectedMaxStep = store.state.selection.maxSelectedStep;

    let pastedData;

    function paste() {
        if ( pastedData ) {
            Vue.set(song.patterns, activePattern, pastedData);
        } else {
            store.commit('pasteSelection', { song, eventList, activePattern, selectedInstrument, selectedStep });
            pastedData = song.patterns[activePattern];
        }
    }
    paste(); // perform action

    return {
        undo() {
            // set the original pattern data back
            Vue.set(song.patterns, activePattern, originalPatternData);

            // we can safely override the existing selection of the model when undoing an existing paste
            // this means we are returning the model to the state prior to the pasting
            // restore selection model to previous state

            store.commit('setMinSelectedStep', selectedMinStep);
            store.commit('setMaxSelectedStep', selectedMaxStep);
            store.commit('setSelectionChannelRange', { firstChannel, lastChannel });
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
