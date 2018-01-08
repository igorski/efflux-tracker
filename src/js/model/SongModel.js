/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016 - http://www.igorski.nl
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
"use strict";

const Config              = require( "../config/Config" );
const SongFactory         = require( "../model/factory/SongFactory" );
const FixturesLoader      = require( "../services/FixturesLoader" );
const SongAssemblyService = require( "../services/SongAssemblyService" );
const StorageUtil         = require( "../utils/StorageUtil" );

module.exports = SongModel;

function SongModel()
{
    StorageUtil.init();

    /* instance properties */

    /**
     * @private
     * @type {Array.<Object>}
     */
    this._songs = [];
}

/* public methods */

/**
 * @public
 */
SongModel.prototype.init = function()
{
    /* upon initialization, get all locally stored songs */
    const self = this;
    StorageUtil.getItem( Config.LOCAL_STORAGE_SONGS ).then(
        ( result ) => {

            if ( typeof result === "string" ) {

                try {
                    self.setSongs( JSON.parse( result ));
                }
                catch ( e ) {}
            }
        },
        ( error ) => {

            // no songs available ? load fixtures with "factory content"

            FixturesLoader.load(( songs ) => {

                self.setSongs( songs );
                self.persist();

            }, "Songs.json" );
        }
    );
};

/**
 * get all songs stored in the model
 *
 * @public
 * @return {Array.<Object>}
 */
SongModel.prototype.getSongs = function()
{
    return this._songs;
};

/**
 * @public
 * @param {Object} xtkSongs (in XTK format)
 */
SongModel.prototype.setSongs = function( xtkSongs )
{
    // convert XTK songs into Song Objects
    const songs = new Array( xtkSongs.length );
    xtkSongs.forEach( function( xtk, index ) {
        songs[ index ] = SongAssemblyService.assemble( xtk );
    });
    this._songs = songs;
};

/**
 * get a song from the model by its unique identifier
 *
 * @param {string} id
 * @return {Object}
 */
SongModel.prototype.getSongById = function( id )
{
    let i = this._songs.length, song;

    while ( i-- )
    {
        song = this._songs[ i ];

        if ( song.id === id )
            return song;
    }
    return null;
};

/**
 * create the outline of a new song with default
 * parameters
 *
 * @public
 * @return {Object}
 */
SongModel.prototype.createSong = function()
{
    return SongFactory.createSong( Config.INSTRUMENT_AMOUNT );
};

/**
 * save given song into the model
 *
 * @public
 * @param {Object} aSong
 */
SongModel.prototype.saveSong = function( aSong )
{
    this.deleteSong( aSong, false );  // remove duplicate song if existed
    aSong.meta.modified = Date.now(); // update timestamp
    this._songs.push( aSong );
    this.persist();
};

/**
 * delete given song from the model
 *
 * @public
 * @param {Object} aSong
 * @param {boolean=} aPersist optional, whether to persist changes (defaults to true)
 *                   can be false if subsequent model operations will occur (prevents
 *                   unnecessary duplicate assembly which is an expensive process)
 *
 * @return {boolean} whether song was deleted
 */
SongModel.prototype.deleteSong = function( aSong, aPersist )
{
    let deleted = false;
    let i = this._songs.length, song;

    aPersist = ( typeof aPersist === "boolean" ) ? aPersist : true;

    // remove duplicate song if existed

    while ( i-- )
    {
        song = this._songs[ i ];

        if ( song.id === aSong.id )
        {
            if ( song.meta.title === aSong.meta.title )
            {
                // song existed, name is equal, remove old song so we can fully replace it
                this._songs.splice( i, 1 );
                deleted = true;
            }
            else {
                // song existed, but was renamed, make id unique for renamed song (will be treated as new entry)
                aSong.id += "b";
            }
            break;
        }
    }

    if ( deleted && aPersist )
        this.persist();

    return deleted;
};

/* private methods */

/**
 * save the state of the model in local storage
 *
 * @private
 */
SongModel.prototype.persist = function()
{
    // convert all Songs into XTK format (uses less storage)
    const xtkSongs = new Array( this._songs.length );
    this._songs.forEach( function( song, index ) {
        xtkSongs[ index ] = SongAssemblyService.disassemble( song );
    });
    StorageUtil.setItem( Config.LOCAL_STORAGE_SONGS, JSON.stringify( xtkSongs ));
};
