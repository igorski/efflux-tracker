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

const Config   = require( "../config/Config" );
const SongUtil = require( "../utils/SongUtil" );
const Messages = require( "../definitions/Messages" );
const Pubsub   = require( "pubsub-js" );

/* private properties */

let container, efflux, keyboardController, editorModel;
let title, author, instrumentEditBtn;

const MetaController = module.exports =
{
    /**
     * initialize MetaController, attach MetaView template into give container
     *
     * @param containerRef
     * @param effluxRef
     * @param keyboardControllerRef
     */
    init( containerRef, effluxRef, keyboardControllerRef )
    {
        container          = containerRef;
        efflux             = effluxRef;
        editorModel        = efflux.EditorModel;
        keyboardController = keyboardControllerRef;

        efflux.TemplateService.render( "metaView", container, null, true ).then(() => {

            // cache view elements

            title             = container.querySelector( "#songTitle" );
            author            = container.querySelector( "#songAuthor" );
            instrumentEditBtn = container.querySelector( "#instrumentEditBtn" );

            // synchronize with model

            MetaController.update();

            // add listeners

            [ title, author ].forEach(( element ) =>
            {
                element.addEventListener( "change", handleChange );
                element.addEventListener( "focus",  handleFocusIn );
                element.addEventListener( "blur",   handleFocusOut );
            });

            instrumentEditBtn.addEventListener( "click", handleInstrumentSelect );

            if ( Config.canHover() )
                container.addEventListener( "mouseover", handleMouseOver );
        });

        Pubsub.subscribe( Messages.SONG_LOADED, handleBroadcast );
    },

    /**
     * synchronize MetaView contents with
     * the current state of the model
     */
    update()
    {
        const meta = efflux.activeSong.meta;

        title.value  = meta.title;
        author.value = meta.author;
    }
};

/* private methods */

function handleBroadcast( type, payload )
{
    switch( type )
    {
        case Messages.SONG_LOADED:
            MetaController.update();
            break;
    }
}

/**
 * private handler that synchronizes the state
 * of the model to the changes made in the view
 *
 * @param aEvent
 */
function handleChange( aEvent )
{
    const meta = efflux.activeSong.meta;

    meta.title  = title.value;
    meta.author = author.value;
}

/**
 * when typing, we want to suspend the KeyboardController
 * so it doesn't broadcast the typing to its listeners
 *
 * @param aEvent
 */
function handleFocusIn( aEvent )
{
    keyboardController.setSuspended( true );
}

/**
 * on focus out, restore the KeyboardControllers broadcasting
 *
 * @param aEvent
 */
function handleFocusOut( aEvent )
{
    keyboardController.setSuspended( false );
}

function handleInstrumentSelect( aEvent )
{
    Pubsub.publishSync( Messages.TOGGLE_INSTRUMENT_EDITOR, editorModel.activeInstrument );
}

function handleMouseOver( aEvent )
{
    Pubsub.publish( Messages.DISPLAY_HELP, "helpTopicMeta" );
}
