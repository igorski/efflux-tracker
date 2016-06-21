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

const TemplateUtil = require( "../utils/TemplateUtil" );
const Messages     = require( "../definitions/Messages" );
const Copy         = require( "../i18n/Copy" );
const Pubsub       = require( "pubsub-js" );

let container, confirm, message, confirmHandler, cancelHandler;

const ConfirmController = module.exports =
{
    init( containerRef )
    {
        container = containerRef;

        // create DOM elements

        confirm = TemplateUtil.renderAsElement( "confirmWindow", {
            title: Copy.get( "CONFIRM_TITLE" ),
            message: "",
            confirm: Copy.get( "BUTTON_OK" ),
            cancel: Copy.get( "BUTTON_CANCEL" )
        });

        message = confirm.querySelector( ".message" );

        // add listeners to DOM

        confirm.querySelector( ".confirm-button" ).addEventListener( "click", handleConfirm );
        confirm.querySelector( ".cancel-button" ).addEventListener( "click", handleCancel );

        // subscribe to messasing system

        [
            Messages.CONFIRM,
            Messages.CLOSE_OVERLAYS

        ].forEach(( msg ) => Pubsub.subscribe( msg, handleBroadcast ));
    }
};

/* private methods */

function handleBroadcast( type, payload )
{
    switch ( type )
    {
        case Messages.CONFIRM:
            Pubsub.publishSync( Messages.SHOW_BLIND );

            message.innerHTML = payload.message;
            confirmHandler    = payload.confirm;
            cancelHandler     = payload.cancel;

            container.appendChild( confirm );
            break;

        case Messages.CLOSE_OVERLAYS:
            if ( confirm.parentNode )
                container.removeChild( confirm );

            Pubsub.publishSync( Messages.HIDE_BLIND );
            break;
    }
}

function handleConfirm( aEvent )
{
    Pubsub.publishSync( Messages.CLOSE_OVERLAYS );

    if ( typeof confirmHandler === "function" )
        confirmHandler();
}

function handleCancel( aEvent )
{
    Pubsub.publishSync( Messages.CLOSE_OVERLAYS );

    if ( typeof cancelHandler === "function" )
        cancelHandler();
}
