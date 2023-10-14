/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2023 - https://www.igorski.nl
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
import Vue from "vue";
import type { Store, ActionContext } from "vuex";
import Config from "@/config";
import Actions from "@/definitions/actions";
import EventUtil from "@/utils/event-util";
import { clone } from "@/utils/object-util";
import PatternUtil from "@/utils/pattern-util";
import PatternOrderUtil from "@/utils/pattern-order-util";
import { ACTION_NOTE_OFF } from "@/model/types/audio-event";
import type { EffluxAudioEvent, EffluxAudioEventModuleParams } from "@/model/types/audio-event";
import type { EffluxChannel } from "@/model/types/channel";
import type { Instrument } from "@/model/types/instrument";
import type { EffluxPattern } from "@/model/types/pattern";
import type { EffluxPatternOrder } from "@/model/types/pattern-order";
import type { EffluxSong } from "@/model/types/song";
import { enqueueState } from "@/model/factories/history-state-factory";
import type { IUndoRedoState } from "@/model/factories/history-state-factory";
import AudioService, { connectAnalysers } from "@/services/audio-service";
import { Transpose } from "@/services/audio/pitch";
import type { EffluxState } from "@/store";
import PatternFactory from "./pattern-factory";

export default function( type: Actions, data: any ): IUndoRedoState | null {
    switch ( type ) {
        default:
            return null;

        case Actions.ADD_EVENT:
            return addSingleEventAction( data );

        case Actions.ADD_EVENTS:
            return addMultipleEventsAction( data );

        case Actions.DELETE_EVENT:
            return deleteSingleEventOrSelectionAction( data );

        case Actions.DELETE_SELECTION:
            return deleteSelectionAction( data );

        case Actions.ADD_MODULE_AUTOMATION:
            return addModuleAutomationAction( data );

        case Actions.DELETE_MODULE_AUTOMATION:
            return deleteModuleAutomationAction( data );

        case Actions.CLEAR_PATTERN:
            return clearPattern( data );

        case Actions.PASTE_PATTERN:
            return pastePattern( data );

        case Actions.PASTE_PATTERN_MULTIPLE:
            return pastePatternMultiple( data );

        case Actions.ADD_PATTERN:
            return addPattern( data );

        case Actions.DELETE_PATTERN:
            return deletePattern( data );

        case Actions.CUT_SELECTION:
            return cutSelectionAction( data );

        case Actions.PASTE_SELECTION:
            return pasteSelectionAction( data );

        case Actions.REPLACE_INSTRUMENT:
            replaceInstrumentAction( data );
            return null;

        case Actions.TRANSPOSE:
            return transpositionAction( data );

        case Actions.UPDATE_PATTERN_ORDER:
            updatePatternOrder( data );
            return null;
    }
}

/* internal methods */

/**
 * adds a single EffluxAudioEvent into a pattern
 */
