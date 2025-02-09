import { describe, it, expect, beforeEach, vi } from "vitest";
// @ts-expect-error no type definitions for undo-manager
import UndoManager from "undo-manager";
import type { EffluxState } from "@/store";
import store, { createHistoryState } from "@/store/modules/history-module";
import type { HistoryState } from "@/store/modules/history-module";

const { getters, mutations, actions }  = store;

describe( "Vuex history state module", () => {
    const noop = () => {}, AMOUNT_OF_STATES = 5;
    let commit = vi.fn();
    let state: HistoryState;

    const createState = ( props?: Partial<HistoryState> ): HistoryState => {
        return createHistoryState({ undoManager: new UndoManager(), ...props });
    };
    const mockRootState: EffluxState = {} as EffluxState;
    const mockRootGetters: any = {};

    beforeEach( () => {
        state = createState();
        state.undoManager.setLimit( AMOUNT_OF_STATES );
    });

    describe( "getters", () => {
        it( "should know when it can undo an action", async () => {
            expect(
                getters.canUndo( state, { canUndo: state.undoManager.hasUndo() }, mockRootState, mockRootGetters )
            ).toBe( false ); // expected no undo to be available after construction

            mutations.saveState( state, { undo: noop, redo: noop });
            expect(
                getters.canUndo( state, { canUndo: state.undoManager.hasUndo() }, mockRootState, mockRootGetters )
            ).toBe( true ); // expected undo to be available after addition of action

            // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
            await actions.undo({ state, commit, getters: { canUndo: state.undoManager.hasUndo() }});
            expect(
                getters.canUndo( state, { canUndo: state.undoManager.hasUndo() }, mockRootState, mockRootGetters )
            ).toBe( false ); // expected no undo to be available after having undone all actions
        });

        it( "should know when it can redo an action", async () => {
            expect(
                getters.canRedo( state, {}, mockRootState, mockRootGetters )
            ).toBe( false ); // expected no redo to be available after construction

            mutations.saveState( state, { undo: noop, redo: noop });
            expect(
                getters.canRedo( state, {}, mockRootState, mockRootGetters )
            ).toBe( false ); // expected no redo to be available after addition of action

            // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
            await actions.undo({ state, commit, getters: { canUndo: state.undoManager.hasUndo() }});
            expect(
                getters.canRedo( state, {}, mockRootState, mockRootGetters )
            ).toBe( true ); // expected redo to be available after having undone actions

            // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
            await actions.redo({ state, commit, getters: { canRedo: state.undoManager.hasRedo() }});
            expect(
                getters.canRedo( state, {}, mockRootState, mockRootGetters )
            ).toBe( false ); // expected no redo to be available after having redone all actions
        });

        it( "should know the amount of states it has stored", async () => {
            // @ts-expect-error action is defined but its value never read
            commit = ( action: string, value: number ) => state.historyIndex = value;
            expect(
                getters.amountOfStates( state, {}, mockRootState, mockRootGetters )
            ).toEqual( 0 ); // expected no states to be present after construction

            for ( let i = 0; i < AMOUNT_OF_STATES; ++i ) {
                mutations.saveState( state, { undo: noop, redo: noop });
                expect(
                    getters.amountOfStates( state, {}, mockRootState, mockRootGetters )
                ).toEqual( i + 1 ); // expected amount of states to increase when storing new states
            }

            for ( let i = AMOUNT_OF_STATES - 1; i >= 0; --i ) {
                // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
                await actions.undo({ state, commit, getters: { canUndo: state.undoManager.hasUndo() }});
                expect(
                    getters.amountOfStates( state, {}, mockRootState, mockRootGetters )
                ).toEqual( i ); // expected amount of states to decrease when performing undo
            }

            for ( let i = 0; i < AMOUNT_OF_STATES; ++i ) {
                // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
                await actions.redo({ state, commit, getters: { canRedo: state.undoManager.hasRedo() }});
                expect(
                    getters.amountOfStates( state, {}, mockRootState, mockRootGetters )
                ).toEqual( i + 1 ); // expected amount of states to increase when performing redo
            }
        });

        it( "should be able to return the total amount of saved states", () => {
            const state = createState({ totalSaved: 10 });
            expect( getters.totalSaved( state, {}, mockRootState, mockRootGetters )).toEqual( state.totalSaved );
        });
    });

    describe( "mutations", () => {
        it( "should be able to store a state and increment the history index and total saved index", () => {
            mutations.saveState( state, { undo: noop, redo: noop });

            expect( state.historyIndex ).toEqual( 0 );
            expect( state.totalSaved ).toEqual( 1 );

            mutations.saveState( state, { undo: noop, redo: noop });

            expect( state.historyIndex ).toEqual( 1 );
            expect( state.totalSaved ).toEqual( 2 );
        });

        it( "should not store more states than are allowed but allow incrementing the total saved beyond the available hsitory size", () => {
            const AMOUNT_TO_ADD = AMOUNT_OF_STATES * 2;
            for ( let i = 0; i < AMOUNT_TO_ADD; ++i ) {
                mutations.saveState( state, { undo: noop, redo: noop });
            }
            // expected model to not have recorded more states than the defined maximum...
            expect( getters.amountOfStates( state, {}, mockRootState, mockRootGetters )).toEqual( AMOUNT_OF_STATES );
            // ...but the total amount saved to have incremented
            expect( state.totalSaved ).toEqual( AMOUNT_TO_ADD );
        });

        it( "should be able to set the history index", () => {
            mutations.setHistoryIndex( state, 2 );
            expect( state.historyIndex ).toEqual( 2 );
        });

        it( "should be able to clear its history", () => {
            function shouldntRun() {
                throw new Error( "undo/redo callback should not have fired after clearing the undo history" );
            }
            mutations.saveState( state, { undo: shouldntRun, redo: shouldntRun });
            mutations.saveState( state, { undo: shouldntRun, redo: shouldntRun });

            mutations.resetHistory( state );

            expect( state.historyIndex).toEqual( -1 );

            // expected no undo to be available after flushing of history
            expect( getters.canUndo( state, {}, mockRootState, mockRootGetters )).toBe( false );
            // expected no redo to be available after flushing of history
            expect( getters.canRedo( state, {}, mockRootState, mockRootGetters )).toBe( false );
            // expected no states to be present in history
            expect( 0 ).toEqual( getters.amountOfStates( state, {}, mockRootState, mockRootGetters ));
            // expected the total amount saved to have reset
            expect( 0 ).toEqual( state.totalSaved );
        });
    });

    describe( "actions", () => {
        it( "should be able to redo an action", async () => {
            commit = vi.fn();
            const redo = vi.fn();
            mutations.saveState( state, { undo: noop, redo: redo });

            // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
            await actions.undo({ state, commit, getters: { canUndo: state.undoManager.hasUndo() }});
            expect( commit ).toHaveBeenNthCalledWith(1, "setHistoryIndex", -1);

            // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
            await actions.redo({ state, commit, getters: { canRedo: state.undoManager.hasRedo() }});

            expect( redo ).toHaveBeenCalled();
            expect( commit ).toHaveBeenNthCalledWith(2, "setHistoryIndex", 0);
        });

        it( "should be able to undo an action when an action was stored in its state history", async () => {
            const undo = vi.fn();
            mutations.saveState( state, { undo: undo, redo: noop });

            // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
            await actions.undo({ state, commit, getters: { canUndo: state.undoManager.hasUndo() }});

            expect( undo ).toHaveBeenCalled();
            expect( state.historyIndex).toEqual(0);
        });
    });
});
