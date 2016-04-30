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
var Pubsub       = require( "pubsub-js" );
var Messages     = require( "../definitions/Messages" );
var TemplateUtil = require( "../utils/TemplateUtil" );

/* private properties */

var container, tracker;
var contentContainer, currentSection;
var DELAY = 500, lastHelpRequest = Date.now(), timeout = 0, queuedSection;

var HelpController = module.exports =
{
    /**
     * initialize HelpController, attach HelpView template into give container
     *
     * @param containerRef
     * @param trackerRef
     */
    init : function( containerRef, trackerRef )
    {
        container          = containerRef;
        tracker             = trackerRef;

        container.innerHTML += TemplateUtil.render( "helpView" );

        // cache view elements

        contentContainer = container.querySelector( ".content" );

        // add listeners

        Pubsub.subscribe( Messages.DISPLAY_HELP, handleBroadcast );

        // show default content

        Pubsub.publish( Messages.DISPLAY_HELP, "helpTopicGeneral" );
    }
};

/* private methods */

function handleBroadcast( type, payload )
{
    switch( type )
    {
        // payload is Handlebars filename

        case Messages.DISPLAY_HELP:

            if ( currentSection !== payload )
            {
                var now = Date.now();

                // we slightly delay showing the new help text
                // (scenario: user is moving the mouse to helpSection
                // to scroll its currently displayed help text)

                if (( now - lastHelpRequest ) > ( DELAY * 2 )) {

                    if ( timeout === 0 ) {
                        queuedSection = payload;
                        timeout = setTimeout( showEnqueuedHelp, DELAY );
                    }
                }
                lastHelpRequest = now;
            }
            break;
    }
}

function showEnqueuedHelp()
{
    clearTimeout( timeout );
    timeout = 0;

    if ( queuedSection && currentSection !== queuedSection ) {

        var template = TemplateUtil.render( queuedSection );

        if ( template.length > 0 )
            contentContainer.innerHTML = template;

        currentSection = queuedSection;
    }
    queuedSection = null;
}
