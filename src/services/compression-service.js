/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021 - https://www.igorski.nl
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
const jobQueue = [];
let UID = 0;

/**
 * Compress given data Object (JSON) into an compressed binary Blob.
 * @returns {Promise}
 */
export const compress = data => createJob( "compress", data );

/**
 * Decompress given data Blob into a JSON structure.
 * @returns {Promise}
 */
export const decompress = data => createJob( "decompress", data );

// same as above but for UTF16 Strings
export const compressUTF16 = data => createJob( "compressUTF16", data );
export const decompressUTF16 = data => createJob( "decompressUTF16", data );

/* internal methods */

function handleWorkerMessage({ data }) {
    const jobQueueObj = getJobFromQueue( data?.id );
    if ( data?.cmd === "complete" ) {
        jobQueueObj?.success( data.data );
    }
    if ( data?.cmd === "loadError" ) {
        jobQueueObj?.error( data?.error );
    }
}

function createJob( cmd, data ) {
    return new Promise(( resolve, reject ) => {
        const id = ( ++UID );
        // Worker is lazily created per process so we can parallelize
        const worker = new Worker( new URL( "@/workers/compression.worker.js", import.meta.url ));
        worker.onmessage = handleWorkerMessage;
        const disposeWorker = () => worker.terminate();
        jobQueue.push({
            id,
            success: response => {
                disposeWorker();
                resolve( response );
            },
            error: error  => {
                disposeWorker();
                reject( error );
            }
        });
        worker.postMessage({ cmd, data, id });
    })
}

function getJobFromQueue( jobId ) {
    const jobQueueObj = jobQueue.find(({ id }) => id === jobId );
    if ( !jobQueueObj ) {
        return null;
    }
    jobQueue.splice( jobQueue.indexOf( jobQueueObj ), 1 );
    return jobQueueObj;
}