function addSingleEventAction({ store, event, optEventData, updateHandler } :
    { store: Store<EffluxState>, event: EffluxAudioEvent, optEventData: any, updateHandler: ( advanceStep?: boolean ) => void }
): IUndoRedoState {
    const { state }   = store;
    const song        = state.song.activeSong,
          eventList   = state.editor.eventList;

    // active instrument and pattern for event (can be different to currently visible pattern
    // e.g. undo/redo action performed when viewing another pattern)

    let patternIndex = store.getters.activePatternIndex,
        channelIndex = state.editor.selectedInstrument,
        step         = state.editor.selectedStep;

    // currently active instrument and pattern (e.g. visible on screen)

    let advanceStepOnAddition = true;

    // if options Object was given, use those values instead of current sequencer values

    if ( optEventData ) {
        patternIndex = ( typeof optEventData.patternIndex === "number" ) ? optEventData.patternIndex : patternIndex;
        channelIndex = ( typeof optEventData.channelIndex === "number" ) ? optEventData.channelIndex : channelIndex;
        step         = ( typeof optEventData.step         === "number" ) ? optEventData.step         : step;

        if ( typeof optEventData.advanceOnAddition === "boolean" ) {
            advanceStepOnAddition = optEventData.advanceOnAddition;
        }
    }
    // if there is an existing event, cache it for undo-purpose (see add())
    let existingEvent: EffluxAudioEvent;
    let existingEventMp: EffluxAudioEventModuleParams;

    function act(): void {
        const pattern = song.patterns[ patternIndex ],
              channel = pattern.channels[ channelIndex ];

        EventUtil.setPosition( event, pattern, patternIndex, step, song.meta.tempo );

        // remove previous event if one existed at the insertion point
        // (but take its module parameter automation when existing for non-off events)

        if ( channel[ step ]) {
            existingEvent   = serialize( channel[ step ]);
            existingEventMp = serialize( channel[ step ].mp );

            if ( event.action !== ACTION_NOTE_OFF && !event.mp && existingEventMp ) {
                Vue.set( event, "mp", deserialize( existingEventMp ));
            }
            EventUtil.clearEvent( song, patternIndex, channelIndex, step, eventList[ patternIndex ]);
        }
        Vue.set( channel, step, event );

        // update linked list for AudioEvents
        EventUtil.linkEvent( event, channelIndex, song, eventList );

        if ( optEventData?.newEvent === true ) {

            // new events by default take the instrument of the previously declared note in
            // the current patterns event channel

            const node = eventList[ channelIndex ].getNodeByData( event );
            let prevNode = ( node ) ? node.previous : null;

            // but don't take a noteOff instruction into account (as it is not assigned to an instrument)
            // keep on traversing backwards until we find a valid event

            while ( prevNode && prevNode.data.action === ACTION_NOTE_OFF ) {
                prevNode = prevNode.previous;
            }

            // only do this for events within the same measure though

            if ( prevNode && prevNode.data.seq.startMeasure === event.seq.startMeasure &&
                 prevNode.data.instrument !== channelIndex &&
                 event.instrument === channelIndex ) {

                event.instrument = prevNode.data.instrument;
            }
        }
        updateHandler( advanceStepOnAddition );
        advanceStepOnAddition = false;
    }
    act(); // perform action

    return {
        undo(): void {
            EventUtil.clearEvent(
                song,
                patternIndex,
                channelIndex,
                step,
                eventList[ channelIndex ]
            );
            // restore existing event if it was present during addition
            if ( existingEvent ) {
                const restoredEvent = deserialize( existingEvent );
                Vue.set( song.patterns[ patternIndex ].channels[ channelIndex ], step, restoredEvent );
                EventUtil.linkEvent( restoredEvent, channelIndex, song, eventList );
            }
            updateHandler();
        },
        redo: act
    };
}

/**
 * adds multiple EffluxAudioEvent into a pattern
 */
function addMultipleEventsAction({ store, events } : { store: Store<EffluxState>, events: EffluxAudioEvent[] }): IUndoRedoState {

    const { state }   = store;
    const song        = state.song.activeSong,
          eventList   = state.editor.eventList;

    // active instrument and pattern for event (can be different to currently visible pattern
    // e.g. undo/redo action performed when viewing another pattern)

    let patternIndex = store.getters.activePatternIndex,
        channelIndex = state.editor.selectedInstrument,
        step         = state.editor.selectedStep;

    // if there are existing events, cache them for undo-purpose (see add())

    const existingEvents: EffluxAudioEvent[] = [];
    function act(): void {
        const pattern = song.patterns[ patternIndex ];

        events.forEach(( event: EffluxAudioEvent, index: number ) => {
            const targetIndex = ( channelIndex + index ) % Config.INSTRUMENT_AMOUNT;
            const channel = pattern.channels[ targetIndex ];

            EventUtil.setPosition( event, pattern, patternIndex, step, song.meta.tempo );

            // remove previous event if one existed at the insertion point
            // (but take its module parameter automation when existing for non-off events)

            if ( channel[ step ]) {
                existingEvents[ index ] = serialize( channel[ step ]);

                if ( event.action !== ACTION_NOTE_OFF && !event.mp && channel[ step ].mp ) {
                    Vue.set( event, "mp", clone( channel[ step ].mp ));
                }
                EventUtil.clearEvent( song, patternIndex, targetIndex, step, eventList[ patternIndex ]);
            }
            Vue.set( channel, step, event );

            // update linked list for AudioEvents
            EventUtil.linkEvent( event, targetIndex, song, eventList );
        });
    }
    act(); // perform action

    return {
        undo(): void {
            // @ts-expect-error event is declared but never read
            events.forEach(( event: EffluxAudioEvent, index: number ) => {
                const targetIndex = ( channelIndex + index ) % Config.INSTRUMENT_AMOUNT;
                EventUtil.clearEvent(
                    song,
                    patternIndex,
                    targetIndex,
                    step,
                    eventList[ targetIndex ]
                );
                // restore existing event if it was present during addition
                const existingEvent: EffluxAudioEvent = existingEvents[ index ];
                if ( existingEvent ) {
                    const restoredEvent = deserialize( existingEvent );
                    Vue.set( song.patterns[ patternIndex ].channels[ targetIndex ], step, restoredEvent );
                    EventUtil.linkEvent( restoredEvent, targetIndex, song, eventList );
                }
            });
        },
        redo: act
    };
}

