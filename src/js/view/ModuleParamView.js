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

const Form   = require( "../utils/Form" );
const Manual = require( "../definitions/Manual" );

let efflux, element,
    valueDisplay, glideOptions, valueControl;


const self = module.exports = {

    // View-Controller communication messages (via init() listener)

    EVENTS: {
        CLOSE: 0,
        READY: 1
    },
    moduleList: null,

    /**
     * @public
     * @param {Object} effluxRef reference to Efflux namespace (see main.js)
     * @param {!Function} listener handler for this Views state change events
     * @return {Promise}
     */
    init( effluxRef, listener ) {

        efflux = effluxRef;

        return new Promise(( resolve, reject ) => {
            efflux.TemplateService.renderAsElement( "moduleParamEntry").then(( template ) => {

                element = template;

                // grab view elements

                self.moduleList = element.querySelectorAll( "#moduleSelect li" );
                glideOptions    = element.querySelectorAll( "input[type=radio]" );
                valueControl    = element.querySelector( "#moduleValue" );
                valueDisplay    = element.querySelector( "#moduleInputValue" );

                // add listeners

                element.querySelector( ".help-button" ).addEventListener   ( "click", handleHelp );
                element.querySelector( ".confirm-button" ).addEventListener( "click", ( e ) => {
                    listener( self.EVENTS.READY );
                });
                element.querySelector( ".close-button" ).addEventListener( "click", ( e ) => {
                    listener( self.EVENTS.CLOSE );
                });
                element.querySelector( "#moduleSelect").addEventListener( "click", handleModuleClick );
                valueControl.addEventListener( "input", handleValueChange );

                resolve();
            });
        });
    },

    inject( container ) {
        if ( !element.parentNode )
            container.appendChild( element );
    },

    remove() {
        if ( element.parentNode ) {
            element.parentNode.removeChild( element );
        }
    },

    /* toggle the glide state for the module parameter */

    toggleGlide() {
        Form.setCheckedOption( glideOptions, !self.hasGlide() );
    },

    setGlide( value ) {
        Form.setCheckedOption( glideOptions, value );
    },

    hasGlide() {
        return ( Form.getCheckedOption( glideOptions ) === "true" );
    },

    /* the value for the module parameter */

    getValue() {
        return parseFloat( valueControl.value );
    },

    setValue( value ) {
        valueControl.value = value;
        handleValueChange( null ); // shows numerical value
    },

    /* list functions */

    setSelectedValueInList( list, value ) {
        value = value.toString();
        let i = list.length, option;

        while ( i-- ) {
            option = list[ i ];

            if ( option.getAttribute( "data-value" ) === value )
                option.classList.add( "selected" );
            else
                option.classList.remove( "selected" );
        }
    },

    getSelectedValueFromList( list ) {
        let i = list.length, option;
        while ( i-- ) {
            option = list[ i ];
            if ( option.classList.contains( "selected" ))
                return option.getAttribute( "data-value" );
        }
        return null;
    }
};

/* event handlers */

function handleHelp( aEvent ) {
    window.open( Manual.PARAM_ENTRY_HELP, "_blank" );
}

function handleModuleClick( aEvent ) {
    const target = aEvent.target;
    if ( target.nodeName === "LI" ) {
        self.setSelectedValueInList( self.moduleList, target.getAttribute( "data-value" ));
    }
}

function handleValueChange( aEvent ) {
    const value = parseFloat( valueControl.value );
    valueDisplay.innerHTML = ( value < 10 ) ? "0" + value : value;
}
