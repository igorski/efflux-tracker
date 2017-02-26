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
const Form               = require( "../utils/Form" );
const Manual             = require( "../definitions/Manual" );
const ModuleParamHandler = require( "./keyboard/ModuleParamHandler" );
const Messages           = require( "../definitions/Messages" );
const SettingsModel      = require( "../model/SettingsModel" );
const Pubsub             = require( "pubsub-js" );

/* private properties */

let container, element, efflux, keyboardController;
let data, selectedModule, selectedGlide = false, lastTypeAction = 0, prevChar = 0, lastEditedModule,
    closeCallback, moduleList, valueDisplay, glideOptions, valueControl;

const ModuleParamController = module.exports =
{
    /**
     * initialize ModuleParamController
     *
     * @param containerRef
     * @param effluxRef
     * @param keyboardControllerRef
     */
    init( containerRef, effluxRef, keyboardControllerRef )
    {
        container          = containerRef;
        efflux             = effluxRef;
        keyboardController = keyboardControllerRef;

        efflux.TemplateService.renderAsElement( "moduleParamEntry").then(( template ) => {

            element = template;

            // grab view elements

            moduleList   = element.querySelectorAll( "#moduleSelect li" );
            glideOptions = element.querySelectorAll( "input[type=radio]" );
            valueControl = element.querySelector( "#moduleValue" );
            valueDisplay = element.querySelector( "#moduleInputValue" );

            lastEditedModule = moduleList[ 0 ].getAttribute( "data-value" );

            // add listeners

            element.querySelector( ".close-button" ).addEventListener  ( "click", handleClose );
            element.querySelector( ".help-button" ).addEventListener   ( "click", handleHelp );
            element.querySelector( ".confirm-button" ).addEventListener( "click", handleReady );
            element.querySelector( "#moduleSelect").addEventListener   ( "click", handleModuleClick );
            valueControl.addEventListener( "input", handleValueChange );
        });

        // subscribe to messaging system

        [
            Messages.OPEN_MODULE_PARAM_PANEL,
            Messages.CLOSE_OVERLAYS

        ].forEach(( msg ) => Pubsub.subscribe( msg, handleBroadcast ));
    },

    /* event handlers */

    handleKey( type, keyCode, event )
    {
        if ( type === "down" )
        {
            switch ( keyCode )
            {
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
                    setSelectedValueInList( moduleList, selectedModule );
                    break;

                case 71: // G
                    selectedGlide = !( Form.getCheckedOption( glideOptions ) === "true" );
                    Form.setCheckedOption( glideOptions, selectedGlide );
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

                    const now   = Date.now();
                    const num   = parseFloat( String.fromCharCode( keyCode ));
                    let value = num * 10;

                    // if this character was typed shortly after the previous one, combine
                    // their numerical values for more precise control

                    if ( now - lastTypeAction < 500 )
                        value = parseFloat( "" + prevChar + num );

                    valueControl.value = value;
                    handleValueChange( null );
                    lastTypeAction = now;
                    prevChar = num;
                    break;
            }
        }
    }
};

/* private methods */

function handleBroadcast( type, payload )
{
    switch ( type )
    {
        case Messages.OPEN_MODULE_PARAM_PANEL:
            handleOpen( payload );
            break;

        case Messages.CLOSE_OVERLAYS:

            if ( payload !== ModuleParamController )
                handleClose();
            break;
    }
}

/**
 * open module param entry pane
 *
 * @param {Function} completeCallback
 */
function handleOpen( completeCallback )
{
    const editorModel  = efflux.EditorModel,
          patternIndex = editorModel.activePattern,
          pattern      = efflux.activeSong.patterns[ patternIndex ],
          channelIndex = editorModel.activeInstrument,
          channel      = pattern.channels[ channelIndex ],
          event        = channel[ editorModel.activeStep ];

    data =
    {
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

    setSelectedValueInList( moduleList, data.module );
    Form.setCheckedOption( glideOptions, data.glide );
    valueControl.value = data.value;
    handleValueChange( null ); // shows numerical value

    if ( !element.parentNode )
        container.appendChild( element );
}

function handleClose()
{
    if ( typeof closeCallback === "function" )
        closeCallback( null );

    Pubsub.publishSync( Messages.HIDE_BLIND );

    keyboardController.reset();

    if ( element.parentNode ) {
        element.parentNode.removeChild( element );
    }
    closeCallback = null;
}

function handleHelp( aEvent )
{
    window.open( Manual.PARAM_ENTRY_HELP, "_blank" );
}

function handleReady()
{
    data.module = lastEditedModule = getSelectedValueFromList( moduleList );
    data.value  = parseFloat( valueControl.value );
    data.glide  = ( Form.getCheckedOption( glideOptions ) === "true" );

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

/* module selection */

function handleModuleClick( aEvent )
{
    const target = aEvent.target;
    if ( target.nodeName === "LI" ) {
        setSelectedValueInList( moduleList, target.getAttribute( "data-value" ));
    }
}

function handleValueChange( aEvent )
{
    const value = parseFloat( valueControl.value );
    valueDisplay.innerHTML = ( value < 10 ) ? "0" + value : value;
}

/* list functions */

function setSelectedValueInList( list, value )
{
    value = value.toString();
    let i = list.length, option;

    while ( i-- )
    {
        option = list[ i ];

        if ( option.getAttribute( "data-value" ) === value )
            option.classList.add( "selected" );
        else
            option.classList.remove( "selected" );
    }
}

function getSelectedValueFromList( list )
{
    let i = list.length, option;
    while ( i-- )
    {
        option = list[ i ];
        if ( option.classList.contains( "selected" ))
            return option.getAttribute( "data-value" );
    }
    return null;
}
