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
module.exports = SongModel;

function SongModel()
{
    /* instance properties */

    /**
     * @private
     * @type {Array.<Object>}
     */
    this._songs = [];

    /* upon initialization, get all locally stored songs */

    var songs = window.localStorage.getItem( 'songs' );

    if ( typeof songs === "string" )
    {
        try {
            this._songs = JSON.parse( songs );
        }
        catch ( e ) {}
    }
}

/* public methods */

/**
 * @public
 * @return {Array.<Object>}
 */
SongModel.prototype.getSongs = function()
{
    return this._songs;
};

/**
 * @public
 * @param {Object} aSong
 */
SongModel.prototype.addSong = function( aSong )
{
    // remove duplicate song if existed
    this.deleteSong( aSong );
    this._songs.push( aSong );

    this.persist();
};

/**
 * @public
 * @param {Object} aSong
 *
 * @return {boolean} whether song was deleted
 */
SongModel.prototype.deleteSong = function( aSong )
{
    var deleted = false;
    var i = this._songs.length;

    // remove duplicate song if existed

    while ( i-- )
    {
        if ( this._songs[ i ].id === aSong.id ) {
            this._songs.splice( i, 1 );
            deleted = true;
            break;
        }
    }

    if ( deleted )
        this.persist();

    return deleted;
};

/* private methods */

/**
 * @private
 */
SongModel.prototype.persist = function(  )
{
    window.localStorage.setItem( 'songs', JSON.stringify( this._songs ));
};
