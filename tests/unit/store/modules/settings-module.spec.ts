import { describe, it, expect, vi } from "vitest";
import type { MutationTree, ActionTree } from "vuex";
import Config from "@/config";
import settingsModule, { createSettingsState, PROPERTIES } from "@/store/modules/settings-module";
import type { SettingsState } from "@/store/modules/settings-module";

const getters: any = settingsModule.getters;
const mutations: MutationTree<SettingsState> = settingsModule.mutations;
const actions: ActionTree<SettingsState, any> = settingsModule.actions;

let mockStorageFn = vi.fn();
vi.mock( "@/utils/storage-util", () => ({
    default: {
        init: vi.fn(( ...args ) => Promise.resolve( mockStorageFn( "init", ...args ))),
        getItem: vi.fn(( ...args ) => Promise.resolve( mockStorageFn( "getItem", ...args ))),
        setItem: vi.fn(( ...args ) => Promise.resolve( mockStorageFn( "setItem", ...args ))),
    }
}));

describe( "Vuex settings module", () => {
    describe( "getters", () => {
        it( "should by default display the help section", () => {
            const state = createSettingsState();
            expect( getters.displayHelp( state )).toBe( true );
        });

        it( "should return the saved value for displaying the help section", () => {
            const state = createSettingsState({ _settings: { [ PROPERTIES.DISPLAY_HELP ]: false } });
            expect( getters.displayHelp( state )).toBe( false );
        });

        it( "should by default display the welcome screen", () => {
            const state = createSettingsState();
            expect( getters.displayWelcome( state )).toBe( true );
        });

        it( "should return the saved value for displaying the welcome screen", () => {
            const state = createSettingsState({ _settings: { [ PROPERTIES.DISPLAY_WELCOME ]: false } });
            expect( getters.displayWelcome( state )).toBe( false );
        });

        it( "should by default not follow playback", () => {
            const state = createSettingsState();
            expect( getters.followPlayback( state )).toBe( false );
        });

        it( "should return the saved value for following playback", () => {
            const state = createSettingsState({ _settings: { [ PROPERTIES.FOLLOW_PLAYBACK ]: true } });
            expect( getters.followPlayback( state )).toBe( true );
        });

        it( "should by default not display the timeline mode", () => {
            const state = createSettingsState();
            expect( getters.timelineMode( state )).toBe( false );
        });

        it( "should return the saved value for following playback", () => {
            const state = createSettingsState({ _settings: { [ PROPERTIES.TIMELINE_MODE ]: true } });
            expect( getters.timelineMode( state )).toBe( true );
        });

        it( "should by default have hexadecimal as the default parameter input format", () => {
            const state = createSettingsState();
            expect( getters.paramFormat( state )).toBe( "hex" );
        });

        it( "should return the saved value for following playback", () => {
            const state = createSettingsState({ _settings: { [ PROPERTIES.INPUT_FORMAT ]: "pct" } });
            expect( getters.paramFormat( state )).toBe( "pct" );
        });
    });

    describe( "mutations", () => {
        it( "should be able to save individual settings into storage", () => {
            const state = createSettingsState({ _settings: { foo: "bar" } });
            mockStorageFn = vi.fn();

            mutations.saveSetting( state, { name: "baz", value: "qux" });
            expect( mockStorageFn ).toHaveBeenCalledWith( "setItem", Config.LOCAL_STORAGE_SETTINGS, JSON.stringify({
                foo: "bar", baz: "qux"
            }));
        });

        it( "should be able to set all stored settings into the module state", () => {
            const state = createSettingsState();
            mutations.setStoredSettings( state, { foo: "bar", baz: "qux" });
            expect( state._settings ).toEqual({ foo: "bar", baz: "qux" });
        });
    });

    describe( "actions", () => {
        it( "should be able to retrieve the store settings from local storage and set them into the module state", async () => {
            mockStorageFn = vi.fn(() => JSON.stringify({ foo: "bar", baz: "qux" }));
            const commit = vi.fn();

            // @ts-expect-error Type 'ActionObject<SettingsState, any>' has no call signatures.
            await actions.loadStoredSettings({ commit });

            expect( mockStorageFn ).toHaveBeenNthCalledWith( 1, "init" );
            expect( mockStorageFn ).toHaveBeenNthCalledWith( 2, "getItem", Config.LOCAL_STORAGE_SETTINGS );
            expect( commit ).toHaveBeenCalledWith( "setStoredSettings", { foo: "bar", baz: "qux" });
        });
    });
});
