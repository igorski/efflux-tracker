/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2017 - http://www.igorski.nl
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

const EventFactory       = require( "../model/factory/EventFactory" );
const View               = require( "../view/ModuleParamView" );
const ModuleParamHandler = require( "./keyboard/ModuleParamHandler" );
const Messages           = require( "../definitions/Messages" );
const SettingsModel      = require( "../model/SettingsModel" );
const Pubsub             = require( "pubsub-js" );

/* private properties */

let container, efflux, keyboardController;
let data, selectedModule, lastEditedModule, lastTypeAction = 0, prevChar = 0, closeCallback;

const ModuleParamController = module.exports =
{
    /**
     * initialize ModuleParamController
     *
     * @param containerRef
     * @param effluxRef
     * @param keyboardControllerRef
     */
    init( containerRef, effluxRef, keyboardControllerRef ) {

        container          = containerRef;
        efflux             = effluxRef;
        keyboardController = keyboardControllerRef;

        View.init( efflux, handleViewMessage ).then(() => {
            lastEditedModule = View.getValue();
        });

        // subscribe to messaging system

        [
            Messages.OPEN_MODULE_PARAM_PANEL,
            Messages.CLOSE_OVERLAYS

        ].forEach(( msg ) => Pubsub.subscribe( msg, handleBroadcast ));
    },

    /* event handlers */

    handleKey( type, keyCode, event ) {

        if ( type !== "down" )
            return;

        switch ( keyCode ) {
            case 27: // escape
                handleClose();
                break;

            case 13: // enter
                handleReady();
                break;

            // modules and parameters

            case 68: // D
            case 70: // F
            case 80: // P
            case 86: // V
                selectedModule = ModuleParamHandler.getNextSelectedModule( keyCode, selectedModule );
                View.setSelectedValueInList( View.moduleList, selectedModule );
                break;

            case 71: // G
                View.toggleGlide();
                break;

            // module parameter value

            case 48: // 0 through 9
            case 49:
            case 50:
            case 51:
            case 52:
            case 53:
            case 54:
            case 55:
            case 56:
            case 57:

                const now = Date.now();
                const num = parseFloat( String.fromCharCode( keyCode ));
                let value = num * 10;

                // if this character was typed shortly after the previous one, combine
                // their numerical values for more precise control

                if ( now - lastTypeAction < 500 )
                    value = parseFloat( "" + prevChar + num );

                View.setValue( value );
                lastTypeAction = now;
                prevChar = num;
                break;
        }
    }
};

/* private methods */

function handleBroadcast( type, payload ) {
    switch ( type ) {
        case Messages.OPEN_MODULE_PARAM_PANEL:
            handleOpen( payload );
            break;

        case Messages.CLOSE_OVERLAYS:

            if ( payload !== ModuleParamController )
                handleClose();
            break;
    }
}

function handleViewMessage( type ) {
    switch ( type ) {
        case View.EVENTS.READY:
            handleReady();
            break;
        case View.EVENTS.CLOSE:
            handleClose();
            break;
    }
}

/**
 * open module param entry pane
 *
 * @param {Function} completeCallback
 */
function handleOpen( completeCallback ) {

    const editorModel  = efflux.EditorModel,
          patternIndex = editorModel.activePattern,
          pattern      = efflux.activeSong.patterns[ patternIndex ],
          channelIndex = editorModel.activeInstrument,
          channel      = pattern.channels[ channelIndex ],
          event        = channel[ editorModel.activeStep ];

    data = {
        instrument   : ( event ) ? event.instrument : editorModel.activeInstrument,
        module       : ( event && event.mp ) ? event.mp.module  : lastEditedModule,
        glide        : ( event && event.mp ) ? event.mp.glide   : false,
        value        : ( event && event.mp ) ? event.mp.value   : 50,
        patternIndex : ( event ) ? event.seq.startMeasure : patternIndex,
        channelIndex : channelIndex, // always use channel index (event instrument might be associated w/ different channel lane)
        step         : editorModel.activeStep
    };

    Pubsub.publishSync( Messages.CLOSE_OVERLAYS, ModuleParamController ); // close open overlays
    Pubsub.publish( Messages.SHOW_BLIND );

    closeCallback  = completeCallback;
    selectedModule = data.module;

    keyboardController.setBlockDefaults( false );
    keyboardController.setListener( ModuleParamController );

    selectedModule = data.module;
    View.setSelectedValueInList( View.moduleList, data.module );
    View.setGlide( data.glide );
    View.setValue( data.value );

    View.inject( container );
}

function handleClose() {

    if ( typeof closeCallback === "function" )
        closeCallback( null );

    View.remove();
    Pubsub.publishSync( Messages.HIDE_BLIND );

    keyboardController.reset();
    closeCallback = null;
}

function handleReady() {
    data.module = lastEditedModule = View.getSelectedValueFromList( View.moduleList );
    data.value  = View.getValue();
    data.glide  = View.hasGlide();

    // update model and view

//    if ( EventValidator.hasContent( data )) {

        const pattern = efflux.activeSong.patterns[ data.patternIndex ],
             channel = pattern.channels[ data.channelIndex ];

        let event        = channel[ data.step ];
        const isNewEvent = !event;

        if ( isNewEvent )
            event = EventFactory.createAudioEvent();

        event.mp         = data;
        event.instrument = data.instrument;

        Pubsub.publish( Messages.ADD_EVENT_AT_POSITION, [ event, {
            patternIndex : data.patternIndex,
            channelIndex : data.channelIndex,
            step         : data.step,
            newEvent     : isNewEvent
        } ]);
//    }
    handleClose();
}
