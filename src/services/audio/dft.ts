/**
 * Adapted from
 * DSP.js - a comprehensive digital signal processing  library for javascript
 *
 * Created by Corban Brook <corbanbrook@gmail.com> on 2010-01-01.
 * Copyright 2010 Corban Brook. All rights reserved.
 */
const TWO_PI = 2 * Math.PI;
const sqrt   = Math.sqrt;

class FourierTransform
{
    public spectrum: Float32Array;
    public real: Float32Array;
    public imag: Float32Array;

    protected bufferSize: number;
    protected sampleRate: number;
    protected bandWidth: number;
    protected peak: number;

    constructor( bufferSize: number, sampleRate: number ) {
        this.bufferSize = bufferSize;
        this.sampleRate = sampleRate;
        this.bandWidth  = 2 / bufferSize * sampleRate / 2;

        this.spectrum = new Float32Array( bufferSize / 2 );
        this.real     = new Float32Array( bufferSize );
        this.imag     = new Float32Array( bufferSize );

        // this.peakBand = 0;
        this.peak     = 0;
    }

    /**
     * Calculates the *middle* frequency in Hz of an FFT band.
     */
    getBandFrequency( index = 0 ): number {
        return this.bandWidth * index + this.bandWidth / 2;
    }

    calculateSpectrum(): void {
        const { spectrum, real, imag } = this;
        const bSi = 2 / this.bufferSize;

        let rval, ival, mag;

        for ( let i = 0, N = this.bufferSize / 2; i < N; i++ ) {
            rval = real[ i ];
            ival = imag[ i ];
            mag  = bSi * sqrt( rval * rval + ival * ival );

            if ( mag > this.peak ) {
                //this.peakBand = i;
                this.peak = mag;
            }
            spectrum[ i ] = mag;
        }
    }
}

/**
 * DFT is a class for calculating the Discrete Fourier Transform of a signal.
 */
export class DFT extends FourierTransform
{
    private sinTable: Float32Array;
    private cosTable: Float32Array;

    constructor( bufferSize: number, sampleRate: number ) {
        super( bufferSize, sampleRate );

        const N = bufferSize / 2 * bufferSize;

        this.sinTable = new Float32Array( N );
        this.cosTable = new Float32Array( N );

        for ( let i = 0; i < N; i++ ) {
            this.sinTable[ i ] = Math.sin( i * TWO_PI / bufferSize );
            this.cosTable[ i ] = Math.cos( i * TWO_PI / bufferSize );
        }
    }

    /**
     * Performs a forward transform on the sample buffer.
     * Converts a time domain signal to frequency domain spectra.
     */
    forward( buffer: number[] ): void {
        const { real, imag } = this;
        const bufferSize = buffer.length;

        let rval, ival;

        for ( let i = 0, l = this.bufferSize / 2; i < l; i++ ) {
            rval = 0.0;
            ival = 0.0;

            for ( let n = 0; n < bufferSize; n++ ) {
                rval += this.cosTable[ i * n ] * buffer[ n ];
                ival += this.sinTable[ i * n ] * buffer[ n ];
            }
            real[ i ] = rval;
            imag[ i ] = ival;
        }
        this.calculateSpectrum();
    }
}
