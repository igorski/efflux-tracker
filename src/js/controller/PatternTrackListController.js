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

const Pubsub         = require( "pubsub-js" );
const Copy           = require( "../i18n/Copy" );
const Messages       = require( "../definitions/Messages" );
const States         = require( "../definitions/States" );
const EventFactory   = require( "../model/factory/EventFactory" );
const StateFactory   = require( "../model/factory/StateFactory" );
const ListenerUtil   = require( "../utils/ListenerUtil" );
const EventUtil      = require( "../utils/EventUtil" );
const View           = require( "../view/PatternTrackListView" );

/* private properties */

let wrapper, container, efflux, editorModel, selectionModel, keyboardController;
let interactionData = {};

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

        container = containerRef;
        wrapper   = containerRef.querySelector( ".wrapper" );

        View.init( effluxRef, containerRef, wrapper );
        selectionModel = efflux.SelectionModel;

        PatternTrackListController.update(); // sync view with model state

        // add listeners

        wrapper.addEventListener( "click",      handleInteraction );
        wrapper.addEventListener( "dblclick",   handleInteraction );
        ListenerUtil.listen( wrapper, "touchstart", handleInteraction );
        ListenerUtil.listen( wrapper, "touchend",   handleInteraction );

        // subscribe to pubsub messaging

        [
            Messages.SONG_LOADED,
            Messages.REFRESH_SONG,
            Messages.REFRESH_PATTERN_VIEW,
            Messages.PATTERN_SWITCH,
            Messages.EDIT_NOTE_AT_POSITION,
            Messages.ADD_EVENT_AT_POSITION,
            Messages.ADD_OFF_AT_POSITION,
            Messages.REMOVE_NOTE_AT_POSITION,
            Messages.REMOVE_PARAM_AUTOMATION_AT_POSITION,
            Messages.GLIDE_PARAM_AUTOMATIONS,
            Messages.EDIT_MOD_PARAMS_FOR_STEP,
            Messages.EDIT_NOTE_FOR_STEP,
            Messages.HANDLE_KEYBOARD_MOVEMENT

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

        View.render( pattern );

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

        case Messages.GLIDE_PARAM_AUTOMATIONS:
            glideParameterAutomations();
            break;

        case Messages.EDIT_MOD_PARAMS_FOR_STEP:
            editModuleParamsForStep();
            break;

        case Messages.HANDLE_KEYBOARD_MOVEMENT:
            View.focusActiveStep();
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

function glideParameterAutomations() {
    const patternIndex  = efflux.EditorModel.activePattern;
    const channelIndex  = efflux.EditorModel.activeInstrument;
    const channelEvents = efflux.activeSong.patterns[ patternIndex ].channels[ channelIndex ];
    const event         = EventUtil.getFirstEventBeforeStep(
        channelEvents, efflux.EditorModel.activeStep, ( compareEvent ) => {
            return !!compareEvent.mp;
        });
    let createdEvents   = null;

    const addFn = () => {
        const eventIndex = channelEvents.indexOf( event );
        createdEvents = EventUtil.glideModuleParams(
            efflux.activeSong, patternIndex, channelIndex, eventIndex, efflux.eventList
        );
        if ( createdEvents )
            Pubsub.publish( Messages.REFRESH_PATTERN_VIEW );
    };

    if ( event ) {
        addFn();
    }

    if ( createdEvents ) {
        Pubsub.publish( Messages.SAVE_STATE, {
            undo: () => {
                createdEvents.forEach(( event ) => {
                    if ( event.note === "" )
                        EventUtil.clearEventByReference( efflux.activeSong, event, efflux.eventList );
                    else
                        event.mp = null;
                });
                Pubsub.publish( Messages.REFRESH_PATTERN_VIEW );
            },
            redo: addFn
        });
    } else
        Pubsub.publish( Messages.SHOW_ERROR, getCopy( "ERROR_PARAM_GLIDE" ));
}

function handleInteraction( aEvent ) {
    // for touch interactions, we record some data as soon as touch starts so we can evaluate it on end

    if ( aEvent.type === "touchstart" ) {
        interactionData.offset = window.scrollY;
        interactionData.time   = Date.now();
        return;
    }

    if ( aEvent.target.nodeName === "LI" )
        View.handleSlotClick( aEvent, keyboardController, PatternTrackListController );

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
                View.highlightActiveStep();
                View.focusActiveStep();
            }
            PatternTrackListController.update();
        }
    });

    if ( optStoreInUndoRedo )
        Pubsub.publishSync( Messages.SAVE_STATE, undoRedoAction );
}
