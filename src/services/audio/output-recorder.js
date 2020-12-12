/**
 * Adapted from Matt Diamonds recorderjs.
 * Separated from node_modules to allow inlining of worker through Webpack
 * as well as freeing allocated memory to recording.
 */
import RecorderWorker from '@/workers/recorder.worker.js';

const Recorder = function (source, cfg = {}) {
    const bufferLen = cfg.bufferLen || 4096;
    this.context = source.context;
    this.node = (this.context.createScriptProcessor ||
    this.context.createJavaScriptNode).call(this.context,
        bufferLen, 2, 2);
    const worker = new RecorderWorker();
    worker.onmessage = function (e) {
        const blob = e.data;
        currCallback(blob);
    };

    worker.postMessage({
        command: 'init',
        config: {
            sampleRate: this.context.sampleRate
        }
    });
    let recording = false,
        currCallback;

    this.node.onaudioprocess = function (e) {
        if (!recording) return;
        worker.postMessage({
            command: 'record',
            buffer: [
                e.inputBuffer.getChannelData(0),
                e.inputBuffer.getChannelData(1)
            ]
        });
    };

    this.configure = function (config) {
        for (var prop in config) {
            if (Object.prototype.hasOwnProperty.call(cfg, prop)) {
                cfg[prop] = config[prop];
            }
        }
    };

    this.record = function () {
        recording = true;
    };

    this.stop = function () {
        recording = false;
    };

    this.clear = function () {
        worker.postMessage({command: 'clear'});
    };

    this.getBuffer = function(cb) {
        currCallback = cb || cfg.callback;
        worker.postMessage({command: 'getBuffer'})
    };

    this.exportWAV = function (cb, type) {
        currCallback = cb || cfg.callback;
        type = type || cfg.type || 'audio/wav';
        if (!currCallback) throw new Error('Callback not set');
        worker.postMessage({
            command: 'exportWAV',
            type: type
        });
    };

    source.connect(this.node);
    this.node.connect(this.context.destination); // this should not be necessary
};
export default Recorder;

/* internal methods */

Recorder.forceDownload = function(blob, filename) {
    const url = (window.URL || window.webkitURL).createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = filename || 'output.wav';
    const click = document.createEvent('Event');
    click.initEvent("click", true, true);
    link.dispatchEvent(click);
    (window.URL || window.webkitURL).revokeObjectURL(url);
};
