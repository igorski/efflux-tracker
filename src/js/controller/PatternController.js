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
var Handlebars     = require( "handlebars/dist/handlebars.runtime.min.js" );
var templates      = require( "../handlebars/templates" )( Handlebars );
var Pubsub         = require( "pubsub-js" );
var Messages       = require( "../definitions/Messages" );
var PatternFactory = require( "../factory/PatternFactory" );
var ObjectUtil     = require( "../utils/ObjectUtil" );

/* private properties */

var container, slocum, noteEntryController, keyboardController, positionTitle;
var activePattern = 0, activeChannel = 0, activeStep = 0, stepAmount = 16, patternCopy;

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

        container     = containerRef;
        positionTitle = document.querySelector( "#currentPattern" );

        PatternController.update(); // sync view with model state

        // add listeners

        keyboardController.setListener( PatternController );
        container.addEventListener( "click", handleClick );

        document.querySelector( "#patternClear"  ).addEventListener( "click", handlePatternClear );
        document.querySelector( "#patternCopy"   ).addEventListener( "click", handlePatternCopy );
        document.querySelector( "#patternPaste"  ).addEventListener( "click", handlePatternPaste );
        document.querySelector( "#patternAdd"    ).addEventListener( "click", handlePatternAdd );
        document.querySelector( "#patternDelete" ).addEventListener( "click", handlePatternDelete );
        document.querySelector( "#patternBack"   ).addEventListener( "click", handlePatternNavBack );
        document.querySelector( "#patternNext"   ).addEventListener( "click", handlePatternNavNext );

        // subscribe to pubsub messaing

        Pubsub.subscribe( Messages.SONG_LOADED, handleBroadcast );
    },

    update : function()
    {
        var pattern = slocum.activeSong.patterns[ activePattern ];
        container.innerHTML = templates.patternEditor({
            pattern : pattern
        });
        positionTitle.querySelector( ".current" ).innerHTML = ( activePattern + 1 ).toString();
        positionTitle.querySelector( ".total" ).innerHTML   = slocum.activeSong.patterns.length.toString();
        highlightActiveStep();
    },

    /* event handlers */

    handleKey : function( keyCode )
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
            case 13: // enter

                editStep();
                break;

            case 8:  // backspace
                deleteHighlightedStep();
                PatternController.handleKey( 38 ); // move up to previous slot
                break;

            case 46: // delete
                deleteHighlightedStep();
                PatternController.handleKey( 40 ); // move down to next slot
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
        case Messages.SONG_LOADED:

            activePattern = 0;
            activeChannel = 0;
            activeStep    = 0;

            PatternController.update();
            container.focus();
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

function deleteHighlightedStep()
{
    PatternFactory.clearStep( slocum.activeSong.patterns[ activePattern ], activeChannel, activeStep );
    PatternController.update(); // sync view with model
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
        octave: step.octave,
        accent: step.accent

    } : null;

    noteEntryController.open( options, function( data )
    {
        // restore interest in keyboard controller events
        keyboardController.setListener( PatternController );

        // update model and view

        if ( data )
        {
            var valid = ( data.sound !== "" && data.note !== "" && data.octave !== "" );
            channel[ activeStep ] = ( valid ) ? data : undefined;

            PatternController.handleKey( 40 ); // proceed to next line
            PatternController.update();
        }
    });
}

function handlePatternClear( aEvent )
{
    slocum.activeSong.patterns[ activePattern ] = PatternFactory.createEmptyPattern( stepAmount );
    PatternController.update();
}

function handlePatternCopy( aEvent )
{
    patternCopy = ObjectUtil.clone( slocum.activeSong.patterns[ activePattern ] );
}

function handlePatternPaste( aEvent )
{
    if ( patternCopy ) {
        PatternFactory.mergePatterns( slocum.activeSong.patterns[ activePattern ], patternCopy );
        PatternController.update();
    }
}

function handlePatternAdd( aEvent )
{
    var song     = slocum.activeSong,
        patterns = song.patterns;

    if ( patterns.length === 127 ) {
        Pubsub.publish( Messages.SHOW_ERROR, "Cannot exceed the allowed maxium of 127 patterns" );
        return;
    }

    var front = patterns.slice( 0, activePattern + 1 );
    var back  = patterns.slice( activePattern + 1 );

    front.push( PatternFactory.createEmptyPattern( stepAmount ));

    song.patterns = front.concat( back );
    handlePatternNavNext( null );

    Pubsub.publish( Messages.PATTERN_AMOUNT_UPDATED );
}

function handlePatternDelete( aEvent )
{
    var song     = slocum.activeSong,
        patterns = song.patterns;

    if ( patterns.length === 1 )
    {
        handlePatternClear( aEvent );
    }
    else {
        song.patterns.splice( activePattern, 1 );
        handlePatternNavBack( aEvent );
        Pubsub.publish( Messages.PATTERN_AMOUNT_UPDATED );
    }
}

function handlePatternNavBack( aEvent )
{
    if ( activePattern > 0 ) {
        --activePattern;
        PatternController.update();
    }
}

function handlePatternNavNext( aEvent )
{
    var max = slocum.activeSong.patterns.length - 1;

    if ( activePattern < max ) {
        ++activePattern;
        PatternController.update();
    }
}
