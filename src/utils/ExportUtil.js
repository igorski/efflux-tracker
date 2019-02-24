/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016 - https://www.igorski.nl
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
const Copy                = require( "../i18n/Copy" );
const Messages            = require( "../definitions/Messages" );
const SongAssemblyService = require( "../services/SongAssemblyService" );
const SongValidator       = require( "../model/validators/SongValidator" );
const InstrumentValidator = require( "../model/validators/InstrumentValidator" );
const Pubsub              = require( "pubsub-js" );

module.exports = {

    /* songs */

    importSong()
    {
        // inline handler to overcome blocking of the file select popup by the browser

        const fileBrowser = document.createElement( "input" );
        fileBrowser.setAttribute( "type",   "file" );
        fileBrowser.setAttribute( "accept", Config.SONG_FILE_EXTENSION );

        const simulatedEvent = document.createEvent( "MouseEvent" );
        simulatedEvent.initMouseEvent( "click", true, true, window, 1,
                                       0, 0, 0, 0, false,
                                       false, false, false, 0, null );

        fileBrowser.dispatchEvent( simulatedEvent );
        fileBrowser.addEventListener( "change", ( fileBrowserEvent ) =>
        {
            const reader = new FileReader();

            reader.onerror = ( readerEvent ) =>
            {
                Pubsub.publish( Messages.SHOW_ERROR, getCopy( "ERROR_FILE_LOAD" ));
            };

            reader.onload = ( readerEvent ) =>
            {
                const fileData = readerEvent.target.result;
                const song     = SongAssemblyService.assemble( atob( fileData ));

                // rudimentary check if we're dealing with a valid song

                if ( SongValidator.isValid( song ))
                {
                    efflux.SongModel.saveSong( song );
                    efflux.activeSong = song;
                    Pubsub.publish( Messages.SONG_IMPORTED, song );
                    Pubsub.publish( Messages.SONG_LOADED, song );
                }
                else {
                    Pubsub.publish( Messages.SHOW_ERROR, getCopy( "ERROR_SONG_IMPORT" ));
                }
            };
            // start reading file contents
            reader.readAsText( fileBrowserEvent.target.files[ 0 ] );
        });
    },

    exportSong( song )
    {
        // encode song data

        const data = serializeSong( song );

        // download file to disk

        const pom = document.createElement( "a" );
        pom.setAttribute( "href", "data:application/json;charset=utf-8," + encodeURIComponent( data ));
        pom.setAttribute( "target", "_blank" ); // helps for Safari (opens content in window...)
        pom.setAttribute( "download", song.meta.title + Config.SONG_FILE_EXTENSION );
        pom.click();

        Pubsub.publish( Messages.SONG_EXPORTED, song );
        Pubsub.publish( Messages.SHOW_FEEDBACK, getCopy( "SONG_EXPORTED", song.meta.title ));
    },

    /* instrument presets */

    importInstrument()
    {
        // inline handler to overcome blocking of the file select popup by the browser

        const fileBrowser = document.createElement( "input" );
        fileBrowser.setAttribute( "type",   "file" );
        fileBrowser.setAttribute( "accept", Config.INSTRUMENT_FILE_EXTENSION );

        const simulatedEvent = document.createEvent( "MouseEvent" );
        simulatedEvent.initMouseEvent( "click", true, true, window, 1,
                                       0, 0, 0, 0, false,
                                       false, false, false, 0, null );

        fileBrowser.dispatchEvent( simulatedEvent );
        fileBrowser.addEventListener( "change", ( fileBrowserEvent ) =>
        {
            const reader = new FileReader();

            reader.onerror = ( readerEvent ) =>
            {
                Pubsub.publish( Messages.SHOW_ERROR, getCopy( "ERROR_FILE_LOAD" ));
            };

            reader.onload = ( readerEvent ) =>
            {
                const fileData    = readerEvent.target.result;
                const instruments = JSON.parse( atob( fileData ));

                // check if we're dealing with valid instruments

                if ( Array.isArray( instruments )) {

                    let amountImported = 0;

                    instruments.forEach(( instrument ) => {

                        if ( InstrumentValidator.isValid( instrument )) {
                            efflux.InstrumentModel.saveInstrument( instrument );
                            ++amountImported;
                        }
                    });

                    if ( amountImported > 0 )
                        Pubsub.publish( Messages.SHOW_FEEDBACK, getCopy( "INSTRUMENTS_IMPORTED", amountImported ));
                    else
                        Pubsub.publish( Messages.SHOW_ERROR, getCopy( "ERROR_INSTRUMENT_IMPORT" ));
                }
            };
            // start reading file contents
            reader.readAsText( fileBrowserEvent.target.files[ 0 ] );
        });
    },

    exportInstruments( instruments )
    {
        if ( Array.isArray( instruments ) && instruments.length > 0 ) {

            // encode instrument data

            const data = btoa( JSON.stringify( instruments ));

            // download file to disk

            const pom = document.createElement( "a" );
            pom.setAttribute( "href", "data:application/json;charset=utf-8," + encodeURIComponent( data ));
            pom.setAttribute( "target", "_blank" ); // helps for Safari (opens content in window...)
            pom.setAttribute( "download", "efflux_instrument_presets" + Config.INSTRUMENT_FILE_EXTENSION );
            pom.click();

            Pubsub.publish( Messages.SHOW_FEEDBACK, getCopy( "INSTRUMENTS_EXPORTED" ));
        }
    }
};

function serializeSong( song ) {
    return btoa( SongAssemblyService.disassemble( song ));
}
