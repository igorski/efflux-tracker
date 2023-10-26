import { describe, it, expect, vi, afterEach } from "vitest";
import type { MutationTree, ActionTree } from "vuex";
import Config from "@/config";
import type { EffluxSong } from "@/model/types/song";
import settingsModule, { createSettingsState, PROPERTIES } from "@/store/modules/settings-module";
import type { SettingsState } from "@/store/modules/settings-module";

const getters: any = settingsModule.getters;
const mutations: MutationTree<SettingsState> = settingsModule.mutations;
const actions: ActionTree<SettingsState, any> = settingsModule.actions;

let mockStorageFn = vi.fn();
const mockStorageGetItem = vi.fn();
vi.mock( "@/utils/storage-util", () => ({
    default: {
        init: vi.fn(( ...args ) => Promise.resolve( mockStorageFn( "init", ...args ))),
        getItem: vi.fn(( ...args ) => mockStorageGetItem( ...args )),
        setItem: vi.fn(( ...args ) => Promise.resolve( mockStorageFn( "setItem", ...args ))),
    }
}));

describe( "Vuex settings module", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

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

        describe( "and retrieving whether orders can be used", () => {
            it( "should return the saved value", () => {
                const state = createSettingsState({ _settings: { [ PROPERTIES.USE_ORDERS ]: true } });
                expect( getters.useOrders( state )).toBe( true );
            });

            it( "should return the saved value when false as true when the currently active song uses orders", () => {
                const state = createSettingsState({ _settings: { [ PROPERTIES.USE_ORDERS ]: false } });
                const rootGetters = {
                    activeSong: {
                        patterns: [[], []],
                        order: [0, 1, 1, 0]
                    } as Partial<EffluxSong>,
                };
                expect( getters.useOrders( state, rootGetters )).toBe( true );
            });

            it( "should return the saved value when false when the currently active song does not use orders", () => {
                const state = createSettingsState({ _settings: { [ PROPERTIES.USE_ORDERS ]: false } });
                const rootGetters = {
                    activeSong: {
                        patterns: [[], []],
                        order: [0, 1]
                    } as Partial<EffluxSong>,
                };
                expect( getters.useOrders( state, rootGetters )).toBe( false );
            });
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
        describe( "when loading stored settings", () => {
            const mockSettings = { foo: "bar", baz: "qux" };

            it( "should be able to retrieve the store settings from local storage and set them into the module state", async () => {
                mockStorageGetItem.mockImplementationOnce(() => Promise.resolve( JSON.stringify( mockSettings )));
                const commit   = vi.fn();
                const dispatch = vi.fn();

                // @ts-expect-error Type 'ActionObject<SettingsState, any>' has no call signatures.
                await actions.loadStoredSettings({ commit, dispatch });

                expect( mockStorageFn ).toHaveBeenCalledWith( "init" );
                expect( mockStorageGetItem ).toHaveBeenCalledWith( Config.LOCAL_STORAGE_SETTINGS );
                expect( commit ).toHaveBeenCalledWith( "setStoredSettings", mockSettings );
            });

            it( "should verify whether to update the existing settings only when a saved configuration existed previously", async () => {
                mockStorageGetItem.mockImplementationOnce(() => Promise.resolve( undefined ));
                const commit   = vi.fn();
                const dispatch = vi.fn();

                // @ts-expect-error Type 'ActionObject<SettingsState, any>' has no call signatures.
                await actions.loadStoredSettings({ commit, dispatch });

                expect( dispatch ).not.toHaveBeenCalledWith( "updateExisting" );

                mockStorageGetItem.mockImplementationOnce(() => Promise.resolve( JSON.stringify( mockSettings )));

                // @ts-expect-error Type 'ActionObject<SettingsState, any>' has no call signatures.
                await actions.loadStoredSettings({ commit, dispatch });

                expect( dispatch ).toHaveBeenCalledWith( "updateExisting" );
            });

            it( "should store default values only when no saved configuration existed yet", async () => {
                mockStorageGetItem.mockImplementationOnce(() => Promise.resolve( JSON.stringify( mockSettings )));
                const commit   = vi.fn();
                const dispatch = vi.fn();

                // @ts-expect-error Type 'ActionObject<SettingsState, any>' has no call signatures.
                await actions.loadStoredSettings({ commit, dispatch });

                expect( dispatch ).not.toHaveBeenCalledWith( "setFirstRunDefaults" );

                mockStorageGetItem.mockImplementationOnce(() => Promise.reject());
                
                // @ts-expect-error Type 'ActionObject<SettingsState, any>' has no call signatures.
                await actions.loadStoredSettings({ commit, dispatch });

                expect( dispatch ).toHaveBeenCalledWith( "setFirstRunDefaults" );
            });
        });

        describe( "when updating existing configurations", () => {
            it( "should not do anything when a configuration for orders already exists", () => {
                const state = createSettingsState({ _settings: { [ PROPERTIES.USE_ORDERS ]: "false" } });
                const commit = vi.fn();

                // @ts-expect-error Type 'ActionObject<SettingsState, any>' has no call signatures.
                actions.updateExisting({ commit, state });

                expect( commit ).not.toHaveBeenCalledWith( "saveSetting", { name: PROPERTIES.USE_ORDERS, value: expect.any( Boolean ) });
            });

            it( "should save a default USE_ORDERS setting to false when no configuration for orders existed yet", () => {
                const state = createSettingsState({ _settings: {} });
                const commit = vi.fn();

                // @ts-expect-error Type 'ActionObject<SettingsState, any>' has no call signatures.
                actions.updateExisting({ commit, state });

                expect( commit ).toHaveBeenCalledWith( "saveSetting", { name: PROPERTIES.USE_ORDERS, value: false });
            });
        });

        describe( "when applying the defaults for the first application run", () => {
            it( "should save a default USE_ORDERS setting to true", () => {
                const commit = vi.fn();

                // @ts-expect-error Type 'ActionObject<SettingsState, any>' has no call signatures.
                actions.setFirstRunDefaults({ commit });

                expect( commit ).toHaveBeenCalledWith( "saveSetting", { name: PROPERTIES.USE_ORDERS, value: true });
            });
        });
    });
});
