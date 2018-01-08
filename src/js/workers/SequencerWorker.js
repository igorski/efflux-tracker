"use strict";

var interval = 25, timer, data;

/**
 * SequencerWorker leverages the intervallic polling
 * of the Sequencer events off the main execution thread
 */
self.addEventListener( "message", function( aEvent )
{
    data = aEvent.data;

    if ( data !== undefined )
    {
        switch ( data.cmd )
        {
            case "start":

                clearInterval( timer );

                timer = setInterval( function() {
                    postMessage({ cmd: "collect" });
                }, interval );
                break;

            case "stop":

                clearInterval( timer );
                timer = null;
                break;
        }
    }
}, false );
