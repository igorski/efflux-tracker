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
var Messages = require( "../definitions/Messages" );
var Style    = require( "zjslib" ).Style;
var Pubsub   = require( "pubsub-js" );

/* private variables */

var patternContainer, trackList, patternSection, patternEditor, helpSection;

module.exports =
{
    init : function()
    {
        // add listeners to DOM

        window.addEventListener( "resize", handleEvent );
        window.addEventListener( "scroll", handleEvent );

        // ensure that on application start all elements are presented correctly

        calculateDimensions();
    }
};

/* private methods */

function handleEvent( aEvent )
{
    switch ( aEvent.type )
    {
        case "resize":
            Pubsub.publish( Messages.WINDOW_RESIZED );
            calculateDimensions();
            break;

        case "scroll":
            Pubsub.publish( Messages.WINDOW_SCROLLED );
            break;
    }
}

/**
 * due to the nature of the table display of the pattern editors track list
 * we need JavaScript to calculate to correct dimensions of the overflowed track list
 *
 * @param aEvent
 */
function calculateDimensions( aEvent )
{
    // grab references to DOM elements (we do this lazily)

    patternContainer = patternContainer || document.querySelector( "#patternContainer" );
    patternSection   = patternSection   || document.querySelector( "#patternSection" );
    patternEditor    = patternEditor    || document.querySelector( "#patternEditor" );
    trackList        = trackList        || document.querySelector( "#patternTrackList" );
    helpSection      = helpSection      || document.querySelector( "#helpSection" );

    var gs = Style.getStyle;

    // unsetting patternContainer width allows for accurate centerWrapper calculation

    patternContainer.style.width = "0px";

    trackList.style.width        =
    patternContainer.style.width = (

        parseFloat( gs( patternSection, "width" )) -
        parseFloat( gs( patternEditor,  "width" )) -
        parseFloat( gs( helpSection,    "width" ))

    ) + "px";

    // side containers should be as tall as the pattern container (help container is scrollable)

    helpSection.style.height   = gs( trackList, "height" );
    patternEditor.style.height = gs( trackList, "height" );
}
