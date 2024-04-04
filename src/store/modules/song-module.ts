/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2023 - https://www.igorski.nl
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the 'Software'), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import type { ActionContext, Commit, Dispatch, Module, Store } from "vuex";
import Vue from "vue";
import Config from "@/config";
import { PROJECT_FILE_EXTENSION } from "@/definitions/file-types";
import ModalWindows from "@/definitions/modal-windows";
import PatternFactory from  "@/model/factories/pattern-factory";
import SongFactory, { FACTORY_VERSION } from "@/model/factories/song-factory";
import { uploadBlob, getCurrentFolder } from "@/services/dropbox-service";
import FixturesLoader from "@/services/fixtures-loader";
import SongAssemblyService from "@/services/song-assembly-service";
import PubSubMessages from "@/services/pubsub/messages";
import SongValidator from "@/model/validators/song-validator";
import addEvent, { type OptEventData } from "@/model/actions/event-add";
import type { EffluxAudioEvent } from "@/model/types/audio-event";
import type { Instrument } from "@/model/types/instrument";
import type { EffluxPattern } from "@/model/types/pattern";
import type { EffluxPatternOrder } from "@/model/types/pattern-order";
import type { Sample } from "@/model/types/sample";
import { type EffluxSong, type StoredEffluxSongDescriptor, type EffluxSongOrigin, EffluxSongType } from "@/model/types/song";
import StorageUtil from "@/utils/storage-util";
import { saveAsFile } from "@/utils/file-util";
import { indexToName } from "@/utils/pattern-name-util";
import { toFileName } from "@/utils/string-util";
import { parseXTK, toXTK } from "@/utils/xtk-util";
import { hasContent, resetPlayState, updateEventOffsets } from "@/utils/song-util";
import type { EffluxState } from "@/store";

export const SONG_STORAGE_KEY = "Efflux_Song_";
export const getStorageKeyForSong = ({ id }: { id: string }) => `${SONG_STORAGE_KEY}${id}`;

export interface SongState {
    songs: StoredEffluxSongDescriptor[];
    activeSong: EffluxSong | null;
    showSaveMessage: boolean;
    statesOnSave: number; // the last amount of available history states on song save (used to detect changes)
}

export const createSongState = ( props?: Partial<SongState> ): SongState => ({
    songs: [],
    activeSong: null,
    showSaveMessage: true,
    statesOnSave: 0,
    ...props
});

