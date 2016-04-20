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
var Pubsub       = require( "pubsub-js" );
var Messages     = require( "../definitions/Messages" );
var TemplateUtil = require( "../utils/TemplateUtil" );

/* private properties */

var container, indiceContainer;
var stepAmount = 0, rafPending = false;

module.exports =
{
    /**
     * initialize PatternEditorController
     *
     * @param containerRef
     */
    init : function( containerRef )
    {
        container       = containerRef;
        indiceContainer = container.querySelector( ".indices" );

        // grab references to elements

        container.querySelector( ".addNote" ).addEventListener( "click", handleNoteAdd );
        container.querySelector( ".addOff" ).addEventListener ( "click", handleOffAdd );

        // setup messaging system
        [
            Messages.PATTERN_STEPS_UPDATED,
            Messages.STEP_POSITION_REACHED

        ].forEach( function( msg ) {
            Pubsub.subscribe( msg, handleBroadcast );
        });

        // initialize
        updateStepAmount( 16 );
    }
};

function handleBroadcast( type, payload )
{
    switch ( type )
    {
        case Messages.PATTERN_STEPS_UPDATED:
            updateStepAmount( payload );
            break;

        case Messages.STEP_POSITION_REACHED:

            if ( rafPending )
                return;

            rafPending = true;

            requestAnimationFrame( function()
            {
                var step = payload[ 0 ], total = payload[ 1 ];
                var diff = total / stepAmount;

                //if ( step % diff !== 0 )
                  //  return;

                var numbers = indiceContainer.querySelectorAll( "li" ),
                    i = numbers.length, number;

                while ( i-- )
                {
                    number = numbers[ i ];
                    if ( i * diff === step )
                        number.classList.add( "active" );
                    else
                        number.classList.remove( "active" );
                }
                rafPending = false;
            });
            break;
    }
}

function handleNoteAdd( aEvent )
{
    Pubsub.publish( Messages.ADD_NOTE_AT_POSITION );
}

function handleOffAdd( aEvent )
{
    Pubsub.publish( Messages.ADD_OFF_AT_POSITION );
}

function updateStepAmount( amount )
{
    stepAmount = amount;
    indiceContainer.innerHTML = TemplateUtil.render(
        "patternEditorIndices", { amount: amount }
    );
}
