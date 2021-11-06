/**
 * Adapted from
 * DSP.js - a comprehensive digital signal processing  library for javascript
 *
 * Created by Corban Brook <corbanbrook@gmail.com> on 2010-01-01.
 * Copyright 2010 Corban Brook. All rights reserved.
 */

/**
 * DFT is a class for calculating the Discrete Fourier Transform of a signal.
 *
 * @param {Number} bufferSize The size of the sample buffer to be computed
 * @param {Number} sampleRate The sampleRate of the buffer (eg. 44100)
 *
 * @constructor
 */
export const DFT = function(bufferSize, sampleRate) {
    FourierTransform.call(this, bufferSize, sampleRate);

    const N = bufferSize / 2 * bufferSize;
    const TWO_PI = 2 * Math.PI;

    this.sinTable = new Float32Array(N);
    this.cosTable = new Float32Array(N);

    for (let i = 0; i < N; i++) {
        this.sinTable[i] = Math.sin(i * TWO_PI / bufferSize);
        this.cosTable[i] = Math.cos(i * TWO_PI / bufferSize);
    }
};

/**
 * Performs a forward transform on the sample buffer.
 * Converts a time domain signal to frequency domain spectra.
 *
 * @param {Array} buffer The sample buffer
 *
 * @returns The frequency spectrum array
 */
DFT.prototype.forward = function(buffer) {
    const real = this.real,
        imag   = this.imag;

    let rval, ival;

    for (let k = 0; k < this.bufferSize / 2; k++) {
        rval = 0.0;
        ival = 0.0;

        for (let n = 0; n < buffer.length; n++) {
            rval += this.cosTable[k * n] * buffer[n];
            ival += this.sinTable[k * n] * buffer[n];
        }
        real[k] = rval;
        imag[k] = ival;
    }
    return this.calculateSpectrum();
};

// Fourier Transform prototype used by DFT

function FourierTransform(bufferSize, sampleRate) {
    this.bufferSize = bufferSize;
    this.sampleRate = sampleRate;
    this.bandwidth  = 2 / bufferSize * sampleRate / 2;

    this.spectrum = new Float32Array(bufferSize / 2);
    this.real     = new Float32Array(bufferSize);
    this.imag     = new Float32Array(bufferSize);

    // this.peakBand = 0;
    this.peak     = 0;

    /**
     * Calculates the *middle* frequency of an FFT band.
     *
     * @param {Number} index The index of the FFT band.
     *
     * @returns The middle frequency in Hz.
     */
    this.getBandFrequency = function( index = 0 ) {
        return this.bandwidth * index + this.bandwidth / 2;
    };

    this.calculateSpectrum = function() {
        const spectrum = this.spectrum,
            real       = this.real,
            imag       = this.imag,
            bSi        = 2 / this.bufferSize,
            sqrt       = Math.sqrt;

        let rval, ival, mag;

        for (let i = 0, N = bufferSize / 2; i < N; i++) {
            rval = real[i];
            ival = imag[i];
            mag = bSi * sqrt(rval * rval + ival * ival);

            if (mag > this.peak) {
                //this.peakBand = i;
                this.peak = mag;
            }
            spectrum[i] = mag;
        }
    };
}
