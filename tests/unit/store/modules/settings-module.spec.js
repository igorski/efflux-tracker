import Config from "@/config";
import settingsModule, { PROPERTIES } from "@/store/modules/settings-module";

const { getters, mutations, actions } = settingsModule;

let mockStorageFn = jest.fn();
jest.mock( "@/utils/storage-util", () => ({
    init: jest.fn(( ...args ) => Promise.resolve( mockStorageFn( "init", ...args ))),
    getItem: jest.fn(( ...args ) => Promise.resolve( mockStorageFn( "getItem", ...args ))),
    setItem: jest.fn(( ...args ) => Promise.resolve( mockStorageFn( "setItem", ...args ))),
}));

describe( "Vuex settings module", () => {
    describe( "getters", () => {
        it( "should by default display the help section", () => {
            const state = { _settings: {} };
            expect( getters.displayHelp( state )).toBe( true );
        });

        it( "should return the saved value for displaying the help section", () => {
            const state = { _settings: { [ PROPERTIES.DISPLAY_HELP ]: false } };
            expect( getters.displayHelp( state )).toBe( false );
        });

        it( "should by default display the welcome screen", () => {
            const state = { _settings: {} };
            expect( getters.displayWelcome( state )).toBe( true );
        });

        it( "should return the saved value for displaying the welcome screen", () => {
            const state = { _settings: { [ PROPERTIES.DISPLAY_WELCOME ]: false } };
            expect( getters.displayWelcome( state )).toBe( false );
        });

        it( "should by default not follow playback", () => {
            const state = { _settings: {} };
            expect( getters.followPlayback( state )).toBe( false );
        });

        it( "should return the saved value for following playback", () => {
            const state = { _settings: { [ PROPERTIES.FOLLOW_PLAYBACK ]: true } };
            expect( getters.followPlayback( state )).toBe( true );
        });

        it( "should by default not display the timeline mode", () => {
            const state = { _settings: {} };
            expect( getters.timelineMode( state )).toBe( false );
        });

        it( "should return the saved value for following playback", () => {
            const state = { _settings: { [ PROPERTIES.TIMELINE_MODE ]: true } };
            expect( getters.timelineMode( state )).toBe( true );
        });

        it( "should by default have hexadecimal as the default parameter input format", () => {
            const state = { _settings: {} };
            expect( getters.paramFormat( state )).toBe( "hex" );
        });

        it( "should return the saved value for following playback", () => {
            const state = { _settings: { [ PROPERTIES.INPUT_FORMAT ]: "pct" } };
            expect( getters.paramFormat( state )).toBe( "pct" );
        });
    });

    describe( "mutations", () => {
        it( "should be able to save individual settings into storage", () => {
            const state = { _settings: { foo: "bar" } };
            mockStorageFn = jest.fn();

            mutations.saveSetting( state, { name: "baz", value: "qux" });
            expect( mockStorageFn ).toHaveBeenCalledWith( "setItem", Config.LOCAL_STORAGE_SETTINGS, JSON.stringify({
                foo: "bar", baz: "qux"
            }));
        });

        it( "should be able to set all stored settings into the module state", () => {
            const state = { _settings: {} };
            mutations.setStoredSettings( state, { foo: "bar", baz: "qux" });
            expect( state._settings ).toEqual({ foo: "bar", baz: "qux" });
        });
    });

    describe( "actions", () => {
        it( "should be able to retrieve the store settings from local storage and set them into the module state", async () => {
            mockStorageFn = jest.fn(() => JSON.stringify({ foo: "bar", baz: "qux" }));
            const commit = jest.fn();

            await actions.loadStoredSettings({ commit });

            expect( mockStorageFn ).toHaveBeenNthCalledWith( 1, "init" );
            expect( mockStorageFn ).toHaveBeenNthCalledWith( 2, "getItem", Config.LOCAL_STORAGE_SETTINGS );
            expect( commit ).toHaveBeenCalledWith( "setStoredSettings", { foo: "bar", baz: "qux" });
        });
    });
});
