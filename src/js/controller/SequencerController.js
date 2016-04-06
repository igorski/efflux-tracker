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
var TemplateUtil = require( "../utils/TemplateUtil" );
var Messages     = require( "../definitions/Messages" );
var Pubsub       = require( "pubsub-js" );

/* private properties */

var tracker, audioController;
var tempo, tempoDisplay;

var SequencerController = module.exports =
{
    /**
     * initialize the SequencerController, attach view into
     * given container and hold a reference to the AudioController
     *
     * @public
     * @param {Element} containerRef
     * @param {Object} trackerRef
     * @param {AudioController} audioControllerRef
     */
    init :  function( containerRef, trackerRef, audioControllerRef )
    {
        tracker         = trackerRef;
        audioController = audioControllerRef;

        containerRef.innerHTML += TemplateUtil.render( "transport" );

        // cache view elements

        tempoDisplay = containerRef.querySelector( "#songTempoDisplay" );
        tempo        = containerRef.querySelector( "#songTempo" );
        tempo.addEventListener( "input", handleTempoChange );

        Pubsub.subscribe( Messages.SONG_LOADED, handleBroadcast );
    },

    /**
     * synchronize Transport contents with
     * the current state of the model
     */
    update : function()
    {
        var meta = tracker.activeSong.meta;
        tempoDisplay.innerHTML = meta.tempo + " BPM";
    }
};

/* private methods */

function handleBroadcast( type, payload )
{
    switch( type )
    {
        case Messages.SONG_LOADED:
            SequencerController.update();
            break;
    }
}

function handleTempoChange( e )
{
    var meta   = tracker.activeSong.meta;
    meta.tempo = parseFloat( e.target.value );

    SequencerController.update(); // sync with model
}
