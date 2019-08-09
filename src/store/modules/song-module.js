/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2019 - https://www.igorski.nl
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
import Vue                 from 'vue';
import Config              from '../../config';
import SongFactory         from '../../model/factory/song-factory';
import HistoryStateFactory from '../../model/factory/history-state-factory';
import HistoryStates       from '../../definitions/history-states';
import FixturesLoader      from '../../services/fixtures-loader';
import SongAssemblyService from '../../services/song-assembly-service';
import PubSubMessages      from '../../services/pubsub/messages';
import SongValidator       from '../../model/validators/song-validator';
import SongUtil            from '../../utils/song-util';
import ObjectUtil          from '../../utils/object-util';
import StorageUtil         from '../../utils/storage-util';

/* internal methods */

const persistState = state => {
    // convert all Songs into XTK format (uses less storage)
    const xtkSongs = new Array( state.songs.length );
    state.songs.forEach(( song, index ) => {
        xtkSongs[ index ] = SongAssemblyService.disassemble( song );
    });
    StorageUtil.setItem( Config.LOCAL_STORAGE_SONGS, JSON.stringify( xtkSongs ));
};

export default {
    state: {
        songs: [], /** @type {Array.<Object>} */
        activeSong: null
    },
    getters: {
        activeSong(state) {
            return state.activeSong;
        },
        songs(state) {
            return state.songs;
        },
        getSongById: state => id => state.songs.find(song => song.id === id) || null,
    },
    mutations: {
        /**
         * @param {Object} state
         * @param {Object} xtkSongs (in XTK format)
         */
        setSongs(state, xtkSongs) {
            // convert XTK songs into Song Objects
            const songs = new Array(xtkSongs.length);
            xtkSongs.forEach((xtk, index) => {
                songs[index] = SongAssemblyService.assemble(xtk);
            });
            state.songs = songs;
        },
        setActiveSong(state, song) {
            if (song && song.meta && song.patterns) {
                // close song as we do not want to modify the original song stored in list
                state.activeSong = ObjectUtil.clone(song);
                SongUtil.resetPlayState(state.activeSong.patterns); // ensures saved song hasn't got "frozen" events
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
        }
    },
    actions: {
        loadStoredSongs({ state, commit }) {
            StorageUtil.getItem( Config.LOCAL_STORAGE_SONGS ).then(
                ( result ) => {
                    if ( typeof result === "string" ) {
                        try {
                            commit('setSongs', JSON.parse( result ));
                        }
                        catch ( e ) {
                            // that's fine...
                        }
                    }
                },
                async () => {

                    // no songs available ? load fixtures with "factory content"

                    commit('setLoading', true);
                    const songs = await FixturesLoader.load('Songs.json');
                    commit('setLoading', false);
                    if (Array.isArray(songs)) {
                        commit('setSongs', songs);
                        persistState(state);
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
                song.meta.modified = Date.now();    // update timestamp
                state.songs.push(song);
                persistState(state);
                commit('publishMessage', PubSubMessages.SONG_SAVED);
                commit('showNotification', { message: getters.getCopy('SONG_SAVED', song.meta.title) });
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
                        throw 'ERROR_EMPTY_SONG';
                    }
                    if (song.meta.author.length === 0 || song.meta.title.length === 0) {
                        hasContent = false;
                    }
                    if (!hasContent) {
                        throw 'ERROR_NO_META';
                    }
                    resolve();
                } catch(errorKey) {
                    commit('showError', getters.getCopy(errorKey));
                    reject();
                }
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
                        if ( compareSong.meta.title === song.meta.title ) {
                            // song existed, name is equal, remove old song so we can fully replace it
                            state.songs.splice( i, 1 );
                            deleted = true;
                        }
                        else {
                            // song existed, but was renamed, make id unique for renamed song (will be treated as new entry)
                            song.id += "b";
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
                        reject(getters.getCopy('ERROR_FILE_LOAD'));
                    };

                    reader.onload = async readerEvent => {
                        const fileData = readerEvent.target.result;
                        const song     = SongAssemblyService.assemble(window.atob(fileData));

                        // rudimentary check if we're dealing with a valid song

                        if (SongValidator.isValid(song)) {
                            await dispatch('saveSong', song);
                            commit('setActiveSong', song);
                            commit('publishMessage', PubSubMessages.SONG_IMPORTED);
                            resolve();
                        }
                        else {
                            reject(getters.getCopy('ERROR_SONG_IMPORT'));
                        }
                    };
                    // start reading file contents
                    reader.readAsText(fileBrowserEvent.target.files[0]);
                });
            });
        },
        exportSong({ commit }, song) {
            return new Promise(resolve => {
                const base64encodedSong = window.btoa(SongAssemblyService.disassemble(song));

                // download file to disk

                const pom = document.createElement('a');
                pom.setAttribute('href', `data:application/json;charset=utf-8,${encodeURIComponent(base64encodedSong)}`);
                pom.setAttribute('target', '_blank' ); // helps for Safari (opens content in window...)
                pom.setAttribute('download', `${song.meta.title}${Config.SONG_FILE_EXTENSION}` );
                pom.click();

                commit('publishMessage', PubSubMessages.SONG_EXPORTED);

                resolve();
            });
        }
    }
};
