import SelectionModule from '@/store/modules/selection-module';
import SongModel       from '@/store/modules/song-module';

const { getters, mutations } = SelectionModule;

describe('SelectionModel', () => {
    let state;
    beforeEach(() => {
        state = {
            firstSelectedChannel: 0,
            lastSelectedChannel: 0,
            selectedChannels: [],
            actionCache: {
                channelOnSelection: 0,
                directionOnSelection: 0,
            }
        };
    });

    describe('getters', () => {
        it('should know the full length of its selection', () => {
            mutations.setSelectionChannelRange(state, { firstChannel: 0, lastChannel: 1 });
            const min = 0;
            const max = 16;

            mutations.setSelection(state, { selectionStart: min, selectionEnd: max });

            const expected = ( max - min ) + 1; // 1 as a single step is already a selection

            expect(expected).toEqual(getters.getSelectionLength(state));
        });

        it('should know whether it has a selection', () => {
            expect(getters.hasSelection(state)).toBe(false);

            mutations.setSelectionChannelRange(state, { firstChannel: 0, lastChannel: 4 });
            mutations.setSelection(state, { selectionStart: 0, selectionEnd: 16 });

            expect(getters.hasSelection(state)).toBe(true);
        });
    });

    describe('mutations', () => {
        it('should be able to select multiple channels for its selection', () => {
             mutations.setSelectionChannelRange(state, { firstChannel: 0 });

             expect(1).toEqual(state.selectedChannels.length);

             mutations.setSelectionChannelRange(state, { firstChannel: 0, lastChannel: 3 });

             expect(4).toEqual(state.selectedChannels.length);
             expect(0).toEqual(state.firstSelectedChannel);
             expect(3).toEqual(state.lastSelectedChannel);
        });

        it('should add indices to its current selection', () => {
            let min = 0, i;
            const max = 16;

            mutations.setSelectionChannelRange(state, { firstChannel: 0 }); // select a single channel
            mutations.setSelection(state, { selectionStart: min, selectionEnd: max });

            for (i = min; i < max; ++i) {
                expect(state.selectedChannels[0].indexOf(i) > -1).toBe(true);
            }
        });

        it('should know the minimum and maximum indices of its selection', () => {
            mutations.setSelectionChannelRange(state, { firstChannel: 0 }); // select a single channel

            let min = 0;
            const max = 16;

            mutations.setSelection(state, { selectionStart: min, selectionEnd: max });

            expect(0).toEqual(state.minSelectedStep);

            expect(max).toEqual(state.maxSelectedStep);
        });

        it('should add not add the same index twice to its current selection', () => {
            const activeChannel = 0, max = 1;

            mutations.setSelectionChannelRange(state, { firstChannel: activeChannel, lastChannel: max });
            mutations.setSelection(state, { selectionStart: 0, selectionEnd: max });

            expect(2).toEqual(state.selectedChannels[activeChannel].length);

            mutations.setSelection(state, { selectionStart: 0, selectionEnd: max });

            expect(2).toEqual(state.selectedChannels[activeChannel].length);
        });

        it('should be able to clear its selection', () => {
            mutations.setSelectionChannelRange(state, { firstChannel: 0, lastChannel: 1 });

            mutations.setSelection(state, { selectionStart: 0, selectionEnd: 1 });
            mutations.setSelection(state, { selectionStart: 0, selectionEnd: 2 });

            mutations.clearSelection(state);

            expect(0).toEqual(state.selectedChannels.length);
            expect(getters.hasSelection(state)).toBe(false);
        });

        it('should be able to equalize the selection for all channels', () => {
            mutations.setSelectionChannelRange(state, { firstChannel: 0, lastChannel: 3 });

            const activeChannel = 0;
            const otherChannel = 1;
            const max = 4;

            mutations.setSelection(state, { selectionStart: 0, selectionEnd: max });
            mutations.equalizeSelection(state);

            expect(JSON.stringify(state.selectedChannels[activeChannel])).toEqual(JSON.stringify(state.selectedChannels[otherChannel]));
        });

        it('should treat a single step as 1 unit range', () => {
            mutations.setSelectionChannelRange(state, { firstChannel: 0, lastChannel: 1 });
            mutations.setSelection(state, { selectionStart: 0 });

            expect(1).toEqual(getters.getSelectionLength(state));
        });

        it('should be able to expand and shrink its selection when starting key selection to the right', () => {
            let keyCode = 39; // right
            const activeChannelOnStart = Math.round(Math.random() * 3) + 1;
            const activeStep = 1;

            // test 1. expand

            mutations.handleHorizontalKeySelectAction(state, {keyCode, activeChannelOnStart, activeStep});

            expect(state.firstSelectedChannel === activeChannelOnStart && state.lastSelectedChannel === ( activeChannelOnStart + 1 )).toBe(true);

            mutations.handleHorizontalKeySelectAction(state, {keyCode, activeChannelOnStart, activeStep});

            expect(state.firstSelectedChannel === activeChannelOnStart && state.lastSelectedChannel === ( activeChannelOnStart + 2 )).toBe(true);

            // test 2. shrink

            keyCode = 37; // left
            mutations.handleHorizontalKeySelectAction(state, {keyCode, activeChannelOnStart, activeStep});

            // expect state to have a 1 channel wide selection range after shrinking
            expect(state.firstSelectedChannel === activeChannelOnStart && state.lastSelectedChannel === ( activeChannelOnStart + 1 )).toBe(true);

            mutations.handleHorizontalKeySelectAction(state, {keyCode, activeChannelOnStart, activeStep});

            // expect state to have a 0 channel wide selection range after shrinking (single channel selected)
            expect(state.firstSelectedChannel === activeChannelOnStart && state.lastSelectedChannel === activeChannelOnStart).toBe(true);
            mutations.handleHorizontalKeySelectAction(state, {keyCode, activeChannelOnStart, activeStep});

            // expect state to have a 1 channel wide selection range after shrinking (single channel selected)
            expect(state.firstSelectedChannel === ( activeChannelOnStart - 1 ) && state.lastSelectedChannel === activeChannelOnStart).toBe(true);
        });

        it('should be able to expand and shrink its selection when starting key selection to the left', () => {
            let keyCode = 37; // left
            const activeChannelOnStart = Math.round(Math.random() * 3) + 1;
            const activeStep = 1;

            // test 1. expand

            mutations.handleHorizontalKeySelectAction(state, {keyCode, activeChannelOnStart, activeStep});

            expect(state.firstSelectedChannel === ( activeChannelOnStart - 1 ) && state.lastSelectedChannel === activeChannelOnStart).toBe(true);

            mutations.handleHorizontalKeySelectAction(state, {keyCode, activeChannelOnStart, activeStep});

            expect(state.firstSelectedChannel === ( activeChannelOnStart - 2 ) && state.lastSelectedChannel === activeChannelOnStart).toBe(true);

            // test 2. shrink

            keyCode = 39; // right
            mutations.handleHorizontalKeySelectAction(state, {keyCode, activeChannelOnStart, activeStep});

            //  expect state to have a 1 channel wide selection range after shrinking
            expect(state.firstSelectedChannel === ( activeChannelOnStart - 1 ) && state.lastSelectedChannel === activeChannelOnStart).toBe(true);

            mutations.handleHorizontalKeySelectAction(state, {keyCode, activeChannelOnStart, activeStep});

            // expect state to have a 0 channel wide selection range after shrinking (single channel selected)
            expect(state.firstSelectedChannel === activeChannelOnStart && state.lastSelectedChannel === activeChannelOnStart).toBe(true);
            mutations.handleHorizontalKeySelectAction(state, {keyCode, activeChannelOnStart, activeStep});

            // expect state to have a 2 channel wide selection range after shrinking (single channel selected)
            expect(state.firstSelectedChannel === ( activeChannelOnStart + 1 ) && state.lastSelectedChannel === activeChannelOnStart).toBe(true);
        });
    });
});
