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
var Pubsub         = require( "pubsub-js" );
var Messages       = require( "../definitions/Messages" );
var SelectionModel = require( "../model/SelectionModel" );
var StateModel     = require( "../model/StateModel" );
var PatternFactory = require( "../factory/PatternFactory" );
var Form           = require( "../utils/Form" );
var ObjectUtil     = require( "../utils/ObjectUtil" );
var TemplateUtil   = require( "../utils/TemplateUtil" );

/* private properties */

var container, tracker, noteEntryController, keyboardController;
var activePattern = 0, activeChannel = 0, activeStep = 0, stepAmount = 16,
    stepOnSelection = -1, shrinkSelection = false, minOnSelection, maxOnSelection,
    prevVerticalKey, interactionData = {},
    stateModel, selectionModel, patternCopy, positionTitle,
    stepSelection;

var PatternController = module.exports =
{
    /**
     * initialize PatternController
     *
     * @param containerRef
     * @param trackerRef
     * @param keyboardControllerRef
     * @param noteEntryControllerRef
     */
    init : function( containerRef, trackerRef, keyboardControllerRef, noteEntryControllerRef )
    {
        tracker              = trackerRef;
        keyboardController  = keyboardControllerRef;
        noteEntryController = noteEntryControllerRef;

        container           = containerRef;
        positionTitle       = document.querySelector( "#currentPattern" );
        stepSelection       = document.querySelector( "#patternSteps"  );

        selectionModel = new SelectionModel();
        stateModel     = new StateModel();

        PatternController.update(); // sync view with model state

        // add listeners

        keyboardController.setListener( PatternController );
        container.addEventListener( "click",      handleInteraction );
        container.addEventListener( "touchstart", handleInteraction );
        container.addEventListener( "touchend",   handleInteraction );
        container.addEventListener( "dblclick",   handleInteraction );

        document.querySelector( "#patternClear"  ).addEventListener( "click",  handlePatternClear );
        document.querySelector( "#patternCopy"   ).addEventListener( "click",  handlePatternCopy );
        document.querySelector( "#patternPaste"  ).addEventListener( "click",  handlePatternPaste );
        document.querySelector( "#patternAdd"    ).addEventListener( "click",  handlePatternAdd );
        document.querySelector( "#patternDelete" ).addEventListener( "click",  handlePatternDelete );
        document.querySelector( "#patternBack"   ).addEventListener( "click",  handlePatternNavBack );
        document.querySelector( "#patternNext"   ).addEventListener( "click",  handlePatternNavNext );

        stepSelection.addEventListener( "change", handlePatternStepChange );

        var pSection = document.querySelector( "#patternSection" );
        pSection.addEventListener( "mouseover", handleMouseOver );

        // subscribe to pubsub messaging

        Pubsub.subscribe( Messages.SONG_LOADED,  handleBroadcast );
        Pubsub.subscribe( Messages.REFRESH_SONG, handleBroadcast );
    },

    update : function()
    {
        if ( activePattern >= tracker.activeSong.patterns.length )
            activePattern = tracker.activeSong.patterns.length - 1;

        var pattern = tracker.activeSong.patterns[ activePattern ];
        container.innerHTML = TemplateUtil.render( "patternEditor", {
            steps   : pattern.steps,
            pattern : pattern
        });
        positionTitle.querySelector( ".current" ).innerHTML = ( activePattern + 1 ).toString();
        positionTitle.querySelector( ".total" ).innerHTML   = tracker.activeSong.patterns.length.toString();
        Form.setSelectedOption( stepSelection, pattern.steps );

        highlightActiveStep();
    },

    /* event handlers */

    handleKey : function( type, keyCode, aEvent )
    {
        if ( type === "down" )
        {
            var curStep    = activeStep,
                curChannel = activeChannel;

            switch ( keyCode )
            {
                case 38: // up

                    if ( --activeStep < 0 )
                        activeStep = 0;

                    // when holding down shift make a selection

                    if ( aEvent && aEvent.shiftKey )
                    {
                        if ( stepOnSelection === -1 || prevVerticalKey !== keyCode )
                        {
                            shrinkSelection = ( curStep === selectionModel.getMaxValue() );
                            minOnSelection  = selectionModel.getMinValue();
                            maxOnSelection  = selectionModel.getMaxValue();
                            stepOnSelection = (( minOnSelection === curStep ) ? minOnSelection : activeStep ) + 2;
                        }

                        if ( shrinkSelection )
                        {
                            if ( minOnSelection === activeStep )
                                stepOnSelection = -1;

                            selectionModel.setSelection( activeChannel, minOnSelection, activeStep );
                        }
                        else
                            selectionModel.setSelection( activeChannel, activeStep, stepOnSelection );
                    }
                    else
                        selectionModel.clearSelection();

                    prevVerticalKey = keyCode;
                    break;

                case 40: // down

                    var maxStep = tracker.activeSong.patterns[ activePattern ].steps - 1;

                    if ( ++activeStep > maxStep )
                        activeStep = maxStep;

                    // when holding down shift make a selection

                    if ( aEvent && aEvent.shiftKey )
                    {
                        if ( stepOnSelection === -1 || prevVerticalKey !== keyCode ) {
                            shrinkSelection = ( prevVerticalKey !== keyCode && curStep === selectionModel.getMinValue() );
                            minOnSelection  = selectionModel.getMinValue();
                            maxOnSelection  = selectionModel.getMaxValue() + 1;
                            stepOnSelection = ( maxOnSelection === ( activeStep - 1 )) ? minOnSelection : activeStep - 1;
                        }

                        if ( shrinkSelection )
                        {
                            if ( maxOnSelection === activeStep + 1 )
                                stepOnSelection = -1;

                            selectionModel.setSelection( activeChannel, activeStep, maxOnSelection );
                        }
                        else
                            selectionModel.setSelection( activeChannel, stepOnSelection, Math.max( selectionModel.getMaxValue(), activeStep ) + 1 );
                    }
                    else
                        selectionModel.clearSelection();

                    prevVerticalKey = keyCode;
                    break;

                case 39: // right

                    if ( ++activeChannel > 1 ) {
                        if ( activePattern < ( tracker.activeSong.patterns.length - 1 )) {
                            ++activePattern;
                            activeChannel = 0;
                            PatternController.update();
                        }
                        else
                            activeChannel = 1;
                    }

                    if ( aEvent.shiftKey )
                        selectionModel.equalizeSelection( curChannel, true );
                    else
                        selectionModel.clearSelection();

                    break;

                case 37: // left

                    if ( --activeChannel < 0 ) {
                        if ( activePattern > 0 ) {
                            --activePattern;
                            activeChannel = 1;
                            PatternController.update();
                        }
                        else
                            activeChannel = 0;
                    }

                    if ( aEvent.shiftKey )
                        selectionModel.equalizeSelection( curChannel, true );
                    else
                        selectionModel.clearSelection();

                    break;

                case 32: // spacebar
                case 13: // enter

                    editStep();
                    break;

                case 8:  // backspace
                    deleteHighlightedStep();
                    PatternController.handleKey( type, 38 ); // move up to previous slot
                    break;

                case 46: // delete
                    deleteHighlightedStep();
                    PatternController.handleKey( type, 40 ); // move down to next slot
                    break;

                case 90: // Z

                    if ( keyboardController.hasOption( aEvent ))
                    {
                        var state;
                        if ( !aEvent.shiftKey )
                            state = stateModel.undo();
                        else
                            state = stateModel.redo();

                        if ( state !== null ) {
                            tracker.activeSong = state;
                            PatternController.update();
                        }
                    }

                    break;

                case 88: // X

                    // cut current selection

                    if ( keyboardController.hasOption( aEvent ))
                    {
                        if ( !selectionModel.hasSelection() )
                            selectionModel.setSelection( activeChannel, activeStep, activeStep + 1 );

                        selectionModel.cutSelection( tracker.activeSong, activePattern, activeChannel, activeStep );
                        selectionModel.clearSelection();
                        PatternController.update();
                        saveState();
                    }
                    break;

                case 86: // V

                    // paste current selection
                    if ( keyboardController.hasOption( aEvent )) {
                        selectionModel.pasteSelection( tracker.activeSong, activePattern, activeChannel, activeStep );
                        PatternController.update();
                        saveState();
                    }

                    break;

                case 67: // C

                    // copy current selection
                    if ( keyboardController.hasOption( aEvent ))
                    {
                        if ( !selectionModel.hasSelection() )
                            selectionModel.setSelection( activeChannel, activeStep, activeStep + 1 );

                        selectionModel.copySelection( tracker.activeSong, activePattern );
                        selectionModel.clearSelection();
                    }

                    break;
            }
            highlightActiveStep();
        }
        else if ( keyCode === 16 )
        {
            stepOnSelection = -1;
        }
    }
};

