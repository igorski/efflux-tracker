/**
 * Adapted from Matt Diamonds recorderjs.
 * Separated from node_modules to allow inlining of worker through Webpack
 * as well as freeing allocated memory to recording.
 */
import RecorderWorker from "@/workers/recorder.worker.js";

export default class OutputRecorder {
    constructor( source, { type = "audio/wav", bufferSize = 4096, callback } = {} ) {
        this.recording   = false;
        this.type        = type;
        this.callback    = callback;
        this.context     = source.context;
        this.node        = ( this.context.createScriptProcessor || this.context.createJavaScriptNode ).call( this.context, bufferSize, 2, 2 );

        this.worker = new RecorderWorker();
        this.worker.onmessage = e => {
            this.callback?.( e.data );
        };

        this.worker.postMessage({
            command: "init",
            config: {
                sampleRate: this.context.sampleRate
            }
        });

        this.node.onaudioprocess = e => {
            if ( !this.recording ) {
                return;
            }
            this.worker.postMessage({
                command: "record",
                buffer: [
                    e.inputBuffer.getChannelData( 0 ),
                    e.inputBuffer.getChannelData( 1 )
                ]
            });
        };
        source.connect( this.node );
        this.node.connect( this.context.destination ); // this should not be necessary
    }

    record() {
        this.recording = true;
    }

    stop() {
        this.recording = false;
    }

    dispose() {
        this.worker.postMessage({ command: "clear" });
        this.worker.terminate();
        this.worker = null;
    }

    export( type ) {
        this.worker.postMessage({
            command: "exportWAV",
            type: type || this.type
        });
    }
}
