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

const Messages       = require( "../definitions/Messages" );
const EventFactory   = require( "../model/factory/EventFactory" );
const PatternFactory = require( "../model/factory/PatternFactory" );
const ObjectUtil     = require( "../utils/ObjectUtil" );
const Form           = require( "../utils/Form" );
const Pubsub         = require( "pubsub-js" );

/* private properties */

let container, element, efflux, keyboardController;
let firstPattern, lastPattern, firstChannel, lastChannel, pastePattern;

const AdvancedPatternEditorController = module.exports =
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

        efflux.TemplateService.renderAsElement( "advancedPatternEditor" ).then(( template ) => {

            element = template;

            // grab view elements

            firstPattern = element.querySelector( "#apeFirstPattern" );
            lastPattern  = element.querySelector( "#apeLastPattern" );
            firstChannel = element.querySelector( "#apeFirstChannel" );
            lastChannel  = element.querySelector( "#apeLastChannel" );
            pastePattern = element.querySelector( "#apePastePattern" );

            // add listeners

            element.querySelector( ".close-button" ).addEventListener  ( "click", handleClose );
            element.querySelector( ".confirm-button" ).addEventListener( "click", handleConfirm );
        });

        // subscribe to messaging system

        [
            Messages.OPEN_ADVANCED_PATTERN_EDITOR,
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
                    handleConfirm();
                    break;
            }
        }
    }
};

/* private methods */

function handleBroadcast( type, payload ) {

    switch ( type ) {

        case Messages.OPEN_ADVANCED_PATTERN_EDITOR:
            handleOpen();
            break;

        case Messages.CLOSE_OVERLAYS:

            if ( payload !== AdvancedPatternEditorController )
                handleClose();
            break;
    }
}

/**
 * open advanced pattern editor
 */
function handleOpen() {

    Pubsub.publishSync( Messages.CLOSE_OVERLAYS, AdvancedPatternEditorController ); // close open overlays
    Pubsub.publish( Messages.SHOW_BLIND );

    const song             = efflux.activeSong;
    const amountOfPatterns = song.patterns.length;

    firstPattern.setAttribute( "max", amountOfPatterns );
    lastPattern.setAttribute ( "max", amountOfPatterns );
    pastePattern.setAttribute( "max", amountOfPatterns );

    firstPattern.value =
    lastPattern.value  = efflux.EditorModel.activePattern + 1;
    firstChannel.value = 1;
    lastChannel.value  = song.instruments.length;
    pastePattern.value = amountOfPatterns;

    Form.focus( firstPattern );

    keyboardController.setBlockDefaults( false );
    keyboardController.setListener( AdvancedPatternEditorController );

    if ( !element.parentNode )
        container.appendChild( element );
}

function handleClose() {

    Pubsub.publishSync( Messages.HIDE_BLIND );
    keyboardController.reset();

    if ( element.parentNode ) {
        element.parentNode.removeChild( element );
    }
}

function handleConfirm() {

    const song            = efflux.activeSong;
    const patterns        = song.patterns;
    const maxPatternValue = patterns.length - 1;
    const maxChannelValue = song.instruments.length - 1;

    const firstPatternValue = Math.min( maxPatternValue, num( firstPattern ));
    const lastPatternValue  = Math.min( maxPatternValue, num( lastPattern ));
    const firstChannelValue = Math.min( maxChannelValue, num( firstChannel ));
    const lastChannelValue  = Math.min( maxChannelValue, num( lastChannel ));
    const pastePatternValue = Math.min( maxPatternValue, num( pastePattern )) + 1; // +1 as we insert after this index

    const patternsToClone = patterns.slice( firstPatternValue, lastPatternValue + 1 );

    // splice the pattern list at the insertion point, head will contain
    // the front of the list, tail the end of the list, and inserted will contain the cloned content

    const patternsHead     = song.patterns;
    const patternsTail     = patterns.splice( pastePatternValue );
    const patternsInserted = [];

    // clone the patterns into the insertion list

    patternsToClone.forEach(( pattern, patternIndex ) => {

        const clonedPattern = PatternFactory.createEmptyPattern( pattern.steps );

        for ( let i = firstChannelValue; i <= lastChannelValue; ++i )
            clonedPattern.channels[ i ] = ObjectUtil.clone( pattern.channels[ i ]);

        patternsInserted.push( clonedPattern );
    });

    // commit the changes

    song.patterns = patternsHead.concat( patternsInserted, patternsTail );

    // update event offsets

    for ( let patternIndex = pastePatternValue; patternIndex < song.patterns.length; ++patternIndex ) {

        song.patterns[ patternIndex ].channels.forEach(( channel, channelIndex ) => {

            channel.forEach(( event, eventIndex ) => {

                if ( event && event.seq ) {

                    const eventStart  = event.seq.startMeasure;
                    const eventEnd    = event.seq.endMeasure;
                    const eventLength = isNaN( eventEnd ) ? 1 : eventEnd - eventStart;

                    event.seq.startMeasure = patternIndex;
                    event.seq.endMeasure   = event.seq.startMeasure + eventLength;
                }
            });
        });
    }

    Pubsub.publish( Messages.CREATE_LINKED_LISTS );

    // update UI

    Pubsub.publish( Messages.REFRESH_SONG );
    Pubsub.publish( Messages.PATTERN_AMOUNT_UPDATED );

    handleClose();
}

/**
 * retrieve the numerical value from an input element
 * and subtract 1 (so the value represents an Array index)
 *
 * @private
 * @param {Element} inputElement
 * @return {number}
 */
function num( inputElement ) {
    return parseInt( inputElement.value, 10 ) - 1;
}
