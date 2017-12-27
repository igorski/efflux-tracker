/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2017 - http://www.igorski.nl
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

const Config      = require( "../config/Config" );
const StorageUtil = require( "../utils/StorageUtil" );

module.exports = SettingsModel;

function SettingsModel()
{
    StorageUtil.init();

    /* instance properties */

    /**
     * @private
     * @type {Object}
     */
    this._settings = {};
}

/* static properties */

/**
 * @enum {string}
 */
SettingsModel.PROPERTIES = {
    INPUT_FORMAT    : "if",
    FOLLOW_PLAYBACK : "fp"
};

/* public methods */

/**
 * @public
 */
SettingsModel.prototype.init = function()
{
    /* upon initialization, get all locally stored settings */
    const self = this;
    StorageUtil.getItem( Config.LOCAL_STORAGE_SETTINGS ).then(
        ( result ) => {

            if ( typeof result === "string" ) {

                try {
                    self._settings = JSON.parse( result );
                }
                catch ( e ) {}
            }
        },
        ( error ) => {
            // no settings available yet, that is fine.
        }
    );
};

/**
 * retrieve a setting from the model
 *
 * @public
 * @param {string} aName
 * @return {*|null}
 */
SettingsModel.prototype.getSetting = function( aName )
{
    if ( this._settings.hasOwnProperty( aName )) {
        return this._settings[ aName ];
    }
    return null;
};

/**
 * save/update given setting into the model
 *
 * @public
 * @param {string} aName
 * @param {Object} aSetting
 * @return {boolean}
 */
SettingsModel.prototype.saveSetting = function( aName, aSetting )
{
    this._settings[ aName ] = aSetting;
    this.persist();

    return true;
};

/* private methods */

/**
 * save the state of the model in local storage
 *
 * @private
 */
SettingsModel.prototype.persist = function() {
    StorageUtil.setItem( Config.LOCAL_STORAGE_SETTINGS, JSON.stringify( this._settings ));
};
