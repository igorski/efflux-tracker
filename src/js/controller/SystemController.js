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

const Config       = require( "../config/Config" );
const Copy         = require( "../i18n/Copy" );
const Messages     = require( "../definitions/Messages" );
const Style        = require( "zjslib" ).Style;
const Pubsub       = require( "pubsub-js" );
const Bowser       = require( "bowser" );
const ListenerUtil = require( "../utils/ListenerUtil" );

/* private variables */

let blind, loader, scrollPending = false, loadRequests = 0;
let mainSection, centerSection;

module.exports =
{
    init()
    {
        // fetch DOM elements

        blind = document.querySelector( "#blind" );

        // add listeners to DOM

        window.addEventListener( "resize", handleEvent );
        ListenerUtil.listen( window,  "scroll", handleEvent );

        // listen to window unload when user navigates away



        // subscribe to messaging system

        [
            Messages.SHOW_BLIND,
            Messages.HIDE_BLIND,
            Messages.SHOW_LOADER,
            Messages.HIDE_LOADER,
            Messages.OVERLAY_OPENED,
            Messages.CLOSE_OVERLAYS

        ].forEach(( msg ) => Pubsub.subscribe( msg, handleBroadcast ));

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

            // only fire this event on RAF to avoid
            // DOM thrashing by the subscribed listeners

            if ( !scrollPending ) {
                scrollPending = true;
                requestAnimationFrame(() => {
                    Pubsub.publish( Messages.WINDOW_SCROLLED );
                    scrollPending = false;
                });
            }
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

    mainSection   = mainSection   || document.querySelector( "#properties" );
    centerSection = centerSection || document.querySelector( "#editor" );

    // synchronize pattern list width with mainsection width

    centerSection.style.width = Style.getStyle( mainSection, "width" );
}
