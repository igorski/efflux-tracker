/**
 * Adaptation from source by Nick Thompson, https://github.com/web-audio-components/delay
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
import Config from "@/config";
import type { WrappedAudioNode } from "@/model/types/audio-modules";
import Filter from "./filter-module";

type IDelayProps = {
    type?: number;
    delay?: number;
    feedback?: number;
    offset?: number;
    cutoff?: number;
    dry?: number;
};

export const meta = {
    name: "delay",
    params: {
        type: {
            min: 0,
            max: 2,
            defaultValue: 0,
            type: "int"
        },
        delay: {
            min: 0,
            max: 10,
            defaultValue: 1.0,
            type: "float"
        },
        feedback: {
            min: 0,
            max: 1,
            defaultValue: 0.5,
            type: "float"
        },
        cutoff: {
            min: 0,
            max: 22050,
            defaultValue: 8000,
            type: "float"
        },
        offset: {
            min: -0.5,
            max: 0.5,
            defaultValue: 0,
            type: "float"
        },
        dry: {
            min: 0,
            max: 1.0,
            defaultValue: 1,
            type: "float"
        }
    }
};

export default class Delay
{
    public input: GainNode;
    public output: GainNode;

    private _split: ChannelSplitterNode;
    private _merge: ChannelMergerNode;
    private _dry: GainNode;
    private _leftDelay: DelayNode;
    private _rightDelay: DelayNode;
    private _leftGain: GainNode;
    private _rightGain: GainNode;
    private _leftFilter: Filter;
    private _rightFilter: Filter;
    private _type: number;
    private _delayTime: number;
    private _offset: number;

    constructor( context: BaseAudioContext, opts: IDelayProps = {} ) {
        this.input  = context.createGain();
        this.output = context.createGain();

        const { params } = meta;

        opts.type     = ~~opts.type   || params.type.defaultValue;
        opts.delay    = opts.delay    || params.delay.defaultValue;
        opts.feedback = Math.min( 1.0, opts.feedback ?? 0 ) || params.feedback.defaultValue;
        opts.cutoff   = opts.cutoff   || params.cutoff.defaultValue;
        opts.dry      = opts.dry      || params.dry.defaultValue;
        opts.offset   = opts.offset   || params.offset.defaultValue;

        // prepare the routing nodes
        // input > split > ( delay > gain > filter ) > merge > output
        // input > dry > output

        this._split = context.createChannelSplitter( 2 );
        this._merge = context.createChannelMerger( 2 );
        this._dry   = context.createGain();

        // left and right channel delay, gain and filter nodes

        this._leftDelay  = context.createDelay( Config.MAX_DELAY_TIME );
        this._rightDelay = context.createDelay( Config.MAX_DELAY_TIME );
        this._leftGain   = context.createGain();
        this._rightGain  = context.createGain();
        this._leftFilter  = new Filter( context, { type: "lowpass", frequency: opts.cutoff });
        this._rightFilter = new Filter( context, { type: "lowpass", frequency: opts.cutoff });

        // assign values to nodes

        this._type      = opts.type;
        this._delayTime = opts.delay;
        this._offset    = opts.offset;

        this._leftDelay.delayTime.value  = opts.delay;
        this._rightDelay.delayTime.value = opts.delay;

        this._leftGain.gain.value  = opts.feedback;
        this._rightGain.gain.value = opts.feedback;

        // create the node routing

        this.input.connect( this._split );
        this.input.connect( this._dry );

        this._leftDelay.connect( this._leftGain );
        this._rightDelay.connect( this._rightGain );
        this._leftGain.connect( this._leftFilter.input );
        this._rightGain.connect( this._rightFilter.input );

        this._route();

        this._dry.connect( this.output );
        this._merge.connect( this.output );
    }

    /* AudioNode connect API */

    connect( dest: AudioNode | WrappedAudioNode ): void {
        // @ts-expect-error WrappedAudioNode and AudioNode have no overlap
        this.output.connect( dest.input ?? dest );
    }

    disconnect(): void {
        this.output.disconnect();
    }

    /**
    * Various routing schemes. Remember the chain:
    * input > split > ( delay > gain > filter ) > merge > output
    */
    _route() {
        this._split.disconnect();
        this._leftFilter.disconnect();
        this._rightFilter.disconnect();

        switch ( this._type ) {
            default:
            case 0: // normal
                this._split.connect( this._leftDelay, 0, 0 );
                this._split.connect( this._rightDelay, 1, 0 );
                this._leftFilter.connect( this._leftDelay );
                this._rightFilter.connect( this._rightDelay );
                break;

            case 1: // inverted
                this._split.connect( this._leftDelay, 1, 0 );
                this._split.connect( this._rightDelay, 0, 0 );
                this._leftFilter.connect( this._leftDelay );
                this._rightFilter.connect( this._rightDelay );
                break;

            case 2: // ping pong
                this._split.connect( this._leftDelay, 0, 0 );
                this._split.connect( this._rightDelay, 1, 0 );
                this._leftFilter.connect( this._rightDelay );
                this._rightFilter.connect( this._leftDelay );
                break;
        }
        this._leftFilter.connect( this._merge, 0, 0 );
        this._rightFilter.connect( this._merge, 0, 1 );
    }

    get type(): number {
        return this._type;
    }

    set type( value: number ) {
        this._type = ~~value;
        this._route();
    }

    get delay(): number {
        return this._leftDelay.delayTime.value;
    }

    set delay( value: number ) {
        this._delayTime = value;

        const left  = this._leftDelay.delayTime;
        const right = this._rightDelay.delayTime;

        left.cancelScheduledValues( 0 );
        left.value = value;
        right.cancelScheduledValues( 0 );
        right.value = value;
    }

    get feedback(): number {
        return this._leftGain.gain.value;
    }

    set feedback( value: number ) {
        this._leftGain.gain.setValueAtTime( value, 0 );
        this._rightGain.gain.setValueAtTime( value, 0 );
    }

    get cutoff(): number {
        return this._leftFilter.frequency;
    }

    set cutoff( value: number ) {
        this._leftFilter.frequency  = value;
        this._rightFilter.frequency = value;
    }

    get offset(): number {
        return this._offset;
    }

    set offset( value: number ) {
        this._offset     = value;
        const offsetTime = Math.max( 0, this._delayTime + value );

        const left  = this._leftDelay.delayTime;
        const right = this._rightDelay.delayTime;

        left.cancelScheduledValues( 0 );
        right.cancelScheduledValues( 0 );

        if ( value < 0 ) {
            left.setValueAtTime( offsetTime, 0 );
            right.setValueAtTime( this._delayTime, 0 );
        } else {
            left.setValueAtTime( this._delayTime, 0 );
            right.setValueAtTime( offsetTime, 0 );
        }
    }

    get dry(): number {
        return this._dry.gain.value;
    }

    set dry( value: number ) {
        this._dry.gain.setValueAtTime( value, 0 );
    }
};
