import { describe, it, expect, vi } from "vitest";
import ModalWindows from "@/definitions/modal-windows";
import store from "@/store";
import { createState } from "../mocks";

const { getters, mutations } = store;

let mockFn: ( fnName: string, ...args: any ) => void;
vi.mock("@/services/keyboard-service", () => ({
    default: {
        syncEditorSlot: vi.fn(( ...args ): void => mockFn( "syncEditorSlot", ...args )),
        setSuspended: vi.fn(( ...args ): void => mockFn( "setSuspended", ...args )),
    }
}));

describe( "Application Vuex store root", () => {
    describe( "getters", () => {
        it( "should know when there is currently a loading state active", () => {
            const state = createState();
            expect( getters.isLoading( state )).toBe( false );

            state.loadingStates.push( "foo" );
            expect( getters.isLoading( state )).toBe( true );
        });
    });

    describe( "mutations", () => {
        it( "should be able to toggle the opened state of the menu", () => {
            const state = createState({ menuOpened: false });
            mutations.setMenuOpened( state, true );
            expect( state.menuOpened ).toBe( true );
        });

        it( "should be able to toggle the active state of the blinding layer", () => {
            const state = createState({ blindActive: false });
            mutations.setBlindActive( state, true );
            expect( state.blindActive ).toBe( true );
        });

        describe( "when toggling the modal window", () => {
            it( "should be able to set the opened modal", () => {
                const state = createState({ blindActive: false, modal: null });
                mutations.openModal( state, ModalWindows.INSTRUMENT_EDITOR );

                expect( state.blindActive ).toBe( true );
                expect( state.modal ).toEqual( ModalWindows.INSTRUMENT_EDITOR );
            });

            it( "should be able to unset the opened modal", () => {
                const state = createState({ blindActive: true, modal: ModalWindows.SETTINGS_WINDOW });
                mutations.openModal( state, null );

                expect( state.blindActive ).toBe( false );
                expect( state.modal ).toBeNull();
            });

            it( "should be able to close the currently opened modal, if existing", () => {
                const state = createState({ blindActive: true, modal: ModalWindows.SETTINGS_WINDOW });
                mutations.closeModal( state );

                expect( state.blindActive ).toBe( false );
                expect( state.modal ).toBeNull();
            });
        });

        it( "should be able to set the currently visible help topic", () => {
            const state = createState({ helpTopic: "foo" });
            mutations.setHelpTopic( state, "bar" );
            expect( state.helpTopic ).toEqual( "bar" );
        });

        describe( "when toggling loading states", () => {
            it( "should be able to register a new loading state", () => {
                const state = createState({ loadingStates: [ "foo" ] });
                mutations.setLoading( state, "bar" );
                expect( state.loadingStates ).toEqual([ "foo", "bar" ]);
            });

            it( "should be able to unregister an existing loading state", () => {
                const state = createState({ loadingStates: [ "foo", "bar" ] });
                mutations.unsetLoading( state, "foo" );
                expect( state.loadingStates ).toEqual([ "bar" ]);
            });
        });

        describe( "when toggling dialog windows", () => {
            it( "should be able to open a dialog window and apply its request parameters", () => {
                const state = createState({ dialog: null });
                const params = {
                    type: "foo",
                    title: "title",
                    message: "message",
                    confirm: vi.fn(),
                    cancel: vi.fn(),
                    hideActions: true
                };
                mutations.openDialog( state, params );
                expect( state.dialog ).toEqual( params );
            });

            it( "should be able to apply default values when opening a dialog window without parameters", () => {
                const state = createState({ dialog: null });
                // @ts-expect-error no params
                mutations.openDialog( state, {} );
                expect( state.dialog ).toEqual({
                    type: "info",
                    title: "",
                    message: "",
                    confirm: null,
                    cancel: null,
                    hideActions: false
                });
            });

            it( "should be able to close an open dialog window", () => {
                const state = createState({ dialog: { type: "info", title: "foo", message: "bar" } });
                mutations.closeDialog( state );
                expect( state.dialog ).toBeNull();
            });

            it( "should be able to open an error dialog", () => {
                const state = createState({ dialog: null });
                mutations.showError( state, "qux" );
                expect( state.dialog ).toEqual({
                    type: "error",
                    title: "title.error",
                    message: "qux"
                });
            });
        });

        describe( "when showing notification messages", () => {
            it( "should be able to show a notification displaying its title and message", () => {
                const state = createState({ notifications: [] });
                mutations.showNotification( state, { title: "foo", message: "bar" });
                expect( state.notifications ).toEqual([{ title: "foo", message: "bar" }]);
            });

            it( "should be able to show a notification using a default title when none was specified", () => {
                const state = createState({ notifications: [] });
                mutations.showNotification( state, { message: "foo" });
                expect( state.notifications ).toEqual([{ title: "title.success", message: "foo" }]);
            });

            it( "should be able to queue multiple notifications", () => {
                const state = createState();

                mutations.showNotification( state, { message: "foo" });
                mutations.showNotification( state, { message: "bar" });

                expect( state.notifications ).toEqual([
                    { title: "title.success", message: "foo" },
                    { title: "title.success", message: "bar" }
                ]);
            });

            it( "should be able to clear all queued notifications", () => {
                const state = createState({ notifications: [{ title: "bar" }, { title: "qux" }]});
                mutations.clearNotifications( state );
                expect( state.notifications ).toEqual( [] );
            });
        });

        it( "should be able to sync the keyboard in the KeyboardService", () => {
            mockFn = vi.fn();
            mutations.syncKeyboard();
            expect( mockFn ).toHaveBeenCalledWith( "syncEditorSlot" );
        });

        it( "should be able to suspend the keyboard in the KeyboardService", () => {
            const state = createState();
            mockFn = vi.fn();

            mutations.suspendKeyboardService( state, true );
            expect( mockFn ).toHaveBeenCalledWith( "setSuspended", true );

            mockFn = vi.fn();

            mutations.suspendKeyboardService( state, false );
            expect( mockFn ).toHaveBeenCalledWith( "setSuspended", false );
        });

        it( "should be able to set the window size", () => {
            const state = createState({ windowSize: { width: 0, height: 0 }});
            const width = 500;
            const height = 400;
            mutations.setWindowSize( state, { width, height });
            expect( state.windowSize ).toEqual({ width, height });
        });

        it( "should be able to set the mobile view mode", () => {
            const state = createState({ mobileMode: null });
            mutations.setMobileMode( state, "foo" );
            expect( state.mobileMode ).toEqual("foo");
        });

        it( "should be able to set the touch support state", () => {
            const state = createState({ supportsTouch: false });
            mutations.setSupportsTouch( state, true );
            expect( state.supportsTouch ).toEqual( true );
        });

        it( "should be able to set the Dropbox connected state", () => {
            const state = createState({ dropboxConnected: false });
            mutations.setDropboxConnected( state, true );
            expect( state.dropboxConnected ).toBe( true );
        });

        it( "should be able to set the media connected state", () => {
            const state = createState({ mediaConnected: false });
            mutations.setMediaConnected( state, true );
            expect( state.mediaConnected ).toBe( true );
        });

        it( "should be able to set the application focused state", () => {
            const state = createState({ applicationFocused: true });
            mutations.setApplicationFocused( state, false );
            expect( state.applicationFocused ).toEqual( false );
        });
    });
});
