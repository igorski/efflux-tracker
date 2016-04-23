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
var Form         = require( "../utils/Form" );
var Messages     = require( "../definitions/Messages" );
var Pubsub       = require( "pubsub-js" );

/* private properties */

var container, element, tracker, keyboardController;
var data, closeCallback;

var ModuleParamController = module.exports =
{
    /**
     * initialize ModuleParamController
     *
     * @param containerRef
     * @param trackerRef
     * @param keyboardControllerRef
     */
    init : function( containerRef, trackerRef, keyboardControllerRef )
    {
        container          = containerRef;
        tracker            = trackerRef;
        keyboardController = keyboardControllerRef;

        element = TemplateUtil.renderAsElement( "moduleParamEntry" );

        // grab view elements

        // add listeners

        element.querySelector( ".close-button" ).addEventListener  ( "click", handleClose );
        element.querySelector( ".confirm-button" ).addEventListener( "click", handleReady );

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
    var editorModel = tracker.EditorModel;
    var pattern     = tracker.activeSong.patterns[ editorModel.activePattern ];
    var channel     = pattern.channels[ editorModel.activeInstrument ];
    var event       = channel[ editorModel.activeStep ];

    data =
    {
        module : ( event && event.mp ) ? event.mp.module : "",
        value  : ( event && event.mp ) ? event.mp.value  : 50
    };

    Pubsub.publishSync( Messages.CLOSE_OVERLAYS, ModuleParamController ); // close open overlays

    closeCallback = completeCallback;

    keyboardController.setBlockDefaults( false );
    keyboardController.setListener( ModuleParamController );

    if ( !element.parentNode )
        container.appendChild( element );
}

function handleClose()
{
    if ( typeof closeCallback === "function" )
        closeCallback( null );

    dispose();
}

function handleReady()
{
    data.instrument = Form.getSelectedOption( instrumentSelect );
    data.note       = getSelectedValueFromList( noteList );
    data.octave     = parseFloat( getSelectedValueFromList( octaveList ));

    if ( typeof closeCallback === "function" )
        closeCallback( data );

    dispose();
}

function dispose()
{
    keyboardController.setBlockDefaults( true );

    if ( element.parentNode ) {
        element.parentNode.removeChild( element );
    }
    closeCallback = null;
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
