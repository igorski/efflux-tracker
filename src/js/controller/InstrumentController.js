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
var TemplateUtil  = require( "../utils/TemplateUtil" );
var Messages      = require( "../definitions/Messages" );
var zCanvas       = require( "zCanvas" ).zCanvas;
var WaveTableDraw = require( "../components/WaveTableDraw" );
var Pubsub        = require( "pubsub-js" );

/* private properties */

var container, tracker, keyboardController, view, canvas, wtDraw;
var activeOscillatorIndex = 0, instrumentId = 0, instrument;

var InstrumentController = module.exports =
{
    visible : false,

    init : function( containerRef, trackerRef, keyboardControllerRef )
    {
        container          = containerRef;
        tracker            = trackerRef;
        keyboardController = keyboardControllerRef;

        // prepare view

        view = document.createElement( "div" );
        view.setAttribute( "id", "instrumentEditor" );
        view.innerHTML = TemplateUtil.render( "instrumentEditor" );

        canvas = new zCanvas( 512, 200 ); // 512 equals the size of the wave table (see InstrumentFactory)
        canvas.insertInPage( view.querySelector( "#canvasContainer" ));

        wtDraw = new WaveTableDraw( canvas.getWidth(), canvas.getHeight(), function( table )
        {
            if ( instrument )
                instrument.oscillators[ activeOscillatorIndex].table = table;
        });

        // add listeners

        [ Messages.CLOSE_OVERLAYS, Messages.TOGGLE_INSTRUMENT_EDITOR ].forEach( function( msg )
        {
            Pubsub.subscribe( msg, handleBroadcast );
        });
    },

    update : function()
    {
        var instruments = tracker.activeSong.instruments, i = instruments.length;
        instrument = null;

        while ( i-- ) {
            if ( instruments[ i ].id == instrumentId ) {
                instrument = instruments[ i ];
                break;
            }
        }
        if ( !instrument )
            return;

        view.querySelector( "h2" ).innerHTML = "Editing " + instrument.name;
        wtDraw.setTable( instrument.oscillators[ activeOscillatorIndex ].table );
    },

    handleKey : function( type, keyCode, event )
    {
        if ( type === "down" && keyCode === 27 )
            Pubsub.publish( Messages.CLOSE_OVERLAYS );
    }
};

/* private methods */

function handleBroadcast( type, payload )
{
    switch ( type )
    {
        case Messages.TOGGLE_INSTRUMENT_EDITOR:

            Pubsub.publishSync( Messages.CLOSE_OVERLAYS );
            container.appendChild( view );
            canvas.addChild( wtDraw );

            keyboardController.setListener( InstrumentController );
            instrumentId = payload;
            InstrumentController.update(); // sync with model
            break;

        case Messages.CLOSE_OVERLAYS:

            if ( view.parentNode ) {
                container.removeChild( view );
                canvas.removeChild( wtDraw );
            }
            break;
    }
}
