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
var Handlebars = require( "handlebars/dist/handlebars.runtime.min.js" );
var templates  = require( "../handlebars/templates" )( Handlebars );
var Pubsub     = require( "pubsub-js" );

/* private properties */

var container, slocum, noteEntryController, keyboardController;
var activePattern = 0, activeChannel = 0, activeStep = 0;

var PatternController = module.exports =
{
    /**
     * initialize PatternController
     *
     * @param containerRef
     * @param slocumRef
     * @param keyboardControllerRef
     * @param noteEntryControllerRef
     */
    init : function( containerRef, slocumRef, keyboardControllerRef, noteEntryControllerRef )
    {
        slocum              = slocumRef;
        keyboardController  = keyboardControllerRef;
        noteEntryController = noteEntryControllerRef;

        container = document.createElement( "div" );
        container.setAttribute( "id", "patternEditor" );
        container.addEventListener( "click", handleClick );
        containerRef.appendChild( container );

        PatternController.update();
        keyboardController.setListener( PatternController );

        Pubsub.subscribe( "SONG_LOADED", handleBroadcast );
    },

    update : function()
    {
        var pattern = slocum.activeSong.patterns[ activePattern ];
        container.innerHTML = templates.patternEditor( pattern );

        highlightActiveStep();
    },

    /* event handlers */

    handleKey : function( keyCode, event )
    {
        switch ( keyCode )
        {
            case 38: // up

                if ( --activeStep < 0 )
                    activeStep = 0;

                break;

            case 40: // down

                var maxStep = slocum.activeSong.patterns[ activePattern ].steps - 1;

                if ( ++activeStep > maxStep )
                    activeStep = maxStep;

                break;

            case 39: // right

                if ( ++activeChannel > 1 )
                    activeChannel = 1;

                break;

            case 37: // left

                if ( --activeChannel < 0 )
                    activeChannel = 0;

                break;

            case 32: // spacebar

                editStep();
                break;

            case 8:  // backspace
            case 46: // delete

                var pattern = slocum.activeSong.patterns[ activePattern ];
                var channel = pattern.channels[ activeChannel ];
                channel[ activeStep ] = undefined; // clear content
                PatternController.update(); // sync view with model
                event.preventDefault();
                break;
        }
        highlightActiveStep();
    }
};

/* private methods */

function handleBroadcast( type, payload )
{
    switch( type )
    {
        case "SONG_LOADED":

            activePattern = 0;
            activeChannel = 0;
            activeStep    = 0;

            PatternController.update();
            break;
    }
}

function highlightActiveStep()
{
    var pContainers = container.querySelectorAll( ".pattern" ),
        pContainer, items, item;

    for ( var i = 0, l = pContainers.length; i < l; ++i ) {
        pContainer = pContainers[ i ];
        items = pContainer.querySelectorAll( "li" );

        var j = items.length;
        while ( j-- )
        {
            item = items[ j ];

            if ( i === activeChannel && j === activeStep ) {
                item.classList.add( "active" );
            }
            else {
                item.classList.remove( "active" );
            }
        }
    }
}

function handleClick( aEvent )
{
    if ( aEvent.target.nodeName === "LI" )
    {
        var pContainers = container.querySelectorAll( ".pattern" ),
        pContainer, items;

        for ( var i = 0, l = pContainers.length; i < l; ++i ) {
            pContainer = pContainers[ i ];
            items = pContainer.querySelectorAll( "li" );

            var j = items.length;
            while ( j-- )
            {
                if ( items[ j ] === aEvent.target ) {
                    activeChannel = i;
                    activeStep    = j;
                    highlightActiveStep();
                    editStep();
                    break;
                }
            }
        }
    }
}

function editStep()
{
    var pattern = slocum.activeSong.patterns[ activePattern ];
    var channel = pattern.channels[ activeChannel ];
    var step    = channel[ activeStep ];

    var options = ( step ) ?
    {
        sound : step.sound,
        note  : step.note,
        octave: step.octave

    } : null;

    noteEntryController.open( options, function( data )
    {
        // restore interest in keyboard controller events
        keyboardController.setListener( PatternController );

        // update model and view

        var valid = ( data.sound !== "" && data.note !== "" && data.octave !== "" );
        channel[ activeStep ] = ( valid ) ? data : undefined;

        PatternController.update();
    });
}
