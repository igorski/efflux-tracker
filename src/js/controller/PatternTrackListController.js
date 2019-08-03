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
const EventFactory   = require( "../model/factory/event-factory" );
const StateFactory   = require( "../model/factory/state-factory" );
const ListenerUtil   = require( "../utils/ListenerUtil" );
const EventUtil      = require( "../utils/event-util" );
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

        // subscribe to pubsub messaging

        [
            Messages.SONG_LOADED,
            Messages.REFRESH_SONG,
            Messages.EDIT_NOTE_AT_POSITION,
            Messages.EDIT_MOD_PARAMS_FOR_STEP,
            Messages.EDIT_NOTE_FOR_STEP,

        ].forEach(( msg ) => Pubsub.subscribe( msg, handleBroadcast ));
    },
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

        case Messages.EDIT_NOTE_AT_POSITION:
        case Messages.EDIT_NOTE_FOR_STEP:
            PatternTrackListController.editNoteForStep();
            break;

        case Messages.EDIT_MOD_PARAMS_FOR_STEP:
            editModuleParamsForStep();
            break;
    }
}