/**
 * removes a single EffluxAudioEvent or multiple EffluxAudioEvents within a selection
 * from a pattern
 */
function deleteSingleEventOrSelectionAction({ store } : { store: Store<EffluxState> }): IUndoRedoState {
    const song               = store.state.song.activeSong,
          eventList          = store.state.editor.eventList,
          activePattern      = store.getters.activePatternIndex,
          selectedInstrument = store.state.editor.selectedInstrument,
          selectedStep       = store.state.editor.selectedStep,
          event              = song.patterns[ activePattern ].channels[ selectedInstrument ][ selectedStep ];

    // if a selection is set, store its state for redo purposes

    const selection            = store.getters.getSelection({ song, activePattern });
    const hadSelection         = selection.length > 0;
    const selectedFirstChannel = store.state.selection.firstSelectedChannel;
    const selectedLastChannel  = store.state.selection.lastSelectedChannel;
    const selectedMinStep      = store.state.selection.minSelectedStep;
    const selectedMaxStep      = store.state.selection.maxSelectedStep;

    const { commit } = store;

    function act( optSelection: any[] ): void {
        if ( hadSelection ) {
            // pass selection when redoing a delete action on a selection
            commit( "deleteSelection", {
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
    act( selection );

    return {
        undo(): void {
            if ( hadSelection ) {
                commit( "pasteSelection", {
                    song, eventList, activePattern, selectedInstrument, selectedStep, optSelectionContent: selection
                });
            }
            else {
                commit( "addEventAtPosition", {
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
            act( selection );
        }
    };
}

function addModuleAutomationAction({ event, mp }: { event: EffluxAudioEvent, mp: EffluxAudioEventModuleParams }): IUndoRedoState {
    const automationData     = serialize( mp );
    const existingAutomation = serialize( event.mp );
    const act = () => Vue.set( event, "mp", deserialize( automationData ));

    act(); // perform action

    return {
        undo(): void {
            if ( existingAutomation ) {
                Vue.set( event, "mp", deserialize( existingAutomation ));
            } else {
                Vue.delete( event, "mp" );
            }
        },
        redo: act
    }
}

function deleteModuleAutomationAction({ event }: { event: EffluxAudioEvent }): IUndoRedoState {
    const existingAutomation = serialize( event.mp );
    const act = () => Vue.delete( event, "mp" );

    act(); // perform action

    return {
        undo(): void {
            Vue.set( event, "mp", deserialize( existingAutomation ));
        },
        redo: act
    };
}

function clearPattern({ store }: { store: Store<EffluxState> }): IUndoRedoState {
    const song          = store.state.song.activeSong,
          patternIndex  = store.getters.activePatternIndex,
          amountOfSteps = store.getters.amountOfSteps;

    const { commit } = store;
    const pattern = clonePattern( song, patternIndex );

    function act(): void {
        commit( "replacePattern", { patternIndex, pattern: PatternFactory.create( amountOfSteps ) });
    }
    act(); // perform action

    return {
        undo(): void {
            commit( "replacePattern", { patternIndex, pattern });
        },
        redo: act
    };
}

function pastePattern({ store, patternCopy }: { store: Store<EffluxState>, patternCopy: EffluxPattern }): IUndoRedoState {
    const song         = store.state.song.activeSong,
          patternIndex = store.getters.activePatternIndex;

    const { getters, commit } = store;

    const targetPattern = clonePattern( song, patternIndex );
    const pastedPattern = PatternFactory.mergePatterns( targetPattern, patternCopy, patternIndex );

    function act(): void {
        commit( "replacePattern", { patternIndex, pattern: pastedPattern });
        commit( "createLinkedList", getters.activeSong );
    }
    act(); // perform action

    return {
        undo(): void {
            commit( "replacePattern", { patternIndex, pattern: targetPattern });
            commit( "createLinkedList", getters.activeSong );
        },
        redo: act
    };
}

function pastePatternMultiple({ store, patterns, insertIndex } :
    { store: ActionContext<EffluxState, any>, patterns: EffluxPattern[], insertIndex: number }): IUndoRedoState {
    const { getters, commit, dispatch, rootState } = store;
    const songPatterns = getters.activeSong.patterns;

    if ( insertIndex === -1 ) {
         // if no index was specified, insert after current position
        insertIndex = store.getters.activePatternIndex;
    }

    // splice the pattern list at the insertion point, head will contain
    // the front of the list, tail the end of the list, and inserted will contain the cloned content

    const patternsHead = clone( songPatterns );
    const patternsTail = patternsHead.splice( insertIndex );

    function linkLists() {
        // update event offsets to match insert position
        const activeSongPatterns = getters.activeSong.patterns;
        for ( let patternIndex = insertIndex, l = activeSongPatterns.length; patternIndex < l; ++patternIndex ) {
            activeSongPatterns[ patternIndex ].channels.forEach(( channel: EffluxChannel ) => {
                channel.forEach(( event: EffluxAudioEvent ) => {
                    if ( event?.seq ) {
                        const eventStart  = event.seq.startMeasure;
                        const eventEnd    = event.seq.endMeasure;
                        const eventLength = isNaN( eventEnd ) ? 1 : eventEnd - eventStart;

                        event.seq.startMeasure = patternIndex;
                        event.seq.endMeasure   = event.seq.startMeasure + eventLength;
                    }
                });
            });
        }
        commit( "createLinkedList", getters.activeSong );
    }

    function act(): void {
        commit( "replacePatterns", clone( patternsHead.concat( patterns, patternsTail )));
        linkLists();
    }
    act(); // perform action

    return {
        undo(): void {
            commit( "replacePatterns", patternsHead.concat( patternsTail ));
            if ( getters.activeSong.order.length <= store.state.sequencer.activeOrderIndex ) {
                dispatch( "gotoPattern", getters.activeSong.order.length - 1 );
            }
            linkLists();
        },
        redo: act
    };
}

function addPattern({ store, patternIndex }: { store: Store<EffluxState>, patternIndex?: number }): IUndoRedoState {
    const song          = store.state.song.activeSong,
          orderIndex    = store.state.sequencer.activeOrderIndex,
          existingPatternIndex = store.getters.activePatternIndex,
          amountOfSteps = store.getters.amountOfSteps;

    if ( typeof patternIndex !== "number" ) {
        patternIndex = existingPatternIndex + 1;
    }

    const existingOrder = [ ...song.order ];
    const newOrder = existingOrder.map( index => {
        // all remaining patterns have shifted up by one
        return index > existingPatternIndex! ? index + 1 : index;
    });
    newOrder.push( patternIndex ); // add new pattern at end of order list

    const { commit, dispatch } = store;

    // note we don't cache song.patterns but always reference it from the song as the
    // patterns list is effectively replaced by below actions

    function act(): void {
        const pattern = PatternFactory.create( amountOfSteps );
        commit( "replacePatterns", PatternUtil.addPatternAtIndex( song.patterns, patternIndex!, amountOfSteps, pattern ));
        commit( "replacePatternOrder", newOrder );
        commit( "setActiveOrderIndex", newOrder.lastIndexOf( patternIndex ));
        commit( "setActivePatternIndex", patternIndex );
    }
    act(); // perform action

    return {
        undo(): void {
            commit( "replacePatterns", PatternUtil.removePatternAtIndex( song.patterns, patternIndex! ));
            commit( "replacePatternOrder", existingOrder );
            commit( "setActiveOrderIndex", orderIndex );
            commit( "setActivePatternIndex", existingPatternIndex );
        },
        redo: act
    };
}

function deletePattern({ store, patternIndex }: { store: Store<EffluxState>, patternIndex?: number }): IUndoRedoState {
    const song            = store.state.song.activeSong,
          patterns        = song.patterns,
          amountOfSteps   = store.getters.amountOfSteps;

    if ( typeof patternIndex !== "number" ) {
        patternIndex = store.state.sequencer.activePatternIndex;
    }
    const targetIndex = patternIndex === ( song.patterns.length - 1 ) ? patternIndex - 1 : patternIndex;

    const { commit, dispatch } = store;
    const existingPattern = clonePattern( song, patternIndex! );
    const existingOrder = [ ...song.order ];

    function act(): void {
        commit( "replacePatterns", PatternUtil.removePatternAtIndex( patterns, patternIndex ));
        commit( "replacePatternOrder", PatternOrderUtil.removeAllPatternInstances( existingOrder, patternIndex ).map( index => {
            // all remaining patterns have shifted down by one
            return ( index > patternIndex! ) ? index - 1 : index;
        }));
        commit( "setActivePatternIndex", targetIndex );
    //    dispatch( "gotoPattern", targetIndex );
    }
    act(); // perform action

    return {
        undo(): void {
            commit( "replacePatterns", PatternUtil.addPatternAtIndex( patterns, patternIndex, amountOfSteps, existingPattern ));
            commit( "replacePatternOrder", existingOrder );
            commit( "setActivePatternIndex", patternIndex );
          //  dispatch( "gotoPattern", orderIndex );
        },
        redo: act
    };
}

function cutSelectionAction({ store }: { store: Store<EffluxState> }): IUndoRedoState {
    const song = store.state.song.activeSong;
    const { selection, editor } = store.state;
    const { commit } = store;

    if ( !store.getters.hasSelection) {
        commit( "setSelectionChannelRange", { firstChannel: editor.selectedInstrument });
        commit( "setSelection", { selectionStart: editor.selectedStep });
    }
    const activePattern   = store.getters.activePatternIndex;
    const firstChannel    = selection.firstSelectedChannel;
    const lastChannel     = selection.lastSelectedChannel;
    const selectedMinStep = selection.minSelectedStep;
    const selectedMaxStep = selection.maxSelectedStep;

    const originalPattern = clonePattern( song, activePattern );
    let cutPattern: EffluxPattern;
    function act(): void {
        if ( cutPattern ) {
            Vue.set( song.patterns, activePattern, cutPattern );
        }
        else {
            commit( "cutSelection", { song, activePattern, eventList: editor.eventList });
            cutPattern = clonePattern( song, activePattern );
        }
        commit( "clearSelection" );
    }
    act(); // perform action

    return {
        undo(): void {
            // set the original pattern data back
            Vue.set( song.patterns, activePattern, originalPattern );

            // restore selection model to previous state
            commit( "setMinSelectedStep", selectedMinStep);
            commit( "setMaxSelectedStep", selectedMaxStep);
            commit( "setSelectionChannelRange", { firstChannel, lastChannel });
        },
        redo: act
    };
}

function deleteSelectionAction({ store }: { store: Store<EffluxState> }): IUndoRedoState {
    const song = store.state.song.activeSong;
    const { selection, editor } = store.state;
    const { commit }    = store;

    const activePattern   = store.getters.activePatternIndex;
    const firstChannel    = selection.firstSelectedChannel;
    const lastChannel     = selection.lastSelectedChannel;
    const selectedMinStep = selection.minSelectedStep;
    const selectedMaxStep = selection.maxSelectedStep;

    const originalPattern = clonePattern( song, activePattern );
    let cutPattern: EffluxPattern;
    function act(): void {
        if ( cutPattern ) {
            Vue.set( song.patterns, activePattern, cutPattern );
        } else {
            commit( "deleteSelection", { song, activePattern, eventList: editor.eventList });
            cutPattern = clonePattern( song, activePattern );
        }
        commit( "clearSelection" );
    }
    act(); // perform action

    return {
        undo(): void {
            // set the original pattern data back
            Vue.set( song.patterns, activePattern, originalPattern );

            // restore selection model to previous state
            commit( "setMinSelectedStep", selectedMinStep);
            commit( "setMaxSelectedStep", selectedMaxStep);
            commit( "setSelectionChannelRange", { firstChannel, lastChannel });
       },
       redo: act
    };
}

function pasteSelectionAction({ store }: { store: Store<EffluxState> }): IUndoRedoState {
    const song = store.state.song.activeSong;
    const { eventList, selectedInstrument, selectedStep } = store.state.editor;
    const activePattern = store.getters.activePatternIndex;
    const { selection } = store.state;
    const { commit } = store;

    const originalPattern = clonePattern( song, activePattern );

    const firstChannel    = selection.firstSelectedChannel;
    const lastChannel     = selection.lastSelectedChannel;
    const selectedMinStep = selection.minSelectedStep;
    const selectedMaxStep = selection.maxSelectedStep;

    let pastedPattern: EffluxPattern;
    function act(): void {
        if ( pastedPattern ) {
            Vue.set( song.patterns, activePattern, pastedPattern );
        } else {
            commit( "pasteSelection", { song, eventList, activePattern, selectedInstrument, selectedStep });
            pastedPattern = clonePattern( song, activePattern );
        }
    }
    act(); // perform action

    return {
        undo(): void {
            // set the original pattern data back
            Vue.set( song.patterns, activePattern, originalPattern );

            // we can safely override the existing selection of the model when undoing an existing paste
            // this means we are returning the model to the state prior to the pasting
            // restore selection model to previous state

            commit( "setMinSelectedStep", selectedMinStep );
            commit( "setMaxSelectedStep", selectedMaxStep );
            commit( "setSelectionChannelRange", { firstChannel, lastChannel });
        },
        redo: act
    };
}

function replaceInstrumentAction({ store, instrument }: { store: ActionContext<EffluxState, any>, instrument: Instrument }): void {
    const instrumentIndex    = ( store.rootState || store.state ).editor.selectedInstrument;
    const existingInstrument = clone( store.getters.activeSong.instruments[ instrumentIndex ]) as Instrument;
    instrument.index = instrumentIndex;

    const applyUpdate = ( instrument: Instrument ): void => {
        store.commit( "setSelectedOscillatorIndex", 0 );
        AudioService.cacheAllOscillators( instrumentIndex, instrument );
        AudioService.applyModules( store.getters.activeSong, connectAnalysers() );
    };
    const commit = (): void => {
        store.commit( "replaceInstrument", { instrumentIndex, instrument });
        applyUpdate( instrument );
    };
    commit();
    enqueueState( `preset_${instrumentIndex}`, {
        undo(): void {
            store.commit( "replaceInstrument", { instrumentIndex, instrument: existingInstrument });
            applyUpdate( existingInstrument );
        },
        redo: commit,
    });
}

function transpositionAction({ store, semitones, firstPattern, lastPattern, firstChannel, lastChannel } :
{ store: Store<EffluxState>, semitones: number, firstPattern: number, lastPattern: number, firstChannel: number, lastChannel: number }): IUndoRedoState {
    const { getters, commit } = store;
    const songPatterns = getters.activeSong.patterns;

    const transposedPatterns = clone( songPatterns );

    let p = firstPattern;
    do {
        const channels = transposedPatterns[ p ].channels;
        let c = firstChannel;
        do {
            channels[ c ].forEach(( event: EffluxAudioEvent ) => {
                if ( !event ) {
                    return;
                }
                const { note, octave } = Transpose( event.note, event.octave, semitones );
                event.note = note;
                event.octave = octave;
            })
            ++c;
        } while ( c <= lastChannel );
        ++p;
    } while ( p <= lastPattern );

    function act(): void {
        commit( "replacePatterns", transposedPatterns );
    }
    act(); // perform action

    return {
        undo(): void {
            commit( "replacePatterns", songPatterns );
        },
        redo: act
    };
}

function updatePatternOrder({ store, order }: { store: ActionContext<EffluxState, any>, order: EffluxPatternOrder }): void {
    const existingValue = [ ...store.getters.activeSong.order ];

    const act = (): void => store.commit( "replacePatternOrder", order );
    act();

    enqueueState( "songOrder", {
        undo(): void {
            store.commit( "replacePatternOrder", existingValue );
        },
        redo(): void {
            act();
        },
    });
}

// when changing states of observables, we need to take heed to always restore
// a fresh clone from the last state as repeated undo/redo actions on (a cloned)
// object reference will mutate the reference to be different from its initial state

function serialize( object: any = null ): any {
    return object ? JSON.stringify( object ) : null;
}

function deserialize( serializedObject: any = null ): any {
    return serializedObject ? JSON.parse( serializedObject ) : null;
}

/**
 * convenience method to clone all event and channel data for given pattern
 * this also resets each events play state to ensure seamless playback when
 * performing und/redo actions during playback
 */
function clonePattern( song: EffluxSong, activePatternIndex: number ): EffluxPattern {
    const clonedPattern = clone( song.patterns[ activePatternIndex ]);
    clonedPattern.channels.forEach(( channel: EffluxChannel ) => {
        channel.forEach(( event: EffluxAudioEvent ) => {
            if ( event?.seq?.playing ) {
                event.seq.playing = false;
            }
        });
    });
    return clonedPattern;
}
