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
const EventFactory   = require( "../factory/EventFactory" );
const PatternFactory = require( "../factory/PatternFactory" );
const Form           = require( "../utils/Form" );
const EventUtil      = require( "../utils/EventUtil" );
const ObjectUtil     = require( "../utils/ObjectUtil" );
const PatternUtil    = require( "../utils/PatternUtil" );

/* private properties */

let wrapper, container, efflux, editorModel, keyboardController, stepHighlight;
let interactionData = {},
    selectionModel, patternCopy, stepSelect;

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

        selectionModel = efflux.SelectionModel;

        PatternTrackListController.update(); // sync view with model state

        // add listeners

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

        // subscribe to pubsub messaging

        [
            Messages.SONG_LOADED,
            Messages.REFRESH_SONG,
            Messages.REFRESH_PATTERN_VIEW,
            Messages.PATTERN_SWITCH,
            Messages.PATTERN_SET_HOR_SCROLL,
            Messages.HIGHLIGHT_ACTIVE_STEP,
            Messages.EDIT_NOTE_AT_POSITION,
            Messages.ADD_EVENT_AT_POSITION,
            Messages.ADD_OFF_AT_POSITION,
            Messages.REMOVE_NOTE_AT_POSITION,
            Messages.EDIT_MOD_PARAMS_FOR_STEP,
            Messages.EDIT_NOTE_FOR_STEP

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
        efflux.TemplateService.render( "patternTrackList", wrapper, {

            steps   : pattern.steps,
            pattern : pattern

        }).then( highlightActiveStep );

        Form.setSelectedOption( stepSelect, pattern.steps );
        container.scrollLeft = coordinates.x;
        container.scrollTop  = coordinates.y;
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
            PatternTrackListController.update();
            wrapper.focus();
            break;

        case Messages.PATTERN_SWITCH:
            selectionModel.clearSelection();
            PatternTrackListController.update();
            break;

        case Messages.PATTERN_SET_HOR_SCROLL:
            container.scrollLeft = payload;
            break;

        case Messages.HIGHLIGHT_ACTIVE_STEP:
            stepHighlight.style.top = ( payload * 32 ) + "px";
            highlightActiveStep();
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

        case Messages.EDIT_MOD_PARAMS_FOR_STEP:
            editModuleParamsForStep();
            break;

        case Messages.EDIT_NOTE_FOR_STEP:
            editNoteForStep();
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
    Pubsub.publish( Messages.SAVE_STATE );
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
    Pubsub.publish( Messages.OPEN_NOTE_ENTRY_PANEL, function() {
        keyboardController.setListener( PatternTrackListController ); // restore interest in keyboard controller events
    });
}

function editModuleParamsForStep()
{
    Pubsub.publish( Messages.OPEN_MODULE_PARAM_PANEL, function() {
        keyboardController.setListener( PatternTrackListController ); // restore interest in keyboard controller events
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

    Pubsub.publish( Messages.PATTERN_STEPS_UPDATED, newAmount );
    PatternTrackListController.update(); // sync with model
}

function handleMouseOver( aEvent )
{
    Pubsub.publish( Messages.DISPLAY_HELP, "helpTopicPattern" );
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

    // TODO: duplicate from KeyboardController !! (this moves to the next step in the track)
    const maxStep = efflux.activeSong.patterns[ editorModel.activePattern ].steps - 1;

    if ( ++editorModel.activeStep > maxStep )
        editorModel.activeStep = maxStep;

    selectionModel.clearSelection();

    Pubsub.publishSync( Messages.HIGHLIGHT_ACTIVE_STEP );
    // E.O. TODO

    PatternTrackListController.update();
    Pubsub.publish( Messages.SAVE_STATE );
}
