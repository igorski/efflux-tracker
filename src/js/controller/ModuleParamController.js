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

const EventFactory       = require( "../model/factory/EventFactory" );
const View               = require( "../view/ModuleParamView" );
const ModuleParamHandler = require( "./keyboard/ModuleParamHandler" );
const Messages           = require( "../definitions/Messages" );
const Pubsub             = require( "pubsub-js" );

/* private properties */

let container, efflux, keyboardController;
let data, selectedModule, lastEditedModule, lastTypeAction = 0, prevChar = 0, closeCallback;

const ModuleParamController = module.exports =
{
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

