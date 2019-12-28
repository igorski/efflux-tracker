/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2019 - https://www.igorski.nl
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
import Vue                 from 'vue';
import Config              from '@/config';
import SongFactory         from '@/model/factory/song-factory';
import HistoryStateFactory from '@/model/factory/history-state-factory';
import HistoryStates       from '@/definitions/history-states';
import FixturesLoader      from '@/services/fixtures-loader';
import SongAssemblyService from '@/services/song-assembly-service';
import PubSubMessages      from '@/services/pubsub/messages';
import SongValidator       from '@/model/validators/song-validator';
import SongUtil            from '@/utils/song-util';
import ObjectUtil          from '@/utils/object-util';
import StorageUtil         from '@/utils/storage-util';

const SONG_STORAGE_KEY = 'Efflux_Song_';

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
                state.activeSong = ObjectUtil.clone(song);
                SongUtil.resetPlayState(state.activeSong.patterns); // ensures saved song hasn't got 'frozen' events
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

            SongUtil.updateEventOffsets( state.activeSong.patterns, ( oldTempo / newTempo ));
        },
        /**
         * adds given AudioEvent at the currently highlighted position or by optionally defined
         * offsets in optData { patternIndex, channelIndex, step }
         *
         * TODO: can we refactor this to not require us to pass the store?? (to-Vue-migration leftover)
         */
        addEventAtPosition(state, { event, store, optData, optStoreInUndoRedo = true }) {
            const undoRedoAction = HistoryStateFactory.getAction( HistoryStates.ADD_EVENT, {
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
            if ( optStoreInUndoRedo )
                store.commit('saveState', undoRedoAction );
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
            StorageUtil.getItem( Config.LOCAL_STORAGE_SONGS ).then(async result => {
                    if ( typeof result === 'string' ) {
                        try {
                            const songs = JSON.parse(result);
                            let wasLegacyStorageFormat = false;

                            // if song contained patterns, we know that the storage was using
                            // the legacy format where all songs were serialized in a single list
                            // convert the storage to the new memory-friendly format

                            for (let i = 0; i < songs.length; ++i) {
                                if (typeof songs[i] !== 'string') {
                                    break;
                                }
                                const song = JSON.parse(songs[i]);
                                if (Array.isArray(song.p)) {
                                    await dispatch('saveSong', SongAssemblyService.assemble(song));
                                    wasLegacyStorageFormat = true;
                                }
                            }
                            if (!wasLegacyStorageFormat) {
                                commit('setSongs', songs);
                            }
                        }
                        catch ( e ) {
                            // that's fine...
                        }
                    }
                },
                async () => {

                    // no songs available ? load fixtures with 'factory content'

                    commit('setLoading', true);
                    const songs = await FixturesLoader.load('Songs.json');
                    commit('setLoading', false);
                    if (Array.isArray(songs)) {
                        commit('setShowSaveMessage', false);
                        for (let i = 0; i < songs.length; ++i) {
                            await dispatch('saveSong', SongAssemblyService.assemble(songs[i]));
                        }
                        commit('setShowSaveMessage', true);
                    }
                }
            );
        },
        createSong() {
            return new Promise(resolve => {
                resolve(SongFactory.createSong( Config.INSTRUMENT_AMOUNT ));
            });
        },
        saveSong({ state, getters, commit, dispatch }, song) {
            return new Promise(async (resolve, reject) => {
                try {
                    await dispatch('validateSong', song);
                } catch(e) {
                    reject();
                    return;
                }
                // all is well, delete existing song and save
                try {
                    await dispatch('deleteSong', { song, persist: false }); // remove duplicate song if existed
                }
                catch(e) {
                    // that's fine.
                }
                song.meta.modified = Date.now(); // update timestamp

                // push song into song list
                state.songs.push(getMetaForSong(song));
                persistState(state);

                // save song into storage
                StorageUtil.setItem(getStorageKeyForSong(song), SongAssemblyService.disassemble(song));

                commit('publishMessage', PubSubMessages.SONG_SAVED);
                if (state.showSaveMessage) {
                    commit('showNotification', { message: getters.t('messages.songSaved', { name: song.meta.title }) });
                }
                resolve();
            })
            .catch(() => {
                // handled above
            });
        },
        validateSong({ getters, commit }, song) {
            return new Promise(async (resolve, reject) => {
                try {
                    let hasContent = SongUtil.hasContent(song);
                    if ( !hasContent ) {
                        throw 'emptySong';
                    }
                    if (song.meta.author.length === 0 || song.meta.title.length === 0) {
                        hasContent = false;
                    }
                    if (!hasContent) {
                        throw 'emptyMeta';
                    }
                    resolve();
                } catch(errorKey) {
                    commit('showError', getters.t(`error.${errorKey}`));
                    reject();
                }
            });
        },
        loadSong(store, song) {
            return new Promise(async (resolve, reject) => {
                const storedSong = await StorageUtil.getItem(getStorageKeyForSong(song));
                if (!storedSong) {
                    reject();
                }
                resolve(SongAssemblyService.assemble(storedSong));
            });
        },
        deleteSong({ state }, { song, persist = true }) {
            return new Promise((resolve, reject) => {
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
        importSong({ commit, dispatch, getters }) {
            // inline handler to overcome blocking of the file select popup by the browser

            const fileBrowser = document.createElement('input');
            fileBrowser.setAttribute('type',   'file');
            fileBrowser.setAttribute('accept', Config.SONG_FILE_EXTENSION);

            const simulatedEvent = document.createEvent('MouseEvent');
            simulatedEvent.initMouseEvent(
                'click', true, true, window, 1,
                 0, 0, 0, 0, false,
                 false, false, false, 0, null
            );
            fileBrowser.dispatchEvent(simulatedEvent);

            return new Promise((resolve, reject) => {
                fileBrowser.addEventListener('change', fileBrowserEvent => {
                    const reader = new FileReader();

                    reader.onerror = () => {
                        reject(getters.t('error.fileLoad'));
                    };

                    reader.onload = async readerEvent => {
                        const fileData = readerEvent.target.result;
                        let songData;

                        try {
                            // legacy songs were base64 encoded
                            // attempt decode for backwards compatibility
                            songData = window.atob(fileData);
                        } catch (e) {
                            // assume new song in Stringified JSON format
                            songData = fileData;
                            console.warn('kut');
                        }
                        const song = SongAssemblyService.assemble(songData);

                        // rudimentary check if we're dealing with a valid song

                        if (SongValidator.isValid(song)) {
                            commit('setShowSaveMessage', false);
                            await dispatch('saveSong', song);
                            commit('setActiveSong', song);
                            commit('publishMessage', PubSubMessages.SONG_IMPORTED);
                            commit('setShowSaveMessage', true);
                            resolve();
                        }
                        else {
                            reject(getters.t('error.songImport', { extension: Config.SONG_FILE_EXTENSION }));
                        }
                    };
                    // start reading file contents
                    reader.readAsText(fileBrowserEvent.target.files[0]);
                });
            });
        },
        exportSong({ commit }, song) {
            return new Promise(resolve => {
                const songData = SongAssemblyService.disassemble(song);

                // download file to disk

                const pom = document.createElement('a');
                pom.setAttribute('href', `data:application/json;charset=utf-8,${encodeURIComponent(songData)}`);
                pom.setAttribute('target', '_blank' ); // helps for Safari (opens content in window...)
                pom.setAttribute('download', `${song.meta.title}${Config.SONG_FILE_EXTENSION}` );
                pom.click();

                commit('publishMessage', PubSubMessages.SONG_EXPORTED);

                resolve();
            });
        }
    }
};

/* internal methods */

const getMetaForSong = song => ({
    id: song.id,
    meta: { ...song.meta }
});

const getStorageKeyForSong = song => `${SONG_STORAGE_KEY}${song.id}`;
const persistState = state => StorageUtil.setItem( Config.LOCAL_STORAGE_SONGS, JSON.stringify(state.songs));
