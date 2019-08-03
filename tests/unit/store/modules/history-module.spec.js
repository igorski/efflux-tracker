import UndoManager from 'undo-manager';
import store from '@/store/modules/history-module';
const { getters, mutations, actions }  = store;

describe( 'History State module', () => {
    const noop = () => {}, MIN_STATES = 5;
    let amountOfStates, state;

    beforeEach( () => {
        state = { undoManager: new UndoManager() };
        amountOfStates = Math.round( Math.random() * 100 ) + MIN_STATES;
        state.undoManager.setLimit(amountOfStates);
    });

    /* actual unit tests */

    it('should not store a state that does not supply undo/redo functions', () => {
        expect(() => mutations.saveState(state, {})).toThrowError( /cannot store a state without specifying valid undo and redo actions/ );
        mutations.saveState(state, { undo: noop, redo: noop }); // should not throw
    });

    it('should be able to undo an action when an action was stored in its state history', () => {
        const undo = jest.fn();
        mutations.saveState(state, { undo: undo, redo: noop });
        return actions.undo({ state, getters: { canUndo: state.undoManager.hasUndo() }}).then(() => {
            expect(undo).toHaveBeenCalled();
        });
    });

    it('should be able to redo an action', () => {
        const redo = jest.fn();
        mutations.saveState(state, { undo: noop, redo: redo });
        return actions.undo({ state, getters: { canUndo: state.undoManager.hasUndo() }}).then(() => {
            actions.redo(state).then(() => {
                expect(redo).toHaveBeenCalled();
            });
        });
    });

    it('should know when it can undo an action', async () => {
        expect(getters.canUndo(state, { canUndo: state.undoManager.hasUndo() })).toBe(false); // expected no undo to be available after construction
        mutations.saveState(state, { undo: noop, redo: noop });
        expect(getters.canUndo(state, { canUndo: state.undoManager.hasUndo() })).toBe(true); // expected undo to be available after addition of action
        await actions.undo({ state, getters: { canUndo: state.undoManager.hasUndo() }});
        expect(getters.canUndo(state, { canUndo: state.undoManager.hasUndo() })).toBe(false); // expected no undo to be available after having undone all actions
    });

    it('should know when it can redo an action', async () => {
        expect(getters.canRedo(state)).toBe(false); // expected no redo to be available after construction
        mutations.saveState(state, { undo: noop, redo: noop });
        expect(getters.canRedo(state)).toBe(false); // expected no redo to be available after addition of action
        await actions.undo({ state, getters: { canUndo: state.undoManager.hasUndo() }});
        expect(getters.canRedo(state)).toBe(true); // expected redo to be available after having undone actions
        await actions.redo({ state, getters: { canRedo: state.undoManager.hasRedo() }});
        expect(getters.canRedo(state)).toBe(false); // expected no redo to be available after having redone all actions
    });

    it('should know the amount of states it has stored', async () => {
        expect(0).toEqual(getters.amountOfStates(state)); // expected no states to be present after construction

        for ( let i = 0; i < MIN_STATES; ++i ) {
            mutations.saveState(state, { undo: noop, redo: noop });
            expect(( i + 1 )).toEqual(getters.amountOfStates(state)); // expected amount of states to increase when storing new states
        }

        for ( let i = MIN_STATES - 1; i >= 0; --i ) {
            await actions.undo({ state, getters: { canUndo: state.undoManager.hasUndo() }});
            expect(i).toEqual(getters.amountOfStates(state)); // expected amount of states to decrease when performing undo
        }

        for ( let i = 0; i < MIN_STATES; ++i ) {
            await actions.redo({ state, getters: { canRedo: state.undoManager.hasRedo() }});
            expect(( i + 1 )).toEqual(getters.amountOfStates(state)); // expected amount of states to increase when performing redo
        }
    });

    it('should not store more states than it allows', async () => {
        for ( let i = 0; i < amountOfStates * 2; ++i ) {
            await mutations.saveState(state, { undo: noop, redo: noop });
        }
        expect(getters.amountOfStates(state)).toEqual(amountOfStates); // expected model to not have recorded more states than the defined maximum
    });

    it('should be able to clear its history', () => {
        function shouldntRun() {
            throw new Error('undo/redo callback should not have fired after clearing the undo history');
        }
        mutations.saveState(state, { undo: shouldntRun, redo: shouldntRun });
        mutations.saveState(state, { undo: shouldntRun, redo: shouldntRun });

        mutations.resetHistory(state);

        expect(getters.canUndo(state)).toBe(false); // expected no undo to be available after flushing of history
        expect(getters.canRedo(state)).toBe(false); // expected no redo to be available after flushing of history
        expect(0).toEqual(getters.amountOfStates(state)); // expected no states to be present in history
    });
});
