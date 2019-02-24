/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2017 - https://www.igorski.nl
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

const Pubsub    = require( "pubsub-js" );
const Messages  = require( "../definitions/Messages" );
const EventUtil = require( "../utils/EventUtil" );
const DOM       = require( "zjslib" ).DOM;

/* private properties */

let container, efflux, indiceContainer, controlContainer;
let controlOffsetY = 0, lastWindowScrollY = 0;

module.exports =
{
    /**
     * initialize TrackEditorController
     *
     * @param containerRef
     * @param effluxRef
     */
    init( containerRef, effluxRef )
    {
        container        = containerRef;
        efflux           = effluxRef;
        controlContainer = container.querySelector( ".controls" );
        indiceContainer  = container.querySelector( ".indices" );

        // grab references to elements

        container.querySelector( ".addNote" ).addEventListener     ( "click", handleNoteAddClick );
        container.querySelector( ".addOff" ).addEventListener      ( "click", handleNoteOffClick );
        container.querySelector( ".removeNote" ).addEventListener  ( "click", handleNoteDeleteClick );
        container.querySelector( ".moduleParams" ).addEventListener( "click", handleModuleParamsClick );
        container.querySelector( ".moduleGlide" ).addEventListener ( "click", handleModuleGlideClick );

        // setup messaging system
        [
            Messages.WINDOW_SCROLLED,
            Messages.WINDOW_RESIZED

        ].forEach(( msg ) => Pubsub.subscribe( msg, handleBroadcast ));
    }
};

function handleBroadcast( type, payload )
{
    switch ( type )
    {
        case Messages.WINDOW_SCROLLED:

            // ensure the controlContainer is always visible regardless of scroll offset (for phones)
            // threshold defines when to offset the containers top, the last number defines the fixed header height
            const scrollY = window.scrollY;

            if ( scrollY !== lastWindowScrollY ) {
                const threshold = ( controlOffsetY = controlOffsetY || DOM.getElementCoordinates( container, true ).y - 46 );

                if ( scrollY > threshold )
                    container.classList.add( "fixed" );
                else
                    container.classList.remove( "fixed" );

                lastWindowScrollY = scrollY;
            }
            break;

        case Messages.WINDOW_RESIZED:
            controlOffsetY = 0; // flush cache
            break;
    }
}

function handleNoteAddClick( aEvent )
{
    Pubsub.publish( Messages.EDIT_NOTE_AT_POSITION );
}

function handleNoteOffClick( aEvent )
{
    Pubsub.publish( Messages.ADD_OFF_AT_POSITION );
}

function handleNoteDeleteClick( aEvent )
{
    Pubsub.publish( Messages.REMOVE_NOTE_AT_POSITION );
}

function handleModuleParamsClick( aEvent )
{
    Pubsub.publish( Messages.OPEN_MODULE_PARAM_PANEL );
}

function handleModuleGlideClick( aEvent )
{
    Pubsub.publish( Messages.GLIDE_PARAM_AUTOMATIONS );
}
