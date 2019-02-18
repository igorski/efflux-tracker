/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2017 - http://www.igorski.nl
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

const Messages = require( "../definitions/Messages" );
const Copy     = require( "../i18n/Copy" );
const Pubsub   = require( "pubsub-js" );

let container, dialog, dialogTitle, dialogMessage,
    confirmButton, cancelButton, confirmHandler, cancelHandler;

module.exports =
{
    init( containerRef, effluxRef ) {
        container = containerRef;

        // create DOM elements

        effluxRef.TemplateService.renderAsElement( "dialogWindow", {

            title: "",
            message: "",
            confirm: getCopy( "BUTTON_OK" ),
            cancel:  getCopy( "BUTTON_CANCEL" )

        }).then(( template ) => {

            dialog        = template;
            dialogTitle   = dialog.querySelector( "h4" );
            dialogMessage = dialog.querySelector( ".message" );

            // add listeners to DOM

            confirmButton = dialog.querySelector( ".confirm-button" );
            cancelButton  = dialog.querySelector( ".cancel-button" );

            confirmButton.addEventListener( "click", handleConfirm );
            cancelButton.addEventListener ( "click", handleCancel );
        });

        // subscribe to messaging system

        [
            Messages.SHOW_DIALOG,
            Messages.CONFIRM,
            Messages.CLOSE_OVERLAYS

        ].forEach(( msg ) => Pubsub.subscribe( msg, handleBroadcast ));
    }
};

/* private methods */

function handleBroadcast( type, payload ) {
    switch ( type ) {
        case Messages.SHOW_DIALOG:
        case Messages.CONFIRM:
            Pubsub.publishSync( Messages.SHOW_BLIND );

            dialogTitle.innerHTML   = payload.title || getCopy( "CONFIRM_TITLE" );
            dialogMessage.innerHTML = payload.message;
            confirmHandler = payload.confirm;
            cancelHandler  = payload.cancel;

            if ( type === Messages.CONFIRM )
                show( cancelButton );
            else
                hide( cancelButton );

            container.appendChild( dialog );
            break;

        case Messages.CLOSE_OVERLAYS:
            if ( dialog.parentNode )
                container.removeChild( dialog );

            Pubsub.publishSync( Messages.HIDE_BLIND );
            break;
    }
}

function handleConfirm( aEvent ) {
    Pubsub.publishSync( Messages.CLOSE_OVERLAYS );

    if ( typeof confirmHandler === "function" )
        confirmHandler();
}

function handleCancel( aEvent ) {
    Pubsub.publishSync( Messages.CLOSE_OVERLAYS );

    if ( typeof cancelHandler === "function" )
        cancelHandler();
}

function show( element ) {
    element.style.display = "inline";
}

function hide( element ) {
    element.style.display = "none";
}
