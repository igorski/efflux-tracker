/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2017-2023 - https://www.igorski.nl
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
import type { Commit, Dispatch, Module } from "vuex";
import Config from "@/config";
import { EffluxSongType } from "@/model/types/song";
import StorageUtil from "@/utils/storage-util";

export interface SettingsState {
    _settings: Record<string, any>;
};

export const createSettingsState = ( props?: Partial<SettingsState> ): SettingsState => ({
    _settings: {},
    ...props
});

export enum PROPERTIES {
    INPUT_FORMAT    = "if",
    FOLLOW_PLAYBACK = "fp",
    DISPLAY_HELP    = "dh",
    DISPLAY_WELCOME = "dw",
    USE_ORDERS      = "po",
};

/* internal methods */

/**
 * save the state of the model in local storage
 */
const persistState = ( state: SettingsState ): void => {
    StorageUtil.setItem( Config.LOCAL_STORAGE_SETTINGS, JSON.stringify( state._settings ));
};

// a module that can store user defined settings
// and retrieve them in future sessions

const SettingsModule: Module<SettingsState, any> = {
    state: (): SettingsState => createSettingsState(),
    getters: {
        displayHelp : ( state: SettingsState, rootGetters: any ) => {
            return state._settings[ PROPERTIES.DISPLAY_HELP ] !== false && rootGetters.activeSong.type !== EffluxSongType.JAM;
        },
        displayWelcome : ( state: SettingsState ) => state._settings[ PROPERTIES.DISPLAY_WELCOME ] !== false,
        followPlayback : ( state: SettingsState ) => state._settings[ PROPERTIES.FOLLOW_PLAYBACK ] === true,
        paramFormat    : ( state: SettingsState ) => state._settings[ PROPERTIES.INPUT_FORMAT ] || "hex",
        useOrders : ( state: SettingsState, rootGetters: any ) => {
            const { activeSong } = rootGetters;
            if ( activeSong.type === EffluxSongType.JAM ) {
                return false;
            }
            const setting = state._settings[ PROPERTIES.USE_ORDERS ] !== false;
            if ( setting ) {
                return true;
            }
            return activeSong.patterns.length !== activeSong.order.length;
        },
    },
    mutations: {
        saveSetting( state: SettingsState, { name, value }: { name: string, value: any }): void {
            state._settings[ name ] = value;
            persistState( state );
        },
        setStoredSettings( state: SettingsState, settings: any ): void {
            state._settings = settings;
        }
    },
    actions: {
        async loadStoredSettings({ commit, dispatch }: { commit: Commit, dispatch: Dispatch }): Promise<void> {
            StorageUtil.init();
            try {
                const result = await StorageUtil.getItem( Config.LOCAL_STORAGE_SETTINGS );
                if ( typeof result === "string" ) {
                    try {
                        commit( "setStoredSettings", JSON.parse( result ));
                        dispatch( "updateExisting" );
                    } catch {
                        // that's fine (non-blocking)
                    }
                }
            } catch {
                // no settings available yet, that is fine (non-blocking)
                dispatch( "setFirstRunDefaults" );
            }
        },
        updateExisting({ commit, state }: { commit: Commit, state: SettingsState }): void {
            if ( state._settings[ PROPERTIES.USE_ORDERS ] === undefined ) {
                // orders were introduced in Oct '23. These will be enabled for new users, but
                // for returning users we disabled them to keep workflow clear.
                commit( "saveSetting", { name: PROPERTIES.USE_ORDERS, value: false });
            }
        },
        setFirstRunDefaults({ commit }: { commit: Commit }): void {
            commit( "saveSetting", { name: PROPERTIES.USE_ORDERS, value: true });
        },
    }
};
export default SettingsModule;
