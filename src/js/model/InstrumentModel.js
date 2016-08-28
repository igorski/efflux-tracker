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
const FixturesLoader      = require( "../services/FixturesLoader" );
const StorageUtil         = require( "../utils/StorageUtil" );
const InstrumentValidator = require( "./validators/InstrumentValidator" );

module.exports = InstrumentModel;

function InstrumentModel()
{
    StorageUtil.init();

    /* instance properties */

    /**
     * @private
     * @type {Array.<Object>}
     */
    this._instruments = [];
}

/* public methods */

/**
 * @public
 */
InstrumentModel.prototype.init = function()
{
    /* upon initialization, get all locally stored instruments */
    const self = this;
    StorageUtil.getItem( Config.LOCAL_STORAGE_INSTRUMENTS ).then(
        ( result ) => {

            if ( typeof result === "string" ) {

                try {
                    self.setInstruments( JSON.parse( result ));
                }
                catch ( e ) {}
            }
        },
        ( error ) => {

            // no instruments available ? load fixtures with "factory content"

            FixturesLoader.load(( instruments ) => {

                self.setInstruments( instruments );
                self.persist();

            }, "Instruments.js");
        }
    );
};

/**
 * get all instruments stored in the model
 *
 * @public
 * @return {Array.<Object>}
 */
InstrumentModel.prototype.getInstruments = function()
{
    return this._instruments;
};

/**
 * @public
 * @param {Array.<Object>} instruments
 */
InstrumentModel.prototype.setInstruments = function( instruments )
{
    this._instruments = instruments;
};

/**
 * get an instrument from the model by its name
 *
 * @param {string} presetName
 * @return {Object}
 */
InstrumentModel.prototype.getInstrumentByPresetName = function( presetName )
{
    let i = this._instruments.length, instrument;

    while ( i-- )
    {
        instrument = this._instruments[ i ];

        if ( instrument.presetName === presetName )
            return instrument;
    }
    return null;
};

/**
 * save given instrument into the model
 *
 * @public
 * @param {Object} aInstrument
 * @return {boolean}
 */
InstrumentModel.prototype.saveInstrument = function( aInstrument )
{
    if ( InstrumentValidator.isValid( aInstrument ) &&
       ( typeof aInstrument.presetName === "string" && aInstrument.presetName.length > 0 )) {

        this.deleteInstrument( aInstrument, false ); // remove duplicate instrument if existed
        this._instruments.push( aInstrument );
        this.persist();
        return true;
    }
    return false;
};

/**
 * delete given instrument from the model
 *
 * @public
 * @param {Object} aInstrument
 * @param {boolean=} aPersist optional, whether to persist changes (defaults to true)
 *                   can be false if subsequent model operations will occur (prevents
 *                   unnecessary duplicate processing)
 *
 * @return {boolean} whether instrument was deleted
 */
InstrumentModel.prototype.deleteInstrument = function( aInstrument, aPersist )
{
    let deleted = false;
    let i = this._instruments.length, instrument;

    aPersist = ( typeof aPersist === "boolean" ) ? aPersist : true;

    // remove duplicate instrument if existed

    while ( i-- )
    {
        instrument = this._instruments[ i ];

        if ( instrument.presetName === aInstrument.presetName )
        {
            // instrument existed, name is equal, remove old instrument so we can replace it
            this._instruments.splice( i, 1 );
            deleted = true;
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
InstrumentModel.prototype.persist = function()
{
    StorageUtil.setItem( Config.LOCAL_STORAGE_INSTRUMENTS, JSON.stringify( this._instruments ));
};
