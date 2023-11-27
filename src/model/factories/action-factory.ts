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
import { ACTION_NOTE_ON, ACTION_NOTE_OFF } from "@/model/types/audio-event";
import { type EffluxAudioEvent, EffluxAudioEventModuleParams } from "@/model/types/audio-event";
import type { Instrument } from "@/model/types/instrument";
import type { EffluxPattern } from "@/model/types/pattern";
import type { EffluxPatternOrder } from "@/model/types/pattern-order";
import { enqueueState } from "@/model/factories/history-state-factory";
import type { IUndoRedoState } from "@/model/factories/history-state-factory";
import AudioService, { connectAnalysers } from "@/services/audio-service";
import { Transpose } from "@/services/audio/pitch";
import type { EffluxState } from "@/store";
import { clonePattern } from "@/utils/pattern-util";

export default function( type: Actions, data: any ): IUndoRedoState | null {
    switch ( type ) {
        default:
            return null;

        case Actions.ADD_EVENTS:
            return addMultipleEventsAction( data );

        case Actions.DELETE_SELECTION:
            return deleteSelectionAction( data );

        case Actions.ADD_MODULE_AUTOMATION:
            return addModuleAutomationAction( data );

        case Actions.DELETE_MODULE_AUTOMATION:
            return deleteModuleAutomationAction( data );

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
 * adds multiple EffluxAudioEvent into a pattern
 */
function addMultipleEventsAction({ store, events } : { store: Store<EffluxState>, events: EffluxAudioEvent[] }): IUndoRedoState {

    const { state } = store;
    const song      = state.song.activeSong;

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

            EventUtil.setPosition( event, pattern, step, song.meta.tempo );

            // remove previous event if one existed at the insertion point
            // (but take its module parameter automation when existing for non-off events)

            if ( channel[ step ]) {
                existingEvents[ index ] = serialize( channel[ step ]);
                const stepEntry = channel[ step ] as EffluxAudioEvent;

                if ( event.action !== ACTION_NOTE_OFF && !event.mp && stepEntry.mp ) {
                    Vue.set( event, "mp", clone( stepEntry.mp ));
                }
                EventUtil.clearEvent( song, patternIndex, targetIndex, step );
            }
            Vue.set( channel, step, event );
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
                );
                // restore existing event if it was present during addition
                const existingEvent: EffluxAudioEvent = existingEvents[ index ];
                if ( existingEvent ) {
                    const restoredEvent = deserialize( existingEvent );
                    Vue.set( song.patterns[ patternIndex ].channels[ targetIndex ], step, restoredEvent );
                }
            });
        },
        redo: act
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
            commit( "cutSelection", { song, activePattern });
            cutPattern = clonePattern( song, activePattern );
        }
        commit( "clearSelection" );
        commit( "invalidateChannelCache", { song });
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
            commit( "invalidateChannelCache", { song });
        },
        redo: act
    };
}

function deleteSelectionAction({ store }: { store: Store<EffluxState> }): IUndoRedoState {
    const song = store.state.song.activeSong;
    const { selection } = store.state;
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
            commit( "deleteSelection", { song, activePattern });
            cutPattern = clonePattern( song, activePattern );
        }
        commit( "clearSelection" );
        commit( "invalidateChannelCache", { song });
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
            commit( "invalidateChannelCache", { song });
       },
       redo: act
    };
}

function pasteSelectionAction({ store }: { store: Store<EffluxState> }): IUndoRedoState {
    const song = store.state.song.activeSong;
    const { selectedInstrument, selectedStep } = store.state.editor;
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
            commit( "pasteSelection", { song, activePattern, selectedInstrument, selectedStep });
            pastedPattern = clonePattern( song, activePattern );
        }
        commit( "invalidateChannelCache", { song });
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
            commit( "invalidateChannelCache", { song });
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
                if ( !event || event.action !== ACTION_NOTE_ON ) {
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
        commit( "invalidateChannelCache", { song: getters.activeSong });
    }
    act(); // perform action

    return {
        undo(): void {
            commit( "replacePatterns", songPatterns );
            commit( "invalidateChannelCache", { song: getters.activeSong });
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
