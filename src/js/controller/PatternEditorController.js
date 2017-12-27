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

const Config         = require( "../config/Config" );
const Pubsub         = require( "pubsub-js" );
const Messages       = require( "../definitions/Messages" );
const Form           = require( "../utils/Form" );
const PatternFactory = require( "../model/factory/PatternFactory" );
const ObjectUtil     = require( "../utils/ObjectUtil" );
const PatternUtil    = require( "../utils/PatternUtil" );

/* private properties */

let container, efflux, editorModel, selectionModel, patternCopy, stepSelect;

module.exports =
{
    /**
     * initialize PatternEditorController
     *
     * @param containerRef
     * @param effluxRef
     */
    init( containerRef, effluxRef )
    {
        container        = containerRef;
        efflux           = effluxRef;
        editorModel      = efflux.EditorModel;
        selectionModel   = efflux.SelectionModel;

        // grab references to view elements

        stepSelect = container.querySelector( "#patternSteps"  );

        // add listeners

        document.querySelector( "#patternClear"  ).addEventListener( "click",  handlePatternClear );
        document.querySelector( "#patternCopy"   ).addEventListener( "click",  handlePatternCopy );
        document.querySelector( "#patternPaste"  ).addEventListener( "click",  handlePatternPaste );
        document.querySelector( "#patternAdd"    ).addEventListener( "click",  handlePatternAdd );
        document.querySelector( "#patternDelete" ).addEventListener( "click",  handlePatternDelete );
        document.querySelector( "#patternAdvanced" ).addEventListener( "click", handlePatternAdvanced );

        stepSelect.addEventListener( "change", handlePatternStepChange );

        if ( Config.canHover() ) {
            const pSection = document.querySelector( "#patternEditor" );
            pSection.addEventListener( "mouseover", handleMouseOver );
        }

        // subscribe to pubsub messaging

        [
            Messages.REFRESH_SONG,
            Messages.SONG_LOADED,
            Messages.PATTERN_SWITCH,
            Messages.REFRESH_PATTERN_VIEW

        ].forEach(( msg ) => Pubsub.subscribe( msg, handleBroadcast ));
    }
};

/* internal methods */

function handleBroadcast( type, payload )
{
    switch ( type ) {
        case Messages.REFRESH_SONG:
        case Messages.SONG_LOADED:
        case Messages.PATTERN_SWITCH:
        case Messages.REFRESH_PATTERN_VIEW:

            let activePattern = editorModel.activePattern;
            if ( activePattern >= efflux.activeSong.patterns.length )
                activePattern = efflux.activeSong.patterns.length - 1;

            const pattern = efflux.activeSong.patterns[ activePattern ];
            Form.setSelectedOption( stepSelect, pattern.steps );
            break;
    }
}

function handlePatternClear( aEvent )
{
    efflux.activeSong.patterns[ editorModel.activePattern ] = PatternFactory.createEmptyPattern( editorModel.amountOfSteps );
    selectionModel.clearSelection();
    Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW );
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
        Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW );
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
            Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW );

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
    Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW );
}

function handleMouseOver( aEvent ) {
    Pubsub.publish( Messages.DISPLAY_HELP, "helpTopicPattern" );
}
