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
import Config              from '../../config/Config';
import SongFactory         from '../../model/factory/SongFactory';
import FixturesLoader      from '../../services/FixturesLoader';
import SongAssemblyService from '../../services/SongAssemblyService';
import StorageUtil         from '../../utils/StorageUtil';

/* internal methods */

const persistState = state => {
    // convert all Songs into XTK format (uses less storage)
    const xtkSongs = new Array( state.songs.length );
    state.songs.forEach( function( song, index ) {
        xtkSongs[ index ] = SongAssemblyService.disassemble( song );
    });
    StorageUtil.setItem( Config.LOCAL_STORAGE_SONGS, JSON.stringify( xtkSongs ));
};

export default {
    state: {
        /**
         * @type {Array.<Object>}
         */
        songs: [],
        activeSong: null
    },
    getters: {
        getSongs(state) {
            return state.songs;
        },
        getSongById: state => id => state.songs.find(song => song.id === id) || null
    },
    mutations: {
        /**
         * @param {Object} state
         * @param {Object} xtkSongs (in XTK format)
         */
        setSongs(state, xtkSongs) {
            // convert XTK songs into Song Objects
            const songs = new Array( xtkSongs.length );
            xtkSongs.forEach(( xtk, index ) => {
                songs[ index ] = SongAssemblyService.assemble( xtk );
            });
            state.songs = songs;
        },
        setActiveSong(state, song) {
            state.activeSong = song;
        }
    },
    actions: {
        loadStoredSongs({ state, commit }) {
            StorageUtil.getItem( Config.LOCAL_STORAGEsongs ).then(
                ( result ) => {
                    if ( typeof result === "string" ) {
                        try {
                            commit('setSongs', JSON.parse( result ));
                        }
                        catch ( e ) {}
                    }
                },
                ( error ) => {

                    // no songs available ? load fixtures with "factory content"

                    FixturesLoader.load(( songs ) => {

                        commit('setSongs', songs );
                        persist(state);

                    }, "Songs.json" );
                }
            );
        },
        createSong() {
            return new Promise(resolve => {
                resolve(SongFactory.createSong( Config.INSTRUMENT_AMOUNT ));
            });
        },
        saveSong({ state, dispatch }, song ) {
            return new Promise(resolve => {
                dispatch('deleteSong', { song, persist: false }); // remove duplicate song if existed
                song.meta.modified = Date.now();    // update timestamp
                state.songs.push( song );
                persistState(state);
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
        }
    }
};
