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

const Pubsub   = require( "pubsub-js" );
const Messages = require( "../definitions/Messages" );
const DOM      = require( "zjslib" ).DOM;

/* private properties */

let container, efflux, indiceContainer, controlContainer;
let stepAmount = 0, patternIndices, rafPending = false, controlOffsetY = 0, lastWindowScrollY = 0;

module.exports =
{
    /**
     * initialize PatternEditorController
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

        // setup messaging system
        [
            Messages.WINDOW_SCROLLED,
            Messages.WINDOW_RESIZED,
            Messages.PATTERN_STEPS_UPDATED,
            Messages.STEP_POSITION_REACHED,
            Messages.SONG_LOADED

        ].forEach(( msg ) => Pubsub.subscribe( msg, handleBroadcast ));

        // initialize
        updateStepAmount( 16 );
    }
};

function handleBroadcast( type, payload )
{
    switch ( type )
    {
        case Messages.WINDOW_SCROLLED:

            // ensure the controlContainer is always visible regardless of scroll offset
            // threshold defines when to offset the containers top, the last number defines the fixed header height
            const scrollY   = window.scrollY;

            if ( scrollY !== lastWindowScrollY ) {
                const threshold = ( controlOffsetY = controlOffsetY || DOM.getElementCoordinates( container, true ).y - 46 );

                if ( scrollY > threshold )
                    controlContainer.classList.add( "fixed" );
                else
                    controlContainer.classList.remove( "fixed" );

                lastWindowScrollY = scrollY;
            }
            break;

        case Messages.WINDOW_RESIZED:
            controlOffsetY = 0; // flush cache
            break;

        case Messages.PATTERN_STEPS_UPDATED:
            updateStepAmount( payload );
            break;

        case Messages.SONG_LOADED:
            updateStepAmount( efflux.EditorModel.amountOfSteps );
            break;

        case Messages.STEP_POSITION_REACHED:

            if ( rafPending )
                return;

            rafPending = true;

            requestAnimationFrame( function()
            {
                rafPending = false;

                const step  = payload[ 0 ],
                      total = payload[ 1 ],
                      diff  = total / stepAmount;

                if ( step % diff !== 0 )
                    return;

                Pubsub.publish( Messages.HIGHLIGHT_ACTIVE_STEP, ( step / diff )); // PatternTrackListController...

                let i = patternIndices.length, number;

                while ( i-- )
                {
                    number = patternIndices[ i ];
                    if ( i * diff === step )
                        number.classList.add( "active" );
                    else
                        number.classList.remove( "active" );
                }
            });
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

function updateStepAmount( amount )
{
    stepAmount = amount;
    efflux.TemplateService.render(
        "patternEditorIndices", indiceContainer, { amount: amount }
    ).then(() => {
        patternIndices = indiceContainer.querySelectorAll( "li" );
    });
}
