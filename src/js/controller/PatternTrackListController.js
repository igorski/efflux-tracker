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
var Config         = require( "../config/Config" );
var Messages       = require( "../definitions/Messages" );
var SelectionModel = require( "../model/SelectionModel" );
var StateModel     = require( "../model/StateModel" );
var EventFactory   = require( "../factory/EventFactory" );
var PatternFactory = require( "../factory/PatternFactory" );
var Form           = require( "../utils/Form" );
var EventUtil      = require( "../utils/EventUtil" );
var ObjectUtil     = require( "../utils/ObjectUtil" );
var TemplateUtil   = require( "../utils/TemplateUtil" );

/* private properties */

var wrapper, container, tracker, editorModel, keyboardController;
var maxChannel = 0, minPatternSelect = 0, maxPatternSelect = 0, interactionData = {},
    stateModel, selectionModel, patternCopy, positionTitle, stepSelect;

var PATTERN_WIDTH = 150; // width of a single track/pattern column

var PatternTrackListController = module.exports =
{
    /**
     * initialize PatternTrackListController
     *
     * @param containerRef
     * @param trackerRef
     * @param keyboardControllerRef
     */
    init : function( containerRef, trackerRef, keyboardControllerRef )
    {
        tracker            = trackerRef;
        editorModel        = tracker.EditorModel;
        keyboardController = keyboardControllerRef;

        container     = containerRef;
        wrapper       = containerRef.querySelector( ".wrapper" );
        positionTitle = document.querySelector( "#currentPattern" );
        stepSelect    = document.querySelector( "#patternSteps"  );

        selectionModel = new SelectionModel();
        stateModel     = new StateModel();

        PatternTrackListController.update(); // sync view with model state

        // add listeners

        keyboardController.setListener( PatternTrackListController );
        wrapper.addEventListener( "click",      handleInteraction );
        wrapper.addEventListener( "touchstart", handleInteraction );
        wrapper.addEventListener( "touchend",   handleInteraction );
        wrapper.addEventListener( "dblclick",   handleInteraction );

        document.querySelector( "#patternClear"  ).addEventListener( "click",  handlePatternClear );
        document.querySelector( "#patternCopy"   ).addEventListener( "click",  handlePatternCopy );
        document.querySelector( "#patternPaste"  ).addEventListener( "click",  handlePatternPaste );
        document.querySelector( "#patternAdd"    ).addEventListener( "click",  handlePatternAdd );
        document.querySelector( "#patternDelete" ).addEventListener( "click",  handlePatternDelete );
        document.querySelector( "#patternBack"   ).addEventListener( "click",  handlePatternNavBack );
        document.querySelector( "#patternNext"   ).addEventListener( "click",  handlePatternNavNext );

        stepSelect.addEventListener( "change", handlePatternStepChange );

        var pSection = document.querySelector( "#patternSection" );
        pSection.addEventListener( "mouseover", handleMouseOver );

        maxChannel = Config.INSTRUMENT_AMOUNT - 1;

        // subscribe to pubsub messaging

        [
            Messages.SONG_LOADED,
            Messages.REFRESH_SONG,
            Messages.REFRESH_PATTERN_VIEW,
            Messages.PATTERN_SWITCH,
            Messages.EDIT_NOTE_AT_POSITION,
            Messages.ADD_EVENT_AT_POSITION,
            Messages.ADD_OFF_AT_POSITION,
            Messages.REMOVE_NOTE_AT_POSITION

        ].forEach( function( msg )
        {
            Pubsub.subscribe( msg, handleBroadcast );
        });
    },

    update : function()
    {
        var activePattern = editorModel.activePattern;

        if ( activePattern >= tracker.activeSong.patterns.length )
            activePattern = tracker.activeSong.patterns.length - 1;

        // record the current scroll offset of the container so we can restore it after updating of the HTML
        var coordinates = { x: container.scrollLeft, y: container.scrollTop };

        var pattern = tracker.activeSong.patterns[ activePattern ];
        wrapper.innerHTML = TemplateUtil.render( "patternTrackList", {
            steps   : pattern.steps,
            pattern : pattern
        });
        positionTitle.querySelector( ".current" ).innerHTML = ( activePattern + 1 ).toString();
        positionTitle.querySelector( ".total" ).innerHTML   = tracker.activeSong.patterns.length.toString();
        Form.setSelectedOption( stepSelect, pattern.steps );

        container.scrollLeft = coordinates.x;
        container.scrollTop  = coordinates.y;

        highlightActiveStep();
    },

    /* event handlers */

    handleKey : function( type, keyCode, aEvent )
    {
        if ( type === "down" )
        {
            var curStep    = editorModel.activeStep,
                curChannel = editorModel.activeInstrument; // the current step position and channel within the pattern

            switch ( keyCode )
            {
                case 38: // up

                    if ( --editorModel.activeStep < 0 )
                        editorModel.activeStep = 0;

                    // when holding down shift make a selection, otherwise clear selection

                    if ( aEvent && aEvent.shiftKey )
                        selectionModel.handleVerticalKeySelectAction( keyCode, editorModel.activeInstrument, curStep, editorModel.activeStep );
                    else
                        selectionModel.clearSelection();

                    break;

                case 40: // down

                    var maxStep = tracker.activeSong.patterns[ editorModel.activePattern ].steps - 1;

                    if ( ++editorModel.activeStep > maxStep )
                        editorModel.activeStep = maxStep;

                    // when holding down shift make a selection, otherwise clear existing selection

                    if ( aEvent && aEvent.shiftKey )
                        selectionModel.handleVerticalKeySelectAction( keyCode, editorModel.activeInstrument, curStep, editorModel.activeStep );
                    else
                        selectionModel.clearSelection();

                    break;

                case 39: // right

                    if ( ++editorModel.activeInstrument > maxChannel ) {
                        if ( editorModel.activePattern < ( tracker.activeSong.patterns.length - 1 )) {
                            ++editorModel.activePattern;
                            editorModel.activeInstrument = 0;
                            PatternTrackListController.update();
                        }
                        else
                            editorModel.activeInstrument = maxChannel;
                    }
                    else if ( editorModel.activeInstrument > 2 )
                       container.scrollLeft = (( editorModel.activeInstrument - 2 ) * PATTERN_WIDTH );

                    if ( aEvent.shiftKey )
                        selectionModel.handleHorizontalKeySelectAction( keyCode, curChannel, editorModel.activeStep );
                    else
                        selectionModel.clearSelection();

                    break;

                case 37: // left

                    if ( --editorModel.activeInstrument < 0 ) {
                        if ( editorModel.activePattern > 0 ) {
                            --editorModel.activePattern;
                            editorModel.activeInstrument = 1;
                            PatternTrackListController.update();
                        }
                        else
                            editorModel.activeInstrument = 0;
                    }
                    else if ( editorModel.activeInstrument >= 0 )
                        container.scrollLeft = ( editorModel.activeInstrument > 2 ) ? ( editorModel.activeInstrument * PATTERN_WIDTH ) : 0;

                    if ( aEvent.shiftKey ) {
                        minPatternSelect = Math.max( --maxPatternSelect, 0 );
                        selectionModel.handleHorizontalKeySelectAction( keyCode, curChannel, editorModel.activeStep );
                    }
                    else
                        selectionModel.clearSelection();

                    break;

                case 13: // enter
                    editNoteForStep();
                    break;

                case 8:  // backspace
                    deleteHighlightedStep();
                    PatternTrackListController.handleKey( type, 38 ); // move up to previous slot
                    break;

                case 46: // delete
                    deleteHighlightedStep();
                    PatternTrackListController.handleKey( type, 40 ); // move down to next slot
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
                            PatternTrackListController.update();
                        }
                    }

                    break;

                case 88: // X

                    // cut current selection

                    if ( keyboardController.hasOption( aEvent ))
                    {
                        if ( !selectionModel.hasSelection() )
                            selectionModel.setSelection( editorModel.activeStep, editorModel.activeStep + 1 );

                        selectionModel.cutSelection( tracker.activeSong, editorModel.activePattern );
                        selectionModel.clearSelection();
                        PatternTrackListController.update();
                        saveState();
                    }
                    break;

                case 86: // V

                    // paste current selection
                    if ( keyboardController.hasOption( aEvent )) {
                        selectionModel.pasteSelection(
                            tracker.activeSong, editorModel.activePattern, editorModel.activeInstrument, editorModel.activeStep
                        );
                        PatternTrackListController.update();
                        saveState();
                    }
                    break;

                case 67: // C

                    // copy current selection
                    if ( keyboardController.hasOption( aEvent ))
                    {
                        if ( !selectionModel.hasSelection() ) {
                            selectionModel.setSelectionChannelRange( editorModel.activeInstrument );
                            selectionModel.setSelection( editorModel.activeStep, editorModel.activeStep + 1 );
                        }
                        selectionModel.copySelection( tracker.activeSong, editorModel.activePattern );
                        selectionModel.clearSelection();
                    }
                    break;

                case 77: // M
                    editModuleParamsForStep();
                    break;

                case 79: // O

                    addOffEvent();
                    break;
            }
            highlightActiveStep();
        }
        else if ( keyCode === 16 )
            selectionModel.actionCache.stepOnSelection = -1;
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
                editorModel.activePattern = 0;
                editorModel.activeStep    = 0;
                editorModel.activeInstrument = 0;
                selectionModel.clearSelection();
            }
            stateModel.flush();
            stateModel.store();
            PatternTrackListController.update();
            wrapper.focus();
            break;

        case Messages.PATTERN_SWITCH:
            editorModel.activePattern = payload;
            PatternTrackListController.update();
            break;

        case Messages.REFRESH_PATTERN_VIEW:
            PatternTrackListController.update();
            break;

        case Messages.EDIT_NOTE_AT_POSITION:
            editNoteForStep();
            break;

        case Messages.ADD_EVENT_AT_POSITION:
            addEventAtCurrentPosition( payload );
            break;

        case Messages.ADD_OFF_AT_POSITION:
            addOffEvent();
            break;

        case Messages.REMOVE_NOTE_AT_POSITION:
            deleteHighlightedStep();
            break;
    }
}

