/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2018 - https://www.igorski.nl
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
const Copy           = require( "../i18n/Copy" );
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
