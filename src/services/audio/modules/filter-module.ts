/**
 * Adaptation from source by Nick Thompson, https://github.com/web-audio-components/filter
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
import type { WrappedAudioNode } from "@/model/types/audio-modules";

type IFilterProps = {
    type?: BiquadFilterType;
    frequency?: number;
    Q?: number;
    gain?: number;
    wet?: number;
    dry?: number;
};

export const meta = {
    name: "Filter",
    params: {
        type: {
            min: 0,
            max: 7,
            defaultValue: "lowpass" as BiquadFilterType,
            type: "string" // BiquadFilterType enum
        },
        frequency: {
            min: 0,
            max: 22050,
            defaultValue: 8000,
            type: "float"
        },
        Q: {
            min: 0.0001,
            max: 1000,
            defaultValue: 1.0,
            type: "float"
        },
        gain: {
            min: -40,
            max: 40,
            defaultValue: 1,
            type: "float"
        },
        wet: {
            min: 0,
            max: 1,
            defaultValue: 1,
            type: "float"
        },
        dry: {
            min: 0,
            max: 1,
            defaultValue: 0,
            type: "float"
        }
    }
};

export default class Filter
{
    public input: GainNode;
    public output: GainNode;

    private _filter: BiquadFilterNode;
    private _dry: GainNode;
    private _wet: GainNode;
    private _type: BiquadFilterType;

    constructor( context: AudioContext, opts: IFilterProps = {} )
    {
        this.input  = context.createGain();
        this.output = context.createGain();

        this._filter = context.createBiquadFilter();
        this._dry    = context.createGain();
        this._wet    = context.createGain();

        const { params } = meta;

        this._type                   = opts.type      || params.type.defaultValue;
        this._filter.frequency.value = opts.frequency || params.frequency.defaultValue;
        this._filter.Q.value         = opts.Q         || params.Q.defaultValue;
        this._filter.gain.value      = opts.gain      || params.gain.defaultValue;
        this._wet.gain.value         = opts.wet       || params.wet.defaultValue;
        this._dry.gain.value         = opts.dry       || params.dry.defaultValue;
        this._filter.type            = this._type;

        this.input.connect( this._filter );
        this._filter.connect( this._wet );
        this._wet.connect( this.output );

        this.input.connect( this._dry );
        this._dry.connect( this.output );
    }

    /* AudioNode connect API */

    connect( dest: AudioNode | WrappedAudioNode, outputIndex: number = 0, inputIndex: number = 0 ): void {
        // @ts-expect-error WrappedAudioNode and AudioNode have no overlap
        this.output.connect( dest.input ?? dest, outputIndex, inputIndex );
    }

    disconnect(): void {
        this.output.disconnect();
    }

    get type(): BiquadFilterType {
        return this._type;
    }

    set type( value: BiquadFilterType ) {
        this._type = value;
        this._filter.type = value;
    }

    get frequency(): number {
        return this._filter.frequency.value;
    }

    set frequency( value: number ) {
        this._filter.frequency.setValueAtTime( value, 0 );
    }

    get Q(): number {
        return this._filter.Q.value;
    }

    set Q( value: number ) {
        this._filter.Q.setValueAtTime( value, 0 );
    }

    get gain(): number {
        return this._filter.gain.value;
    }

    set gain( value: number ) {
        this._filter.gain.setValueAtTime( value, 0 );
    }

    get wet(): number {
        return this._wet.gain.value;
    }

    set wet( value: number ) {
        this._wet.gain.setValueAtTime( value, 0 );
    }

    get dry(): number {
        return this._dry.gain.value;
    }

    set dry( value: number ) {
        this._dry.gain.setValueAtTime( value, 0 );
    }
};
