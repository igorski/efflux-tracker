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

const Pubsub         = require( "pubsub-js" );
const Config         = require( "../config/Config" );
const Messages       = require( "../definitions/Messages" );
const SelectionModel = require( "../model/SelectionModel" );
const StateModel     = require( "../model/StateModel" );
const EventFactory   = require( "../factory/EventFactory" );
const PatternFactory = require( "../factory/PatternFactory" );
const Form           = require( "../utils/Form" );
const EventUtil      = require( "../utils/EventUtil" );
const ObjectUtil     = require( "../utils/ObjectUtil" );
const PatternUtil    = require( "../utils/PatternUtil" );
const TemplateUtil   = require( "../utils/TemplateUtil" );

/* private properties */

let wrapper, container, efflux, editorModel, keyboardController, stepHighlight;
let maxChannel, minPatternSelect = 0, maxPatternSelect = 0, interactionData = {},
    stateModel, selectionModel, patternCopy, stepSelect;

let PATTERN_WIDTH = 150; // width of a single track/pattern column

const PatternTrackListController = module.exports =
{
    /**
     * initialize PatternTrackListController
     *
     * @param containerRef
     * @param effluxRef
     * @param keyboardControllerRef
     */
    init( containerRef, effluxRef, keyboardControllerRef )
    {
        efflux             = effluxRef;
        editorModel        = efflux.EditorModel;
        keyboardController = keyboardControllerRef;

        container     = containerRef;
        wrapper       = containerRef.querySelector( ".wrapper" );
        stepSelect    = document.querySelector( "#patternSteps"  );
        stepHighlight = containerRef.querySelector( ".highlight" );

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

        stepSelect.addEventListener( "change", handlePatternStepChange );

        const pSection = document.querySelector( "#patternSection" );
        pSection.addEventListener( "mouseover", handleMouseOver );

        maxChannel = Config.INSTRUMENT_AMOUNT - 1;

        // subscribe to pubsub messaging

        [
            Messages.SONG_LOADED,
            Messages.REFRESH_SONG,
            Messages.REFRESH_PATTERN_VIEW,
            Messages.PATTERN_SWITCH,
            Messages.HIGHLIGHT_ACTIVE_STEP,
            Messages.EDIT_NOTE_AT_POSITION,
            Messages.ADD_EVENT_AT_POSITION,
            Messages.ADD_OFF_AT_POSITION,
            Messages.REMOVE_NOTE_AT_POSITION

        ].forEach(( msg ) => Pubsub.subscribe( msg, handleBroadcast ));
    },

    update()
    {
        let activePattern = editorModel.activePattern;

        if ( activePattern >= efflux.activeSong.patterns.length )
            activePattern = efflux.activeSong.patterns.length - 1;

        // record the current scroll offset of the container so we can restore it after updating of the HTML
        const coordinates = { x: container.scrollLeft, y: container.scrollTop };

        const pattern = efflux.activeSong.patterns[ activePattern ];
        wrapper.innerHTML = TemplateUtil.render( "patternTrackList", {
            steps   : pattern.steps,
            pattern : pattern
        });
        Form.setSelectedOption( stepSelect, pattern.steps );

        container.scrollLeft = coordinates.x;
        container.scrollTop  = coordinates.y;

        highlightActiveStep();
    },

    /* event handlers */

    handleKey( type, keyCode, aEvent )
    {
        if ( type === "down" )
        {
            const curStep    = editorModel.activeStep,
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

                    const maxStep = efflux.activeSong.patterns[ editorModel.activePattern ].steps - 1;

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
                        if ( editorModel.activePattern < ( efflux.activeSong.patterns.length - 1 )) {
                            ++editorModel.activePattern;
                            editorModel.activeInstrument = 0;
                            PatternTrackListController.update();
                        }
                        else
                            editorModel.activeInstrument = maxChannel;

                        Pubsub.publishSync( Messages.PATTERN_SWITCH, editorModel.activePattern );
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

                        Pubsub.publishSync( Messages.PATTERN_SWITCH, editorModel.activePattern );
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
                        let state;

                        if ( !aEvent.shiftKey )
                            state = stateModel.undo();
                        else
                            state = stateModel.redo();

                        if ( state ) {
                            efflux.activeSong = state;
                            PatternTrackListController.update();
                        }
                    }

                    break;

                case 88: // X

                    // cut current selection

                    if ( keyboardController.hasOption( aEvent ))
                    {
                        if ( !selectionModel.hasSelection() ) {
                            selectionModel.setSelectionChannelRange( editorModel.activeInstrument );
                            selectionModel.setSelection( editorModel.activeStep );
                        }
                        selectionModel.cutSelection( efflux.activeSong, editorModel.activePattern );
                        selectionModel.clearSelection();
                        PatternTrackListController.update();
                        saveState();
                    }
                    break;

                case 86: // V

                    // paste current selection
                    if ( keyboardController.hasOption( aEvent )) {
                        selectionModel.pasteSelection(
                            efflux.activeSong, editorModel.activePattern, editorModel.activeInstrument, editorModel.activeStep
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
                            selectionModel.setSelection( editorModel.activeStep );
                        }
                        selectionModel.copySelection( efflux.activeSong, editorModel.activePattern );
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
            selectionModel.clearSelection();
            PatternTrackListController.update();
            break;

        case Messages.HIGHLIGHT_ACTIVE_STEP:
            stepHighlight.style.top = ( payload * 32 ) + "px";
            break;

        case Messages.REFRESH_PATTERN_VIEW:
            PatternTrackListController.update();
            break;

        case Messages.EDIT_NOTE_AT_POSITION:
            editNoteForStep();
            break;

        case Messages.ADD_EVENT_AT_POSITION:
            addEventAtPosition( payload[ 0 ], ( payload.length > 1 ) ? payload[ 1 ] : null );
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
    const pContainers = wrapper.querySelectorAll( ".pattern" ),
          activeStyle = "active", selectedStyle = "selected",
          activeStep = editorModel.activeStep;

    let selection, pContainer, items, item;

    for ( let i = 0, l = pContainers.length; i < l; ++i )
    {
        pContainer = pContainers[ i ];
        selection  = selectionModel.selectedChannels[ i ];
        items      = pContainer.querySelectorAll( "li" );

        let j = items.length;
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
        selectionModel.deleteSelection( efflux.activeSong, editorModel.activePattern );
    else
        PatternFactory.clearEvent( efflux.activeSong.patterns[ editorModel.activePattern ], editorModel.activeInstrument, editorModel.activeStep );

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
        const pContainers = wrapper.querySelectorAll( ".pattern" );
        let selectionChannelStart = editorModel.activeInstrument, selectionStepStart = editorModel.activeStep;
        let found = false, pContainer, items;

        if ( selectionModel.hasSelection() ) {
            selectionChannelStart = selectionModel.firstSelectedChannel;
            selectionStepStart    = selectionModel.minSelectedStep;
        }

        for ( let i = 0, l = pContainers.length; i < l; ++i ) {

            if ( found ) break;

            pContainer = pContainers[ i ];
            items = pContainer.querySelectorAll( "li" );

            let j = items.length;
            while ( j-- )
            {
                if ( items[ j ] === aEvent.target ) {

                    if ( i !== editorModel.activeInstrument ) {
                        editorModel.activeInstrument = i; // when entering a new channel lane, make default instrument match index
                        editorModel.activeInstrument = i;
                    }

                    // if shift was held down, we're making a selection
                    if ( keyboardController.hasShift() ) {
                        selectionModel.setSelectionChannelRange( selectionChannelStart, i );
                        selectionModel.setSelection( selectionStepStart, j );
                    }
                    else
                        selectionModel.clearSelection();

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
    Pubsub.publish( Messages.OPEN_NOTE_ENTRY_PANEL, function()
    {
        // restore interest in keyboard controller events
        keyboardController.setListener( PatternTrackListController );
    });
}

function editModuleParamsForStep()
{
    Pubsub.publish( Messages.OPEN_MODULE_PARAM_PANEL, function()
    {
        // restore interest in keyboard controller events
        keyboardController.setListener( PatternTrackListController );
    });
}

function addOffEvent()
{
    const offEvent = EventFactory.createAudioEvent();
    offEvent.action = 2; // noteOff;
    addEventAtPosition( offEvent );
}

function handlePatternClear( aEvent )
{
    efflux.activeSong.patterns[ editorModel.activePattern ] = PatternFactory.createEmptyPattern( editorModel.amountOfSteps );
    selectionModel.clearSelection();
    PatternTrackListController.update();
}

function handlePatternCopy( aEvent )
{
    patternCopy = ObjectUtil.clone( efflux.activeSong.patterns[ editorModel.activePattern ] );
}

function handlePatternPaste( aEvent )
{
    if ( patternCopy ) {
        PatternFactory.mergePatterns( efflux.activeSong.patterns[ editorModel.activePattern ], patternCopy, editorModel.activePattern );
        PatternTrackListController.update();
    }
}

function handlePatternAdd( aEvent )
{
    const song     = efflux.activeSong,
          patterns = song.patterns;

    if ( patterns.length === Config.MAX_PATTERN_AMOUNT ) {
        Pubsub.publish( Messages.SHOW_ERROR, Copy.get( "ERROR_MAX_PATTERNS", Config.MAX_PATTERN_AMOUNT ));
        return;
    }
    song.patterns = PatternUtil.addEmptyPatternAtIndex( patterns, editorModel.activePattern + 1, editorModel.amountOfSteps );

    Pubsub.publish( Messages.PATTERN_AMOUNT_UPDATED );
    Pubsub.publish( Messages.PATTERN_SWITCH, ++editorModel.activePattern );
}

function handlePatternDelete( aEvent )
{
    const song     = efflux.activeSong,
          patterns = song.patterns;

    if ( patterns.length === 1 )
    {
        handlePatternClear( aEvent );
    }
    else {

        song.patterns = PatternUtil.removePatternAtIndex( patterns, editorModel.activePattern );

        if ( editorModel.activePattern > 0 )
            Pubsub.publish( Messages.PATTERN_SWITCH, --editorModel.activePattern );
        else
            PatternTrackListController.update();

        Pubsub.publish( Messages.PATTERN_AMOUNT_UPDATED );
    }
}

function handlePatternStepChange( aEvent )
{
    const song    = efflux.activeSong,
          pattern = song.patterns[ editorModel.activePattern ];

    const oldAmount = pattern.steps;
    const newAmount = parseInt( Form.getSelectedOption( stepSelect ), 10 );

    // update model values
    pattern.steps = editorModel.amountOfSteps = newAmount;

    pattern.channels.forEach(( channel, index ) =>
    {
        let transformed = new Array( newAmount ), i, j, increment;

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

    Pubsub.publishSync( Messages.PATTERN_STEPS_UPDATED, newAmount );
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

    stateModel.store( ObjectUtil.clone( efflux.activeSong ));
}

/**
 * adds given AudioEvent at the currently highlighted position
 *
 * @param {AUDIO_EVENT} event
 * @param {Object=} optData optional data with event properties
 */
function addEventAtPosition( event, optData )
{
    let patternIndex = editorModel.activePattern,
        channelIndex = editorModel.activeInstrument,
        step         = editorModel.activeStep;

    // if options Object was given, use those values instead of current sequencer values

    if ( optData )
    {
        patternIndex = ( typeof optData.patternIndex === "number" ) ? optData.patternIndex : patternIndex;
        channelIndex = ( typeof optData.channelIndex === "number" ) ? optData.channelIndex : channelIndex;
        step         = ( typeof optData.step         === "number" ) ? optData.step         : step;
    }

    const pattern = efflux.activeSong.patterns[ patternIndex ],
          channel = pattern.channels[ channelIndex ];

    EventUtil.setPosition(
        event, pattern, patternIndex, step,
        efflux.activeSong.meta.tempo
    );

    channel[ step ] = event;

    PatternTrackListController.handleKey( "down", 40 ); // proceed to next line
    PatternTrackListController.update();
    saveState();
}
