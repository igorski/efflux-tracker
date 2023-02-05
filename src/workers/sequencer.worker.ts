/**
* The MIT License (MIT)
*
* Igor Zinken 2016-2023 - https://www.igorski.nl
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
interface SequencerRequest {
    cmd: "start" | "stop";
    interval?: number;
};

const DEFAULT_POLLING_INTERVAL = 25;

let seqTimer: any;
let seqData: SequencerRequest;

// SequencerWorker leverages the intervallic polling
// of the Sequencer events off the main execution thread

self.addEventListener( "message", ( event: MessageEvent ): void => {
    seqData = event.data;

    if ( seqData === undefined ) {
        return;
    }

    switch ( seqData.cmd ) {
        default:
            break;

        case "start":
            clearInterval( seqTimer );
            seqTimer = setInterval(() => {
                self.postMessage({ cmd: "collect" });
            }, typeof seqData.interval === "number" ? seqData.interval : DEFAULT_POLLING_INTERVAL );
            break;

        case "stop":
            clearInterval( seqTimer );
            seqTimer = null;
            break;
    }
}, false );
