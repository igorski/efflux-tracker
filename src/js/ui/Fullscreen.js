/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2017-2018 - http://www.igorski.nl
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

const Config = require( "../config/Config" );
const Copy   = require( "../i18n/Copy" );
const Bowser = require( "bowser" );

let fsToggle;

module.exports = {

    isSupported() {
        return !Config.isChromeApp() && !Bowser.ios;
    },

    setToggleButton( element ) {
        fsToggle = element;
        fsToggle.addEventListener( "click",                  toggleFullscreen );
        document.addEventListener( "webkitfullscreenchange", handleFullscreenChange, false );
        document.addEventListener( "mozfullscreenchange",    handleFullscreenChange, false );
        document.addEventListener( "fullscreenchange",       handleFullscreenChange, false );
        document.addEventListener( "MSFullscreenChange",     handleFullscreenChange, false );
    }
};

/* internal methods */

function toggleFullscreen( aEvent ) {

    let requestMethod, element;
    if ( document.fullscreenElement || document.webkitFullscreenElement ) {
        requestMethod = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
        element = document;
    } else {
        requestMethod = document.body.requestFullScreen || document.body.webkitRequestFullScreen || document.body.mozRequestFullScreen || document.body.msRequestFullscreen;
        element = document.body;
    }

    if ( requestMethod )
        requestMethod.call( element );
}

function handleFullscreenChange() {

    if ( document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreenElement === true )
        fsToggle.innerHTML = Copy.get( "BUTTON_FS_CANCEL" );
    else
        fsToggle.innerHTML = Copy.get( "BUTTON_FS_ACTIVATE" );
}
