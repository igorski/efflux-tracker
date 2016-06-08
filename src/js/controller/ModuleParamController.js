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
var TemplateUtil = require( "../utils/TemplateUtil" );
var EventFactory = require( "../factory/EventFactory" );
var Form         = require( "../utils/Form" );
var Manual       = require( "../definitions/Manual" );
var Messages     = require( "../definitions/Messages" );
var Pubsub       = require( "pubsub-js" );

/* private properties */

var container, element, efflux, keyboardController;
var data, selectedModule, selectedGlide = false, lastTypeAction = 0, prevChar = 0, closeCallback,
    moduleList, valueDisplay, glideOptions, valueControl;

var ModuleParamController = module.exports =
{
    /**
     * initialize ModuleParamController
     *
     * @param containerRef
     * @param effluxRef
     * @param keyboardControllerRef
     */
    init : function( containerRef, effluxRef, keyboardControllerRef )
    {
        container          = containerRef;
        efflux             = effluxRef;
        keyboardController = keyboardControllerRef;

        element = TemplateUtil.renderAsElement( "moduleParamEntry" );

        // grab view elements

        moduleList   = element.querySelectorAll( "#moduleSelect li" );
        glideOptions = element.querySelectorAll( "input[type=radio]" );
        valueControl = element.querySelector( "#moduleValue" );
        valueDisplay = element.querySelector( "#moduleInputValue" );

        // add listeners

        element.querySelector( ".close-button" ).addEventListener  ( "click", handleClose );
        element.querySelector( ".help-button" ).addEventListener   ( "click", handleHelp );
        element.querySelector( ".confirm-button" ).addEventListener( "click", handleReady );
        element.querySelector( "#moduleSelect").addEventListener   ( "click", handleModuleClick );
        valueControl.addEventListener( "input", handleValueChange );

        // subscribe to messaging system

        [
            Messages.OPEN_MODULE_PARAM_PANEL,
            Messages.CLOSE_OVERLAYS

        ].forEach( function( msg )
        {
            Pubsub.subscribe( msg, handleBroadcast );
        });
    },

    /* event handlers */

    handleKey : function( type, keyCode, event )
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
                    selectedModule = getNextSelectedModule( [ "delayEnabled", "delayTime", "delayFeedback", "delayCutoff", "delayOffset" ], selectedModule );
                    setSelectedValueInList( moduleList, selectedModule );
                    break;

                case 70: // F
                    selectedModule = getNextSelectedModule( [ "filterEnabled", "filterFreq", "filterQ", "filterLFOEnabled", "filterLFOSpeed", "filterLFODepth" ], selectedModule );
                    setSelectedValueInList( moduleList, selectedModule );
                    break;

                case 71: // G
                    selectedGlide = !( Form.getCheckedOption( glideOptions ) === "true" );
                    Form.setCheckedOption( glideOptions, selectedGlide );
                    break;

                case 80: // P
                    selectedModule = getNextSelectedModule([ "pitchUp", "pitchDown" ], selectedModule );
                    setSelectedValueInList( moduleList, selectedModule );
                    break;

                case 86: // V
                    selectedModule = "volume";
                    setSelectedValueInList( moduleList, selectedModule );
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

                    var now   = Date.now();
                    var num   = parseFloat( String.fromCharCode( keyCode ));
                    var value = num * 10;

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
    var editorModel  = efflux.EditorModel,
        patternIndex = editorModel.activePattern,
        pattern      = efflux.activeSong.patterns[ patternIndex ],
        channelIndex = editorModel.activeInstrument,
        channel      = pattern.channels[ channelIndex ],
        event        = channel[ editorModel.activeStep ];

    data =
    {
        instrument   : ( event ) ? event.instrument : editorModel.activeInstrument,
        module       : ( event && event.mp ) ? event.mp.module  : moduleList[ 0 ].getAttribute( "data-value" ),
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

    dispose();
}

function handleHelp( aEvent )
{
    window.open( Manual.PARAM_ENTRY_HELP, "_blank" );
}

function handleReady()
{
    data.module = getSelectedValueFromList( moduleList );
    data.value  = parseFloat( valueControl.value );
    data.glide  = ( Form.getCheckedOption( glideOptions ) === "true" );

    // update model and view

//    if ( EventUtil.isValid( data )) {

        var pattern = efflux.activeSong.patterns[ data.patternIndex ],
            channel = pattern.channels[ data.channelIndex ],
            event   = channel[ data.step ];

        if ( !event )
            event = EventFactory.createAudioEvent();

        event.mp         = data;
        event.instrument = data.instrument;

        Pubsub.publish( Messages.ADD_EVENT_AT_POSITION, [ event, {
            patternIndex : data.patternIndex,
            channelIndex : data.channelIndex,
            step         : data.step
        } ]);
//    }
    handleClose();
}

function dispose()
{
    keyboardController.setBlockDefaults( true );

    if ( element.parentNode ) {
        element.parentNode.removeChild( element );
    }
    closeCallback = null;
}

/* module selection */

function handleModuleClick( aEvent )
{
    var target = aEvent.target;
    if ( target.nodeName === "LI" ) {
        setSelectedValueInList( moduleList, target.getAttribute( "data-value" ));
    }
}

function handleValueChange( aEvent )
{
    var value = parseFloat( valueControl.value );
    valueDisplay.innerHTML = ( value < 10 ) ? "0" + value : value;
}

/* list functions */

function setSelectedValueInList( list, value )
{
    value = value.toString();
    var i = list.length, option;

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
    var i = list.length, option;
    while ( i-- )
    {
        option = list[ i ];
        if ( option.classList.contains( "selected" ))
            return option.getAttribute( "data-value" );
    }
    return null;
}

function getNextSelectedModule( list, currentValue )
{
    for ( var i = 0, l = list.length, max = l - 1; i <l; ++i )
    {
        if ( list[ i ] === currentValue ) {

            // value found, return next value in list (or first if we're at the list end)

            if ( i < max )
                return list[ i + 1 ];
            else
                break;
        }
    }
    return list[ 0 ]; // value not found, return first value in list
}