/* private methods */

function handleBroadcast( type, payload )
{
    switch( type )
    {
        case Messages.REFRESH_SONG:
        case Messages.SONG_LOADED:

            if ( type !== Messages.REFRESH_SONG ) {
                activePattern = 0;
                activeChannel = 0;
                activeStep    = 0;
                selectionModel.clearSelection();
            }
            stateModel.flush();
            stateModel.store();
            PatternController.update();
            container.focus();
            break;
    }
}

function highlightActiveStep()
{
    var pContainers = container.querySelectorAll( ".pattern" ),
        pContainer, items, item;

    var activeStyle = "active", selectedStyle = "selected";

    for ( var i = 0, l = pContainers.length; i < l; ++i ) {
        pContainer = pContainers[ i ];
        items = pContainer.querySelectorAll( "li" );

        var j = items.length;
        while ( j-- )
        {
            item = items[ j ];

            if ( i === activeChannel && j === activeStep ) {
                item.classList.add( activeStyle );
            }
            else {
                item.classList.remove( activeStyle );
            }

            // highlight selection

            if ( selectionModel.selection[ i ].indexOf( j ) > -1 ) {
                item.classList.add( selectedStyle );
            }
            else {
                item.classList.remove( selectedStyle );
            }
        }
    }
}

function deleteHighlightedStep()
{
    if ( selectionModel.hasSelection() )
        selectionModel.deleteSelection( tracker.activeSong, activePattern );
    else
        PatternFactory.clearStep( tracker.activeSong.patterns[ activePattern ], activeChannel, activeStep );

    PatternController.update(); // sync view with model
    saveState();
}