function highlightActiveStep()
{
    var pContainers = wrapper.querySelectorAll( ".pattern" ),
        activeStyle = "active", selectedStyle = "selected",
        activeStep = editorModel.activeStep,
        selection, pContainer, items, item;

    for ( var i = 0, l = pContainers.length; i < l; ++i )
    {
        pContainer = pContainers[ i ];
        selection  = selectionModel.selectedChannels[ i ];
        items      = pContainer.querySelectorAll( "li" );

        var j = items.length;
        while ( j-- )
        {
            item = items[ j ].classList;

            if ( i === editorModel.activeInstrument && j === activeStep )
                item.add( activeStyle );
            else
                item.remove( activeStyle );

            // highlight selection

            if ( selection && selection.indexOf( j ) > -1 )
                item.add( selectedStyle );
            else
                item.remove( selectedStyle );
        }
    }
}

function deleteHighlightedStep()
{
    if ( selectionModel.hasSelection() )
        selectionModel.deleteSelection( tracker.activeSong, editorModel.activePattern );
    else
        PatternFactory.clearEvent( tracker.activeSong.patterns[ editorModel.activePattern ], editorModel.activeInstrument, editorModel.activeStep );

    PatternTrackListController.update(); // sync view with model
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
        var pContainers = wrapper.querySelectorAll( ".pattern" ),
            found = false, pContainer, items;

        for ( var i = 0, l = pContainers.length; i < l; ++i ) {

            if ( found ) break;

            pContainer = pContainers[ i ];
            items = pContainer.querySelectorAll( "li" );

            var j = items.length;
            while ( j-- )
            {
                if ( items[ j ] === aEvent.target ) {

                    if ( i !== editorModel.activeInstrument ) {
                        editorModel.activeInstrument = i; // when entering a new channel lane, make default instrument match index
                        editorModel.activeInstrument    = i;
                    }
                    editorModel.activeStep = j;
                    highlightActiveStep();

                    keyboardController.setListener( PatternTrackListController );

                    if ( aEvent.type === "dblclick" ) {

                        aEvent.preventDefault();
                        editNoteForStep();
                        found = true;
                    }
                    break;
                }
            }
        }
    }
    Pubsub.publish( Messages.DISPLAY_HELP, "helpTopicTracker" );
}

