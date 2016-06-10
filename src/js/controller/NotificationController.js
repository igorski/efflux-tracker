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

const Copy         = require( "../i18n/Copy" );
const Pubsub       = require( "pubsub-js" );
const Messages     = require( "../definitions/Messages" );
const TemplateUtil = require( "../utils/TemplateUtil" );

/* variables */

let container;

/**
 * a controller that can spawn dialog windows to
 * communicate state changes / errors / feedback to the user
 */
const NotificationController = module.exports =
{
    init : function( containerRef )
    {
        container = document.createElement( "div" );
        container.setAttribute( "id", "notifications" );

        containerRef.appendChild( container );

        // subscribe to pubsub system to receive and broadcast messages across the application

        [
            Messages.SONG_LOADED,
            Messages.SHOW_ERROR,
            Messages.SHOW_FEEDBACK

        ].forEach( function( msg ) {
            Pubsub.subscribe( msg, handleBroadcast );
        });
    }
};

/* private methods */

function handleBroadcast( type, payload )
{
    switch ( type )
    {
        case Messages.SONG_LOADED:
            openWindow( Copy.get( "SONG_LOADED_TITLE" ), Copy.get( "SONG_LOADED", payload.meta.title ));
            break;

        case Messages.SHOW_ERROR:
            openWindow( Copy.get( "ERROR_TITLE" ), payload );
            break;

        case Messages.SHOW_FEEDBACK:
            openWindow( Copy.get( "SUCCESS_TITLE" ), payload );
            break;
    }
}

function openWindow( title, body )
{
    const dialog     = document.createElement( "div" );
    dialog.className = "notificationWindow";
    dialog.innerHTML = TemplateUtil.render( "notificationView", { title: title, content: body });
    container.appendChild( dialog );
    dialog.classList.add( "visible" );

    const closeDialog = function()
    {
        dialog.removeEventListener( "click", closeDialog );
        dialog.classList.remove( "visible" );

        setTimeout( function() {
            if ( dialog.parentNode )
                container.removeChild( dialog );
        }, 1000 );
    };

    dialog.addEventListener( "click", closeDialog );

    // remove after a delay

    setTimeout( closeDialog, 5000 );
}
