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

const Pubsub               = require( "pubsub-js" );
const Config               = require( "../config/Config" );
const Messages             = require( "../definitions/Messages" );
const States               = require( "../definitions/States" );
const EventFactory         = require( "../model/factory/EventFactory" );
const PatternFactory       = require( "../model/factory/PatternFactory" );
const StateFactory         = require( "../model/factory/StateFactory" );
const Form                 = require( "../utils/Form" );
const ListenerUtil         = require( "../utils/ListenerUtil" );
const EventUtil            = require( "../utils/EventUtil" );
const ObjectUtil           = require( "../utils/ObjectUtil" );
const PatternUtil          = require( "../utils/PatternUtil" );
const PatternTrackListView = require( "../view/PatternTrackListView" );

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

        PatternTrackListView.init( effluxRef, wrapper );
        selectionModel = efflux.SelectionModel;

        PatternTrackListController.update(); // sync view with model state

        // add listeners

        wrapper.addEventListener( "click",      handleInteraction );
        wrapper.addEventListener( "dblclick",   handleInteraction );
        ListenerUtil.listen( wrapper, "touchstart", handleInteraction );
        ListenerUtil.listen( wrapper, "touchend",   handleInteraction );

        document.querySelector( "#patternClear"  ).addEventListener( "click",  handlePatternClear );
        document.querySelector( "#patternCopy"   ).addEventListener( "click",  handlePatternCopy );
        document.querySelector( "#patternPaste"  ).addEventListener( "click",  handlePatternPaste );
        document.querySelector( "#patternAdd"    ).addEventListener( "click",  handlePatternAdd );
        document.querySelector( "#patternDelete" ).addEventListener( "click",  handlePatternDelete );
        document.querySelector( "#patternAdvanced" ).addEventListener( "click", handlePatternAdvanced );

        stepSelect.addEventListener( "change", handlePatternStepChange );

        if ( Config.canHover() ) {
            const pSection = document.querySelector( "#patternSection" );
            pSection.addEventListener( "mouseover", handleMouseOver );
        }

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
            Messages.REMOVE_PARAM_AUTOMATION_AT_POSITION,
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

        PatternTrackListView.render( pattern );

        Form.setSelectedOption( stepSelect, pattern.steps );
        container.scrollLeft = coordinates.x;
        container.scrollTop  = coordinates.y;
    },

    editNoteForStep() {
        Pubsub.publish( Messages.OPEN_NOTE_ENTRY_PANEL, function() {
            keyboardController.setListener( PatternTrackListController ); // restore interest in keyboard controller events
        });
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
            editorModel.activeSlot = -1;
            PatternTrackListController.update();
            break;

        case Messages.PATTERN_SET_HOR_SCROLL:
            container.scrollLeft = payload;
            break;

        case Messages.HIGHLIGHT_ACTIVE_STEP:
            if ( typeof payload === "number" )
                stepHighlight.style.top = ( payload * 32 ) + "px";

            PatternTrackListView.highlightActiveStep();
            break;

        case Messages.REFRESH_PATTERN_VIEW:
            PatternTrackListController.update();
            break;

        case Messages.EDIT_NOTE_AT_POSITION:
        case Messages.EDIT_NOTE_FOR_STEP:
            PatternTrackListController.editNoteForStep();
            break;

        case Messages.ADD_EVENT_AT_POSITION:
            addEventAtPosition.apply( this, payload );
            break;

        case Messages.ADD_OFF_AT_POSITION:
            addOffEvent();
            break;

        case Messages.REMOVE_NOTE_AT_POSITION:
            removeEventAtHighlightedStep();
            break;

        case Messages.REMOVE_PARAM_AUTOMATION_AT_POSITION:
            removeModuleParamAutomationAtHighlightedStep();
            break;

        case Messages.EDIT_MOD_PARAMS_FOR_STEP:
            editModuleParamsForStep();
            break;
    }
}

function removeEventAtHighlightedStep() {
    Pubsub.publishSync(
        Messages.SAVE_STATE,
        StateFactory.getAction( States.DELETE_EVENT, {
            efflux:        efflux,
            addHandler:    addEventAtPosition,
            updateHandler: PatternTrackListController.update
        })
    );
}

function removeModuleParamAutomationAtHighlightedStep() {
    // TODO: create shared getter function?
    const event = efflux.activeSong.patterns[ editorModel.activePattern ]
                                   .channels[ editorModel.activeInstrument ][ editorModel.activeStep ];

    if ( !event || !event.mp )
        return;

    Pubsub.publishSync(
        Messages.SAVE_STATE,
        StateFactory.getAction( States.DELETE_MODULE_AUTOMATION, {
            event:   event,
            updateHandler: PatternTrackListController.update
        })
    );
}

function handleInteraction( aEvent ) {
    // for touch interactions, we record some data as soon as touch starts so we can evaluate it on end

    if ( aEvent.type === "touchstart" ) {
        interactionData.offset = window.scrollY;
        interactionData.time   = Date.now();
        return;
    }

    if ( aEvent.target.nodeName === "LI" )
        PatternTrackListView.handleSlotClick( aEvent, keyboardController, PatternTrackListController );

    Pubsub.publish( Messages.DISPLAY_HELP, "helpTopicTracker" );
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
    Pubsub.publishSync( Messages.CREATE_LINKED_LISTS );
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
        Pubsub.publishSync( Messages.CREATE_LINKED_LISTS );
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

function handlePatternAdvanced( aEvent ) {
    Pubsub.publish( Messages.OPEN_ADVANCED_PATTERN_EDITOR );
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
 * adds given AudioEvent at the currently highlighted position or step defined in optData
 *
 * @param {AUDIO_EVENT} event
 * @param {Object=} optData optional data with event properties
 * @param {boolean=} optStoreInUndoRedo optional, whether to store in state history, defaults to true
 */
function addEventAtPosition( event, optData, optStoreInUndoRedo )
{
    optStoreInUndoRedo   = ( typeof optStoreInUndoRedo === "boolean" ) ? optStoreInUndoRedo : true;
    const undoRedoAction = StateFactory.getAction( States.ADD_EVENT, {
        efflux:        efflux,
        event:         event,
        optEventData:  optData,
        updateHandler: ( optHighlightActiveStep ) => {

            if ( optStoreInUndoRedo && optHighlightActiveStep === true ) {
                // move to the next step in the pattern (unless executed from undo/redo)
                const maxStep = efflux.activeSong.patterns[ editorModel.activePattern ].steps - 1;

                if ( ++editorModel.activeStep > maxStep )
                    editorModel.activeStep = maxStep;

                selectionModel.clearSelection();
                PatternTrackListView.highlightActiveStep();
            }
            PatternTrackListController.update();
        }
    });

    if ( optStoreInUndoRedo )
        Pubsub.publishSync( Messages.SAVE_STATE, undoRedoAction );
}