function handleInteraction( aEvent )
{
    // for touch interactions, we record some data as soon as touch starts so we can evaluate it on end

    if ( aEvent.type === "touchstart" ) {
        interactionData.offset = window.scrollY;
        interactionData.time   = Date.now();
        return;
    }

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

                    keyboardController.setListener( PatternController );

                    if ( aEvent.type === "dblclick" || ( aEvent.type === "touchend" &&
                        window.scrollY === interactionData.offset && ( Date.now() - interactionData.time ) < 200 )) {
                        aEvent.preventDefault();
                        editStep();
                    }
                    break;
                }
            }
        }
    }
    Pubsub.publish( Messages.DISPLAY_HELP, "helpTopicTracker" );
}

function editStep()
{
    var pattern = tracker.activeSong.patterns[ activePattern ];
    var channel = pattern.channels[ activeChannel ];
    var step    = channel[ activeStep ];

    /** @type {PATTERN_STEP} */
    var options = ( step ) ?
    {
        instrument : step.instrument,
        note       : step.note,
        octave     : step.octave

    } : null;

    noteEntryController.open( options, function( data )
    {
        // restore interest in keyboard controller events
        keyboardController.setListener( PatternController );

        // update model and view

        if ( data )
        {
            var valid = ( data.instrument !== "" && data.note !== "" && data.octave !== "" );

            channel[ activeStep ] = ( valid ) ? data : undefined;

            PatternController.handleKey( "down", 40 ); // proceed to next line
            PatternController.update();
            saveState();
        }
    });
}

function handlePatternClear( aEvent )
{
    tracker.activeSong.patterns[ activePattern ] = PatternFactory.createEmptyPattern( stepAmount );
    selectionModel.clearSelection();
    PatternController.update();
}

function handlePatternCopy( aEvent )
{
    patternCopy = ObjectUtil.clone( tracker.activeSong.patterns[ activePattern ] );
}

function handlePatternPaste( aEvent )
{
    if ( patternCopy ) {
        PatternFactory.mergePatterns( tracker.activeSong.patterns[ activePattern ], patternCopy );
        PatternController.update();
    }
}

function handlePatternAdd( aEvent )
{
    var song     = tracker.activeSong,
        patterns = song.patterns;

    if ( patterns.length === 128 ) {
        Pubsub.publish( Messages.SHOW_ERROR, "Cannot exceed the allowed maximum of 128 patterns" );
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
    var song     = tracker.activeSong,
        patterns = song.patterns;

    if ( patterns.length === 1 )
    {
        handlePatternClear( aEvent );
    }
    else {

        song.patterns.splice( activePattern, 1 );

        if ( activePattern > 0 )
            handlePatternNavBack( aEvent );
        else
            PatternController.update();

        Pubsub.publish( Messages.PATTERN_AMOUNT_UPDATED );
    }
}

function handlePatternNavBack( aEvent )
{
    if ( activePattern > 0 ) {
        --activePattern;
        selectionModel.clearSelection();
        PatternController.update();
    }
}

function handlePatternNavNext( aEvent )
{
    var max = tracker.activeSong.patterns.length - 1;

    if ( activePattern < max ) {
        ++activePattern;
        selectionModel.clearSelection();
        PatternController.update();
    }
}

function handlePatternStepChange( aEvent )
{
    var song    = tracker.activeSong,
        pattern = song.patterns[ activePattern ];

    var oldAmount = pattern.steps;
    var newAmount = parseInt( Form.getSelectedOption( stepSelection ), 10 );

    // update model values
    pattern.steps = newAmount;

    pattern.channels.forEach( function( channel, index )
    {
        var transformed = new Array( newAmount), i, j, increment;

        if ( newAmount < oldAmount )
        {
            // changing from 32 to 16 steps
            increment = oldAmount / newAmount;

            for ( i = 0, j = 0; i < newAmount; ++i, j += increment )
                transformed[ i ] = channel[ j ];
       }
        else {
            // changing from 16 to 32 steps
            increment = newAmount / oldAmount;

            for ( i = 0, j = 0; i < oldAmount; ++i, j += increment )
                transformed[ j ] = channel[ i ];
        }
        pattern.channels[ index ] = transformed;
    });

    PatternController.update(); // sync with model
}

function handleMouseOver( aEvent )
{
    Pubsub.publish( Messages.DISPLAY_HELP, "helpTopicPattern" );
}

function saveState()
{
    // you might argue its wasteful to store full clones of the current
    // song content, however we're not running this in the limited memory space
    // of an Atari 2600 !! this should be just fine and hella fast

    stateModel.store( ObjectUtil.clone( tracker.activeSong ));
}
