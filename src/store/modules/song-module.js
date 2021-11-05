/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2021 - https://www.igorski.nl
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
import Vue from "vue";
import Config from "@/config";
import { PROJECT_FILE_EXTENSION } from "@/definitions/file-types";
import SongFactory         from "@/model/factories/song-factory";
import createAction        from "@/model/factories/action-factory";
import Actions             from "@/definitions/actions";
import { uploadBlob }      from "@/services/dropbox-service";
import FixturesLoader      from "@/services/fixtures-loader";
import SongAssemblyService from "@/services/song-assembly-service";
import PubSubMessages      from "@/services/pubsub/messages";
import SongValidator       from "@/model/validators/song-validator";
import { clone }           from "@/utils/object-util";
import StorageUtil         from "@/utils/storage-util";
import { saveAsFile }      from "@/utils/file-util";
import { toFileName }      from "@/utils/string-util";
import { parseXTK, toXTK } from "@/utils/xtk-util";
import { hasContent, resetPlayState, updateEventOffsets } from "@/utils/song-util";

const SONG_STORAGE_KEY = "Efflux_Song_";

export default {
    state: {
        songs: [], /** @type {Array<Object>} */
        activeSong: null,
        showSaveMessage: true
    },
    getters: {
        activeSong(state) {
            return state.activeSong;
        },
        songs(state) {
            return state.songs;
        },
        getSongById: state => id => state.songs.find(song => song.id === id) || null
    },
    mutations: {
        setSongs(state, songs) {
            state.songs = songs;
        },
        setActiveSong(state, song) {
            if (song && song.meta && song.patterns) {
                // close song as we do not want to modify the original song stored in list
                state.activeSong = clone(song);
                resetPlayState(state.activeSong.patterns); // ensures saved song hasn't got 'frozen' events
            }
        },
        setActiveSongAuthor(state, author) {
            state.activeSong.meta.author = author;
        },
        setActiveSongTitle(state, title) {
            state.activeSong.meta.title = title;
        },
        setTempo(state, value) {
            const meta     = state.activeSong.meta;
            const oldTempo = meta.tempo;
            const newTempo = parseFloat(value);

            meta.tempo = newTempo;

            // update existing event offsets by the tempo ratio

            updateEventOffsets( state.activeSong.patterns, ( oldTempo / newTempo ));
        },
        /**
         * adds given AudioEvent at the currently highlighted position or by optionally defined
         * offsets in optData { patternIndex, channelIndex, step }
         *
         * TODO: can we refactor this to not require us to pass the root store?? (to-Vue-migration leftover)
         */
        addEventAtPosition(state, { event, store, optData, optStoreInUndoRedo = true }) {
            const undoRedoAction = createAction( Actions.ADD_EVENT, {
                store,
                event,
                optEventData:  optData,
                updateHandler: optHighlightActiveStep => {

                    if ( optStoreInUndoRedo && optHighlightActiveStep === true ) {
                        // move to the next step in the pattern (unless executed from undo/redo)
                        const maxStep = store.state.song.activeSong.patterns[store.state.sequencer.activePattern].steps - 1;
                        const targetStep = store.state.editor.selectedStep + 1;

                        if (targetStep <= maxStep)
                            store.commit('setSelectedStep', targetStep);

                        store.commit('clearSelection');
                    }
                }
            });
            if ( optStoreInUndoRedo ) store.commit('saveState', undoRedoAction );
        },
        updateOscillator(state, { instrumentIndex, oscillatorIndex, prop, value }) {
            Vue.set(state.activeSong.instruments[instrumentIndex].oscillators[oscillatorIndex], prop, value);
        },
        updateInstrument(state, { instrumentIndex, prop, value }) {
            Vue.set(state.activeSong.instruments[instrumentIndex], prop, value);
        },
        replaceInstrument(state, { instrumentIndex, instrument }) {
            Vue.set(state.activeSong.instruments, instrumentIndex, instrument);
        },
        replacePattern(state, { patternIndex, pattern }) {
            Vue.set(state.activeSong.patterns, patternIndex, pattern);
        },
        replacePatterns(state, patterns) {
            Vue.set(state.activeSong, 'patterns', patterns);
        },
        setShowSaveMessage(state, value) {
            state.showSaveMessage = !!value;
        }
    },
    actions: {
        loadStoredSongs({ commit, dispatch }) {
            StorageUtil.getItem( Config.LOCAL_STORAGE_SONGS ).then( async result => {
                if ( typeof result === "string" ) {
                    try {
                        const songs = JSON.parse( result );
                        let wasLegacyStorageFormat = false;

                        // if song contained patterns, we know that the storage was using
                        // the legacy format where all songs were serialized in a single list
                        // convert the storage to the new memory-friendly format

                        for (let i = 0; i < songs.length; ++i) {
                            if (typeof songs[i] !== 'string') {
                                break;
                            }
                            const song = JSON.parse( songs[ i ]);
                            if ( Array.isArray( song.p )) {
                                await dispatch( "saveSongInLS", SongAssemblyService.assemble( song ));
                                wasLegacyStorageFormat = true;
                            }
                        }
                        if ( !wasLegacyStorageFormat ) {
                            commit( "setSongs", songs);
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
                const songs = await FixturesLoader.load( "Songs.json" );
                commit( "unsetLoading", "SNG" );
                if ( Array.isArray( songs )) {
                    commit( "setShowSaveMessage", false );
                    for ( let i = 0; i < songs.length; ++i ) {
                        await dispatch( "saveSongInLS", SongAssemblyService.assemble( songs[ i ]));
                    }
                    commit( "setShowSaveMessage", true );
                }
            });
        },
        createSong() {
            return new Promise( resolve => {
                resolve( SongFactory.createSong( Config.INSTRUMENT_AMOUNT ));
            });
        },
        saveSongInLS({ state, getters, commit, dispatch }, song) {
            return new Promise( async ( resolve, reject ) => {
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

                // push song into song list
                state.songs.push( getMetaForSong( song ));
                persistState( state );

                // save song into storage
                StorageUtil.setItem( getStorageKeyForSong( song ), SongAssemblyService.disassemble( song ));

                commit( "publishMessage", PubSubMessages.SONG_SAVED );
                if ( state.showSaveMessage ) {
                    commit( "showNotification", { message: getters.t( "messages.songSaved", { name: song.meta.title }) });
                }
                resolve();
            })
            .catch(() => {
                // handled above
            });
        },
        validateSong({ getters, commit }, song ) {
            return new Promise( async ( resolve, reject ) => {
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
                    commit( "showError", getters.t(`error.${errorKey}`));
                    reject();
                }
            });
        },
        loadSongFromLS( store, song ) {
            return new Promise( async ( resolve, reject ) => {
                const storedSong = await StorageUtil.getItem( getStorageKeyForSong( song ));
                if ( !storedSong ) {
                    reject();
                }
                resolve( SongAssemblyService.assemble( storedSong ));
            });
        },
        deleteSongFromLS({ state }, { song, persist = true }) {
            return new Promise(( resolve, reject ) => {
                let deleted = false;
                let i = state.songs.length;

                persist = ( typeof persist === 'boolean' ) ? persist : true;

                // remove duplicate song if existed

                while ( i-- ) {
                    const compareSong = state.songs[ i ];
                    if ( compareSong.id === song.id ) {
                        // song existed, name is equal, remove old song so we can fully replace it
                        if ( compareSong.meta.title === song.meta.title ) {
                            // remove entry from song list
                            state.songs.splice( i, 1 );

                            // remove song storage entry
                            StorageUtil.removeItem(getStorageKeyForSong(song));
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
                    if (persist)
                        persistState(state);

                    resolve();
                } else {
                    reject();
                }
            });
        },
        async importSong({ commit, dispatch }, file ) {
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
        async exportSong({ commit }, song ) {
            saveAsFile( await toXTK( song ), toFileName( song.meta.title ));
            commit( "publishMessage", PubSubMessages.SONG_EXPORTED );
        },
        async exportSongToDropbox({ commit, getters }, song ) {
            const blob = await toXTK( song );
            const name = toFileName( song.meta.title );
            await uploadBlob( blob, name );
            song.origin = "dropbox";
            commit( "showNotification", { message: getters.t( "messages.fileSavedInDropbox", { file: name }) });
        },
        loadSong({ getters, commit }, { file, origin = "local" }) {
            return new Promise( async ( resolve, reject ) => {
                const song = await parseXTK( file );
                if ( SongValidator.isValid( song )) {
                    song.origin = origin;
                    commit( "setActiveSong", song );
                    resolve( song );
                }
                else {
                    commit( "showError", getters.t( "error.songImport", { extension: PROJECT_FILE_EXTENSION }));
                    reject();
                }
            });
        },
        async saveSong({ dispatch }, song ) {
            await dispatch( "validateSong", song );
            if ( song.origin === "dropbox" ) {
                await dispatch( "exportSongToDropbox", song );
            } else {
                await dispatch( "saveSongInLS", song );
            }
        }
    }
};

/* internal methods */

const getMetaForSong = song => ({
    id: song.id,
    meta: { ...song.meta }
});

const getStorageKeyForSong = song => `${SONG_STORAGE_KEY}${song.id}`;
const persistState = state => StorageUtil.setItem( Config.LOCAL_STORAGE_SONGS, JSON.stringify( state.songs ));