const SongModule: Module<SongState, any> = {
    state: (): SongState => createSongState(),
    getters: {
        songs       : ( state: SongState ): StoredEffluxSongDescriptor[] => state.songs,
        activeSong  : ( state: SongState ): EffluxSong => state.activeSong,
        samples     : ( state: SongState ): Sample[] => state.activeSong.samples,
        getSongById : ( state: SongState ) => ( id: string ): StoredEffluxSongDescriptor | null => {
            return state.songs.find(( song: StoredEffluxSongDescriptor ) => song.id === id ) || null;
        },
        hasChanges  : ( state: SongState, getters: any ): boolean => state.statesOnSave < getters.totalSaved,
        jamMode : ( state: SongState ): boolean => state.activeSong?.type === EffluxSongType.JAM,
    },
    mutations: {
        setSongs( state: SongState, songs: EffluxSong[] ): void {
            state.songs = songs;
        },
        setActiveSong( state: SongState, song: EffluxSong ): void {
            if ( song && song.meta && song.patterns ) {
                state.activeSong = song;
                resetPlayState( state.activeSong.patterns ); // ensures saved song hasn't got "frozen" events
            }
        },
        setActiveSongAuthor( state: SongState, author: string ): void {
            state.activeSong.meta.author = author;
        },
        setActiveSongTitle( state: SongState, title: string ): void {
            state.activeSong.meta.title = title;
        },
        setTempo( state: SongState, value: number | string ): void {
            const meta     = state.activeSong.meta;
            const oldTempo = meta.tempo;
            const newTempo = parseFloat( value as string );

            meta.tempo = newTempo;

            // update existing event offsets by the tempo ratio

            updateEventOffsets( state.activeSong.patterns, ( oldTempo / newTempo ));
        },
        setSamples( state: SongState, samples: Sample[] ): void {
            state.activeSong.samples = samples;
        },
        addSample( state: SongState, sample: Sample ): void {
            state.activeSong.samples.push( sample );
        },
        removeSample( state: SongState, sample: Sample ): void {
            const index = state.activeSong.samples.findIndex(({ id }) => id === sample.id );
            state.activeSong.samples.splice( index, 1 );
        },
        flushSamples( state: SongState ): void {
            if ( !state.activeSong ) {
                return;
            }
            state.activeSong.samples.length = 0;
        },
        updateSongSample( state: SongState, sample: Sample ): void {
            const index = state.activeSong.samples.findIndex(({ id }) => id === sample.id );
            Vue.set( state.activeSong.samples, index, sample );
        },
        /**
         * adds given AudioEvent at the currently highlighted position or by optionally defined
         * offsets in optData { patternIndex, channelIndex, step }
         *
         * TODO: can we refactor this to not require us to pass the root store?? (to-Vue-migration leftover)
         */
        // @ts-expect-error 'state' is declared but its value is never read.
        addEventAtPosition( state: SongState, { event, store, optData, optStoreInUndoRedo = true } :
            { event: EffluxAudioEvent, store: Store<EffluxState>, optData?: OptEventData, optStoreInUndoRedo?: boolean }): void {
                const undoRedoAction = addEvent(
                store, event, optData,
                ( optHighlightActiveStep?: boolean ) => {

                    if ( optStoreInUndoRedo && optHighlightActiveStep === true ) {
                        // move to the next step in the pattern (unless executed from undo/redo)
                        const maxStep = store.state.song.activeSong.patterns[ store.getters.activePatternIndex ].steps - 1;
                        const targetStep = store.state.editor.selectedStep + 1;

                        if ( targetStep <= maxStep ) {
                            store.commit( "setSelectedStep", targetStep );
                        }
                        store.commit( "clearSelection" );
                    }
                }
            );
            if ( optStoreInUndoRedo ) {
                store.commit( "saveState", undoRedoAction );
            }
        },
        updateOscillator( state: SongState, { instrumentIndex, oscillatorIndex, prop, value } : { instrumentIndex: number, oscillatorIndex: number, prop: string, value: any }): void {
            Vue.set( state.activeSong.instruments[ instrumentIndex ].oscillators[ oscillatorIndex ], prop, value );
        },
        updateInstrument( state: SongState, { instrumentIndex, prop, value } : { instrumentIndex: number, prop: string, value: any }): void {
            Vue.set( state.activeSong.instruments[ instrumentIndex ], prop, value );
        },
        replaceInstrument( state: SongState, { instrumentIndex, instrument }: { instrumentIndex: number, instrument: Instrument }): void {
            Vue.set( state.activeSong.instruments, instrumentIndex, instrument );
        },
        replacePattern( state: SongState, { patternIndex, pattern }: { patternIndex: number, pattern: EffluxPattern }): void {
            Vue.set( state.activeSong.patterns, patternIndex, pattern );
            cachePatternNames( state.activeSong.patterns );
        },
        replacePatterns( state: SongState, patterns: EffluxPattern[] ): void {
            cachePatternNames( patterns );
            Vue.set( state.activeSong, "patterns", patterns );
        },
        replacePatternOrder( state: SongState, order: EffluxPatternOrder ): void {
            Vue.set( state.activeSong, "order", order );
        },
        cachePatternNames( state: SongState ): void {
            cachePatternNames( state.activeSong.patterns );
        },
        setShowSaveMessage( state: SongState, value: boolean ): void {
            state.showSaveMessage = !!value;
        },
        setStatesOnSave( state: SongState, value: number ): void {
            state.statesOnSave = value;
        },
    },
    actions: {
        loadStoredSongs({ commit, dispatch }: { commit: Commit, dispatch: Dispatch }): void {
            StorageUtil.getItem( Config.LOCAL_STORAGE_SONGS ).then( async result => {
                if ( typeof result === "string" ) {
                    try {
                        const songs = JSON.parse( result );
                        let wasLegacyStorageFormat = false;

                        // if song contained patterns, we know that the storage was using
                        // the legacy format where all songs were serialized in a single list
                        // convert the storage to the new memory-friendly format

                        for ( let i = 0; i < songs.length; ++i ) {
                            if ( typeof songs[ i ] !== "string" ) {
                                break;
                            }
                            const song = JSON.parse( songs[ i ]);
                            if ( Array.isArray( song.p )) {
                                await dispatch( "saveSongInLS", await SongAssemblyService.assemble( song ));
                                wasLegacyStorageFormat = true;
                            }
                        }
                        if ( !wasLegacyStorageFormat ) {
                            commit( "setSongs", songs );
                        }
                    }
                    catch ( e ) {
                        // that's fine...
                    }
                }
            },
            async () => {

                // no songs available ? load fixtures with 'factory content'

                commit( "setLoading", "SNG" );
                try {
                    const songs = await FixturesLoader.load( "fixtures-songs.json" );
                    if ( Array.isArray( songs )) {
                        commit( "setShowSaveMessage", false );
                        for ( let i = 0; i < songs.length; ++i ) {
                            const song = await SongAssemblyService.assemble( songs[ i ]);
                            song.fixture = true; // do not track saves for these
                            await dispatch( "saveSongInLS", song );
                        }
                        commit( "setShowSaveMessage", true );
                    }
                } catch {
                    // non-blocking
                } finally {
                    commit( "unsetLoading", "SNG" );
                }
            });
        },
        // @ts-expect-error 'context' is declared but its value is never read.
        async createSong( context: ActionContext<SongState, any>, type = EffluxSongType.TRACKER ): Promise<EffluxSong> {
            const song = SongFactory.create( Config.INSTRUMENT_AMOUNT, type );
            if ( type === EffluxSongType.JAM ) {
                for ( let i = 1; i < Config.JAM_MODE_PATTERN_AMOUNT; ++i ) {
                    song.patterns.push( PatternFactory.create());
                    song.order.push( i );
                }
            }
            return song;
        },
        openSong({ commit, dispatch }: { commit: Commit, dispatch: Dispatch }, song: EffluxSong ): void {
            commit( "flushSamples" );
            commit( "setActiveSong", song );
            commit( "setSamples", song.samples );
            commit( "setStatesOnSave", 0 );
            commit( "resetJamChannels" );
            dispatch( "cacheSongSamples", song.samples );
        },
        saveSongInLS({ state, getters, commit, dispatch } :
            { state: SongState, getters: any, commit: Commit, dispatch: Dispatch }, song: EffluxSong ): Promise<void> {
            // @ts-expect-error Type 'Promise<unknown>' is not assignable to type 'Promise<void>'
            return new Promise( async ( resolve, reject ): Promise<void> => {
                try {
                    await dispatch( "validateSong", song );
                } catch ( e ) {
                    reject();
                    return;
                }
                // all is well, delete existing song and save
                try {
                    await dispatch( "deleteSongFromLS", { song, persist: false }); // remove duplicate song if existed
                }
                catch ( e ) {
                    // that's fine.
                }
                song.meta.modified = Date.now(); // update timestamp
                song.origin = "local";

                // save song into storage
                try {
                    await StorageUtil.setItem(
                        getStorageKeyForSong( song ),
                        await SongAssemblyService.disassemble( song )
                    );
                    // push song into song list
                    state.songs.push( getDescriptorForSong( song ));
                    persistState( state );
                } catch ( error ) {
                    const msgKey = error?.message === "QUOTA" ? "errors.quotaExceeded" : "errors.unknownLSerror";
                    commit( "openDialog", { type: "error", message: getters.t( msgKey ) });
                    return reject();
                }
                commit( "setStatesOnSave", getters.totalSaved );
                if ( !song.fixture ) {
                    commit( "publishMessage", PubSubMessages.SONG_SAVED );
                }
                if ( state.showSaveMessage ) {
                    commit( "showNotification", { message: getters.t( "messages.songSaved", { name: song.meta.title }) });
                }
                // @ts-expect-error Promise<unknown> not assignable to Promise<void>
                resolve();
            })
            .catch(() => {
                // handled above
            });
        },
        validateSong({ getters, commit }: { getters: any, commit: Commit }, song: EffluxSong ): Promise<void> {
            return new Promise( async ( resolve, reject ): Promise<void> => {
                try {
                    let songHasContent = hasContent( song );
                    if ( !songHasContent ) {
                        throw "emptySong";
                    }
                    if ( song.meta.author.length === 0 || song.meta.title.length === 0 ) {
                        songHasContent = false;
                    }
                    if ( !songHasContent ) {
                        throw "emptyMeta";
                    }
                    resolve();
                } catch ( errorKey ) {
                    commit( "showError", getters.t(`errors.${errorKey}`));
                    reject();
                }
            });
        },
        // @ts-expect-error 'context' is declared but its value is never read.
        loadSongFromLS( context: ActionContext<SongState, any>, song: EffluxSong ): Promise<EffluxSong> {
            return new Promise( async ( resolve, reject ): Promise<void> => {
                const storedSong = await StorageUtil.getItem( getStorageKeyForSong( song ));
                if ( !storedSong ) {
                    reject();
                }
                resolve( await SongAssemblyService.assemble( storedSong ));
            });
        },
        deleteSongFromLS({ state }: { state: SongState }, { song, persist = true }: { song: EffluxSong, persist?: boolean }): Promise<void> {
            return new Promise(( resolve, reject ): void => {
                let deleted = false;
                let i = state.songs.length;

                persist = ( typeof persist === "boolean" ) ? persist : true;

                // remove duplicate song if existed

                while ( i-- ) {
                    const compareSong = state.songs[ i ];
                    if ( compareSong.id === song.id ) {
                        // song existed, name is equal, remove old song so we can fully replace it
                        if ( compareSong.meta.title === song.meta.title ) {
                            // remove entry from song list
                            state.songs.splice( i, 1 );

                            // remove song storage entry
                            StorageUtil.removeItem( getStorageKeyForSong( song ));
                            deleted = true;
                        }
                        else {
                            // song existed, but was renamed, make id unique for renamed song (will be treated as new entry)
                            song.id = `${song.id}b`;
                        }
                        break;
                    }
                }

                if ( deleted ) {
                    if ( persist ) {
                        persistState( state );
                    }
                    resolve();
                } else {
                    reject();
                }
            });
        },
        async importSong({ commit, dispatch }: { commit: Commit, dispatch: Dispatch }, file: File | Blob ): Promise<void> {
            try {
                const song = await dispatch( "loadSong", { file });
                commit( "setShowSaveMessage", false );
                await dispatch( "saveSongInLS", song );
                commit( "publishMessage", PubSubMessages.SONG_IMPORTED );
                commit( "setShowSaveMessage", true );
                commit( "closeModal" );
            } catch ( error ) {
                // loadSong validator error will have communicated error
            }
        },
        async exportSong({ commit }: { commit: Commit }, song: EffluxSong ): Promise<void> {
            saveAsFile( await toXTK( song ), toFileName( song.meta.title ));
            commit( "publishMessage", PubSubMessages.SONG_EXPORTED );
        },
        async exportSongForShare({ dispatch }: { dispatch: Dispatch }, song: EffluxSong ): Promise<string> {
            await dispatch( "validateSong", song );
            return await SongAssemblyService.disassemble( song );
        },
        async openSharedSong({ commit, dispatch }: { commit: Commit, dispatch: Dispatch }, serializedSong: string | any ): Promise<void> {
            const song = await SongAssemblyService.assemble( serializedSong );
            if ( song ) {
                await dispatch( "openSong", song );
                commit( "openModal", ModalWindows.WELCOME_SHARED_SONG );
            }
        },
        async exportSongToDropbox({ commit, getters }: { commit: Commit, getters: any },
            { song, folder } : { song: EffluxSong, folder: string }): Promise<void> {
            const blob = await toXTK( song );
            const name = toFileName( song.meta.title );
            await uploadBlob( blob, folder, name );
            song.origin = "dropbox";
            commit( "setStatesOnSave", getters.totalSaved );
            commit( "showNotification", { message: getters.t( "messages.fileSavedInDropbox", { file: name }) });
        },
        loadSong({ getters, commit, dispatch }: { getters: any, commit: Commit, dispatch: Dispatch },
            { file, origin = "local" }: { file: string, origin?: EffluxSongOrigin }): Promise<EffluxSong> {
            commit( "setPlaying", false );
            return new Promise( async ( resolve, reject ): Promise<void> => {
                commit( "setLoading", "SMLS" );
                const song = SongValidator.transformLegacy( await parseXTK( file ));
                if ( SongValidator.isValid( song )) {
                    song.origin = origin;
                    dispatch( "openSong", song );
                    resolve( song );
                } else {
                    commit( "showError", getters.t( "errors.songImport", { extension: PROJECT_FILE_EXTENSION }));
                    reject();
                }
                commit( "unsetLoading", "SMLS" );
            });
        },
        async saveSong({ commit, dispatch }: { commit: Commit, dispatch: Dispatch }, song: EffluxSong ): Promise<void> {
            await dispatch( "validateSong", song );
            song.version = FACTORY_VERSION;
            if ( song.origin === "dropbox" ) {
                commit( "setLoading", "dbxS" );
                await dispatch( "exportSongToDropbox", { song, folder: getCurrentFolder() });
                commit( "unsetLoading", "dbxS" );
            } else {
                await dispatch( "saveSongInLS", song );
            }
        },
        resetSong({ getters, commit }: { getters: any, commit: Commit }): void {
            commit( "openDialog", {
                type: "confirm",
                message: getters.t( "warnings.songReset" ),
                confirm: () => {
                    commit( "openModal", ModalWindows.SONG_CREATION_WINDOW );
                },
            });
        },
    }
};
export default SongModule;

/* internal methods */

const getDescriptorForSong = ( song: EffluxSong ): StoredEffluxSongDescriptor => ({
    id: song.id,
    type: song.type,
    meta: { ...song.meta }
});

const persistState = ( state: SongState ): Promise<void> => StorageUtil.setItem( Config.LOCAL_STORAGE_SONGS, JSON.stringify( state.songs ));

const cachePatternNames = ( patterns: EffluxPattern[] ): void => {
    patterns.forEach(( pattern: EffluxPattern, patternIndex: number ) => {
        pattern.name = indexToName( patternIndex );
    });
};
