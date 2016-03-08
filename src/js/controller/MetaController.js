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
var Form         = require( "../utils/Form" );
var TemplateUtil = require( "../utils/TemplateUtil" );
var Pubsub       = require( "pubsub-js" );
var Messages     = require( "../definitions/Messages" );

/* private properties */

var container, slocum, keyboardController;
var title, author, tempo, tuning;

var MetaController = module.exports =
{
    /**
     * initialize MetaController, attach MetaView template into give container
     *
     * @param containerRef
     * @param slocumRef
     * @param keyboardControllerRef
     */
    init : function( containerRef, slocumRef, keyboardControllerRef )
    {
        container          = containerRef;
        slocum             = slocumRef;
        keyboardController = keyboardControllerRef;

        container.innerHTML += TemplateUtil.render( "metaView" );

        // cache view elements

        title  = container.querySelector( "#songTitle" );
        author = container.querySelector( "#songAuthor" );
        tempo  = container.querySelector( "#songTempo" );
        tuning = container.querySelector( "#songTuning" );

        // synchronize with model

        MetaController.update();

        // add listeners

        [ title, author, tempo, tuning ].forEach( function( element )
        {
            element.addEventListener( "change", handleChange );
            element.addEventListener( "focus",  handleFocusIn );
            element.addEventListener( "blur",   handleFocusOut );
        });

        container.addEventListener( "mouseover", handleMouseOver );

        Pubsub.subscribe( Messages.SONG_LOADED, handleBroadcast );
    },

    /**
     * synchronize MetaView contents with
     * the current state of the model
     */
    update : function()
    {
        var meta = slocum.activeSong.meta;

        title.value  = meta.title;
        author.value = meta.author;

        Form.setSelectedOption( tempo,  meta.tempo );
        Form.setSelectedOption( tuning, meta.tuning );
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
    var meta = slocum.activeSong.meta;

    meta.title  = title.value;
    meta.author = author.value;
    meta.tempo  = parseInt( Form.getSelectedOption( tempo ), 10 );
    meta.tuning = parseInt( Form.getSelectedOption( tuning ), 10 );
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

function handleMouseOver( aEvent )
{
    Pubsub.publish( Messages.DISPLAY_HELP, "helpTopicMeta" );
}
