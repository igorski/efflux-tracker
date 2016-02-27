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

/* private properties */

var container, slocum, keyboardController;
var activePattern = 0, activeChannel = 0, activeStep = 0;

var PatternController = module.exports =
{
    /**
     * initialize PatternController
     *
     * @param containerRef
     * @param slocumRef
     * @param keyboardControllerRef
     */
    init : function( containerRef, slocumRef, keyboardControllerRef )
    {
        slocum             = slocumRef;
        keyboardController = keyboardControllerRef;

        container = document.createElement( "div" );
        container.setAttribute( "id", "patternEditor" );
        containerRef.appendChild( container );

        PatternController.update();
        keyboardController.setListener( PatternController );
    },

    update : function()
    {
        var pattern = slocum.activeSong.patterns[ activePattern ];
        container.innerHTML = templates.patternEditor( pattern );

        highlightActiveStep();
    },

    /* event handlers */

    handleKey : function( keyCode, event )
    {
        switch ( keyCode )
        {
            case 38: // up

                if ( --activeStep < 0 )
                    activeStep = 0;

                break;

            case 40: // down

                var maxStep = slocum.activeSong.patterns[ activePattern ].steps - 1;

                if ( ++activeStep > maxStep )
                    activeStep = maxStep;

                break;

            case 39: // right

                if ( ++activeChannel > 1 )
                    activeChannel = 1;

                break;

            case 37: // left

                if ( --activeChannel < 0 )
                    activeChannel = 0;

                break;

            case 32: // spacebar

                console.log("yeah.");
                break;
        }
        highlightActiveStep();
    }
};

/* private methods */

function highlightActiveStep()
{
    var pContainers = container.querySelectorAll( ".pattern" ),
        pContainer, items, item;

    for ( var i = 0, l = pContainers.length; i < l; ++i ) {
        pContainer = pContainers[ i ];
        items = pContainer.querySelectorAll( "li" );

        var j = items.length;
        while ( j-- )
        {
            item = items[ j ];

            if ( i === activeChannel && j === activeStep ) {
                item.classList.add( "active" );
            }
            else {
                item.classList.remove( "active" );
            }
        }
    }
}