function editNoteForStep()
{
    var pattern = tracker.activeSong.patterns[ editorModel.activePattern ];
    var channel = pattern.channels[ editorModel.activeInstrument ];
    var event   = channel[ editorModel.activeStep ];

    var options =
    {
        instrument : ( event ) ? event.instrument : editorModel.activeInstrument,
        note       : ( event ) ? event.note       : "C",
        octave     : ( event ) ? event.octave     : 3
    };

    Pubsub.publish( Messages.OPEN_NOTE_ENTRY_PANEL, [ options, function()
    {
        // restore interest in keyboard controller events
        keyboardController.setListener( PatternTrackListController );
    }]);
}

function editModuleParamsForStep()
{
    var options = {};

    Pubsub.publish( Messages.OPEN_MODULE_PARAM_PANEL, [ options, function()
    {
        // restore interest in keyboard controller events
        keyboardController.setListener( PatternTrackListController );
    }]);
}

function addOffEvent()
{
    var offEvent = EventFactory.createAudioEvent();
    offEvent.action = 2; // noteOff;
    addEventAtCurrentPosition( offEvent );
}

function handlePatternClear( aEvent )
{
    tracker.activeSong.patterns[ editorModel.activePattern ] = PatternFactory.createEmptyPattern( editorModel.amountOfSteps );
    selectionModel.clearSelection();
    PatternTrackListController.update();
}

