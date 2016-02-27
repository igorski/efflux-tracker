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
var Handlebars = require( "handlebars/dist/handlebars.runtime.min.js" );
var templates  = require( "../handlebars/templates" )( Handlebars );
var Form       = require( "../utils/Form" );

var MetaController = module.exports =
{
    /**
     * initialize MetaController, attach MetaView tempate into give container
     *
     * @param container
     * @param slocum
     */
    init : function( container, slocum )
    {
        MetaController.slocum = slocum;
        container.innerHTML   = templates.metaView();

        // cache view elements

        MetaController.container = container;
        MetaController.title     = container.querySelector( "#songTitle" );
        MetaController.author    = container.querySelector( "#songAuthor" );
        MetaController.tempo     = container.querySelector( "#songTempo" );

        // synchronize with model

        MetaController.update();

        // add listeners

        var metaChange = handleChange.bind( MetaController );

        MetaController.title.onchange  = metaChange;
        MetaController.author.onchange = metaChange;
        MetaController.tempo.onchange  = metaChange;
    },

    /**
     * synchronize MetaView contents with
     * the current state of the model
     */
    update : function()
    {
        var meta = MetaController.slocum.activeSong.meta;

        MetaController.title.value  = meta.title;
        MetaController.author.value = meta.author;

        Form.setSelectedOption( MetaController.tempo, meta.tempo );
    }
};

/**
 * private handler that synchronizes the state
 * of the model to the changes made in the view
 *
 * @param aEvent
 */
function handleChange( aEvent )
{
    var MetaController = this; // handler is bound to controller scope
    var meta = MetaController.slocum.activeSong.meta;

    meta.title  = MetaController.title.value;
    meta.author = MetaController.author.value;
    meta.tempo  = parseInt( Form.getSelectedOption( MetaController.tempo ), 10 );

    console.log(meta);
}
