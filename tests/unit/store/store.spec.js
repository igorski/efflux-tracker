/**
 * @jest-environment jsdom
 */
import APPLICATION_MODE from "@/definitions/application-modes";
import ModalWindows from "@/definitions/modal-windows";
import store from "@/store";
const { getters, mutations }  = store;

jest.mock( "@/workers/worker-factory", () => ({
    LoadSequencerWorker: () => { onmessage: jest.fn() }
}));

let mockFn;
jest.mock("@/services/keyboard-service", () => ({
    syncEditorSlot: jest.fn(( ...args ) => mockFn( "syncEditorSlot", ...args )),
    setSuspended: jest.fn(( ...args ) => mockFn( "setSuspended", ...args )),
}));

describe("Application Vuex store root", () => {
    describe("getters", () => {
        it( "should know when there is currently a loading state active", () => {
            const state = { loadingStates: [] };
            expect( getters.isLoading( state )).toBe( false );
            state.loadingStates.push( "foo" );
            expect( getters.isLoading( state )).toBe( true );
        });
    });

    describe("mutations", () => {
        it("should be able to toggle the opened state of the menu", () => {
            const state = { menuOpened: false };
            mutations.setMenuOpened(state, true);
            expect(state.menuOpened).toBe(true);
        });

        it("should be able to toggle the active state of the blinding layer", () => {
            const state = { blindActive: false };
            mutations.setBlindActive(state, true);
            expect(state.blindActive).toBe(true);
        });

        describe("when toggling the modal window", () => {
            it("should be able to set the opened modal", () => {
                const state = { blindActive: false, modal: null };
                mutations.openModal(state, "foo");
                expect(state).toEqual({ blindActive: true, modal: "foo" });
            });

            it("should be able to unset the opened modal", () => {
                const state = { blindActive: true, modal: "foo" };
                mutations.openModal(state, null);
                expect(state).toEqual({ blindActive: false, modal: null });
            });

            it("should be able to close the currently opened modal, if existing", () => {
                const state = { blindActive: true, modal: "foo" };
                mutations.closeModal(state);
                expect(state).toEqual({ blindActive: false, modal: null });
            });

            it("should force reopen the jam modal, when closing any modal with jam mode still active", () => {
                const state = { blindActive: true, applicationMode: APPLICATION_MODE.JAM_MODE, modal: "foo" };
                mutations.closeModal( state );
                expect( state ).toEqual({
                    blindActive: true,
                    applicationMode: APPLICATION_MODE.JAM_MODE,
                    modal: ModalWindows.JAM_MODE
                });
            });
        });

        it("should be able to set the currently visible help topic", () => {
            const state = { helpTopic: "foo" };
            mutations.setHelpTopic(state, "bar");
            expect(state.helpTopic).toEqual("bar");
        });

        describe( "when toggling loading states", () => {
            it( "should be able to register a new loading state", () => {
                const state = { loadingStates: [ "foo" ] };
                mutations.setLoading( state, "bar" );
                expect( state.loadingStates ).toEqual([ "foo", "bar" ]);
            });

            it( "should be able to unregister an existing loading state", () => {
                const state = { loadingStates: [ "foo", "bar" ] };
                mutations.unsetLoading( state, "foo" );
                expect( state.loadingStates ).toEqual([ "bar" ]);
            });
        });

        describe("when toggling dialog windows", () => {
            it("should be able to open a dialog window and apply its request parameters", () => {
                const state = { dialog: null };
                const params = {
                    type: "foo",
                    title: "title",
                    message: "message",
                    confirm: jest.fn(),
                    cancel: jest.fn(),
                    hideActions: true
                };
                mutations.openDialog(state, params);
                expect(state.dialog).toEqual(params);
            });

            it("should be able to apply default values when opening a dialog window without parameters", () => {
                const state = { dialog: null };
                mutations.openDialog(state, {});
                expect(state.dialog).toEqual({
                    type: "info",
                    title: "",
                    message: "",
                    confirm: null,
                    cancel: null,
                    hideActions: false
                });
            });

            it("should be able to close an open dialog window", () => {
                const state = { dialog: { type: "foo" } };
                mutations.closeDialog(state);
                expect(state.dialog).toBeNull();
            });

            it("should be able to open an error dialog", () => {
                const state = { dialog: null };
                mutations.showError(state, "qux");
                expect(state.dialog).toEqual({
                    type: "error",
                    title: "title.error",
                    message: "qux"
                })
            });
        });

        describe("when showing notification messages", () => {
            it("should be able to show a notification displaying its title and message", () => {
                const state = { notifications: [] };
                mutations.showNotification(state, { title: "foo", message: "bar" });
                expect(state.notifications).toEqual([{ title: "foo", message: "bar" }]);
            });

            it("should be able to show a notification using a default title when none was specified", () => {
                const state = { notifications: [] };
                mutations.showNotification(state, { message: "foo" });
                expect(state.notifications).toEqual([{ title: "title.success", message: "foo" }]);
            });

            it("should be able to queue multiple notifications", () => {
                const state = { notifications: [] };
                mutations.showNotification(state, { message: "foo" });
                mutations.showNotification(state, { message: "bar" });
                expect(state.notifications).toEqual([
                    { title: "title.success", message: "foo" },
                    { title: "title.success", message: "bar" }
                ]);
            });

            it("should be able to clear all queued notifications", () => {
                const state = { notifications: [{ foo: "bar" }, { baz: "qux" }]};
                mutations.clearNotifications(state);
                expect(state.notifications).toEqual([]);
            });
        });

        it("should be able to sync the keyboard in the KeyboardService", () => {
            mockFn = jest.fn();
            mutations.syncKeyboard();
            expect( mockFn ).toHaveBeenCalledWith( "syncEditorSlot" );
        });

        it("should be able to suspend the keyboard in the KeyboardService", () => {
            mockFn = jest.fn();

            mutations.suspendKeyboardService( {}, true );
            expect( mockFn ).toHaveBeenCalledWith( "setSuspended", true );

            mockFn = jest.fn();

            mutations.suspendKeyboardService( {}, false );
            expect( mockFn ).toHaveBeenCalledWith( "setSuspended", false );
        });

        it("should be able to set the window size", () => {
            const state = { windowSize: { width: 0, height: 0 }};
            const width = 500;
            const height = 400;
            mutations.setWindowSize( state, { width, height });
            expect( state.windowSize ).toEqual({ width, height });
        });

        it("should be able to set the mobile view mode", () => {
            const state = { mobileMode: null };
            mutations.setMobileMode( state, "foo" );
            expect( state.mobileMode ).toEqual("foo");
        });

        it( "should be able to set the Dropbox connected state", () => {
            const state = { dropboxConnected: false };
            mutations.setDropboxConnected( state, true );
            expect( state.dropboxConnected ).toBe( true );
        });

        it( "should be able to set the media connected state", () => {
            const state = { mediaConnected: false };
            mutations.setMediaConnected( state, true );
            expect( state.mediaConnected ).toBe( true );
        });

        it( "should be able to set the application mode", () => {
            const state = { applicationMode: APPLICATION_MODE.TRACKER };
            mutations.setApplicationMode( state, APPLICATION_MODE.JAM_MODE );
            expect( state.applicationMode ).toEqual( APPLICATION_MODE.JAM_MODE );
        });
    });
});