function handlePatternCopy( aEvent )
{
    patternCopy = ObjectUtil.clone( tracker.activeSong.patterns[ editorModel.activePattern ] );
}

function handlePatternPaste( aEvent )
{
    if ( patternCopy ) {
        PatternFactory.mergePatterns( tracker.activeSong.patterns[ editorModel.activePattern ], patternCopy );
        PatternTrackListController.update();
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

    var front = patterns.slice( 0, editorModel.activePattern + 1 );
    var back  = patterns.slice( editorModel.activePattern + 1 );

    front.push( PatternFactory.createEmptyPattern( editorModel.amountOfSteps ));

    song.patterns = front.concat( back );
    handlePatternNavNext( null );

    Pubsub.publishSync( Messages.PATTERN_AMOUNT_UPDATED );
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

        song.patterns.splice( editorModel.activePattern, 1 );

        if ( editorModel.activePattern > 0 )
            handlePatternNavBack( aEvent );
        else
            PatternTrackListController.update();

        Pubsub.publishSync( Messages.PATTERN_AMOUNT_UPDATED );
    }
}

function handlePatternNavBack( aEvent )
{
    if ( editorModel.activePattern > 0 ) {
        --editorModel.activePattern;
        selectionModel.clearSelection();
        PatternTrackListController.update();
    }
}

function handlePatternNavNext( aEvent )
{
    var max = tracker.activeSong.patterns.length - 1;

    if ( editorModel.activePattern < max ) {
        ++editorModel.activePattern;
        selectionModel.clearSelection();
        PatternTrackListController.update();
    }
}

function handlePatternStepChange( aEvent )
{
    var song    = tracker.activeSong,
        pattern = song.patterns[ editorModel.activePattern ];

    var oldAmount = pattern.steps;
    var newAmount = parseInt( Form.getSelectedOption( stepSelect ), 10 );

    // update model values
    pattern.steps = editorModel.amountOfSteps = newAmount;

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

    Pubsub.publish( Messages.PATTERN_STEPS_UPDATED, newAmount );
    PatternTrackListController.update(); // sync with model
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

/**
 * adds given AudioEvent at the currently highlighted position
 *
 * @param {AUDIO_EVENT} event
 */
function addEventAtCurrentPosition( event )
{
    var pattern = tracker.activeSong.patterns[ editorModel.activePattern ];
    var channel = pattern.channels[ editorModel.activeInstrument ];

    EventUtil.setPosition(
        event, pattern, editorModel.activePattern, editorModel.activeStep,
        tracker.activeSong.meta.tempo
    );
    channel[ editorModel.activeStep ] = event;

    PatternTrackListController.handleKey( "down", 40 ); // proceed to next line
    PatternTrackListController.update();
    saveState();
}
