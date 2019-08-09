import store from '@/store';
const { mutations }  = store;

jest.mock('@/i18n/translations', () => ({
    getCopy: key => key,
}));

jest.mock('@/services/keyboard-service', () => ({
    syncEditorSlot: () => 'synced',
    setSuspended: value => value,
}));

describe('Application Vuex store root', () => {
    describe('mutations', () => {
        it('should be able to toggle the opened state of the menu', () => {
            const state = { menuOpened: false };
            mutations.setMenuOpened(state, true);
            expect(state.menuOpened).toBe(true);
        });

        it('should be able to toggle the active state of the blinding layer', () => {
            const state = { blindActive: false };
            mutations.setBlindActive(state, true);
            expect(state.blindActive).toBe(true);
        });

        describe('when toggling the modal window', () => {
            it('should be able to set the opened modal', () => {
                const state = { blindActive: false, modal: null };
                mutations.openModal(state, 'foo');
                expect(state).toEqual({ blindActive: true, modal: 'foo' });
            });

            it('should be able to unset the opened modal', () => {
                const state = { blindActive: true, modal: 'foo' };
                mutations.openModal(state, null);
                expect(state).toEqual({ blindActive: false, modal: null });
            });

            it('should be able to close the currently opened modal, if existing', () => {
                const state = { blindActive: true, modal: 'foo' };
                mutations.closeModal(state);
                expect(state).toEqual({ blindActive: false, modal: null });
            });
        });

        it('should be able to set the currently visible help topic', () => {
            const state = { helpTopic: 'foo' };
            mutations.setHelpTopic(state, 'bar');
            expect(state.helpTopic).toEqual('bar');
        });

        describe('when maintaining loading states', () => {
            it('should be able to track multiple concurrent loading states', () => {
                const state = { loading: 0 };
                mutations.setLoading(state, true);
                expect(state.loading).toEqual(1);
                mutations.setLoading(state, true);
                expect(state.loading).toEqual(2);
            });

            it('should be able to decrement the concurrent loading states', () => {
                const state = { loading: 2 };
                mutations.setLoading(state, false);
                expect(state.loading).toEqual(1);
                mutations.setLoading(state, false);
                expect(state.loading).toEqual(0);
            });

            it('should not decrement into negative loading states', () => {
                const state = { loading: 1 };
                mutations.setLoading(state, false);
                mutations.setLoading(state, false);
                expect(state.loading).toEqual(0);
            });
        });

        describe('when toggling dialog windows', () => {
            it('should be able to open a dialog window and apply its request parameters', () => {
                const state = { dialog: null };
                const params = {
                    type: 'foo',
                    title: 'title',
                    message: 'message',
                    confirm: jest.fn(),
                    cancel: jest.fn()
                };
                mutations.openDialog(state, params);
                expect(state.dialog).toEqual(params);
            });

            it('should be able to apply default values when opening a dialog window without parameters', () => {
                const state = { dialog: null };
                mutations.openDialog(state, {});
                expect(state.dialog).toEqual({
                    type: 'info',
                    title: '',
                    message: '',
                    confirm: null,
                    cancel: null
                });
            });

            it('should be able to close an open dialog window', () => {
                const state = { dialog: { type: 'foo' } };
                mutations.closeDialog(state);
                expect(state.dialog).toBeNull();
            });

            it('should be able to open an error dialog', () => {
                const state = { dialog: null };
                mutations.showError(state, 'qux');
                expect(state.dialog).toEqual({
                    type: 'error',
                    title: 'ERROR_TITLE',
                    message: 'qux'
                })
            });
        });

        describe('when showing notification messages', () => {
            it('should be able to show a notification displaying its title and message', () => {
                const state = { notifications: [] };
                mutations.showNotification(state, { title: 'foo', message: 'bar' });
                expect(state.notifications).toEqual([{ title: 'foo', message: 'bar' }]);
            });

            it('should be able to show a notification using a default title when none was specified', () => {
                const state = { notifications: [] };
                mutations.showNotification(state, { message: 'foo' });
                expect(state.notifications).toEqual([{ title: 'SUCCESS_TITLE', message: 'foo' }]);
            });

            it('should be able to queue multiple notifications', () => {
                const state = { notifications: [] };
                mutations.showNotification(state, { message: 'foo' });
                mutations.showNotification(state, { message: 'bar' });
                expect(state.notifications).toEqual([
                    { title: 'SUCCESS_TITLE', message: 'foo' },
                    { title: 'SUCCESS_TITLE', message: 'bar' }
                ]);
            });

            it('should be able to clear all queued notifications', () => {
                const state = { notifications: [{ foo: 'bar' }, { baz: 'qux' }]};
                mutations.clearNotifications(state);
                expect(state.notifications).toEqual([]);
            });
        });

        xit('should be able to sync the keyboard in the KeyboardService', () => {
            mutations.syncKeyboard();
        });

        xit('should be able to suspend the keyboard in the KeyboardService', () => {
            mutations.suspendKeyboardService({}, true);
            mutations.suspendKeyboardService({}, false);
        });

        it('should be able to set the window size', () => {
            const state = { windowSize: { width: 0, height: 0 }};
            const width = 500;
            const height = 400;
            mutations.setWindowSize(state, { width, height });
            expect(state.windowSize).toEqual({ width, height });
        });

        it('should be able to set the window scroll offset', () => {
            const state = { windowScrollOffset: 0 };
            mutations.setWindowScrollOffset(state, 300);
            expect(state.windowScrollOffset).toEqual(300);
        });

        it('should be able to set the mobile view mode', () => {
            const state = { mobileMode: null };
            mutations.setMobileMode(state, 'foo');
            expect(state.mobileMode).toEqual('foo');
        })
    });
});
