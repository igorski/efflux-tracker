/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2024 - https://www.igorski.nl
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
import { Sprite } from "zcanvas";
import type { IRenderer, StrokeProps, Point } from "zcanvas";
import Config from "@/config";
import OscillatorTypes from "@/definitions/oscillator-types";
import { bufferToWaveForm } from "@/utils/waveform-util";

type IUpdateHandler = ( table: number[] ) => void;

let id = 0;

class WaveformRenderer extends Sprite
{
    private table: number[];
    private cached = false;
    private updateHandler: ( table: number[] ) => void;
    private drawHandler: ( ctx: IRenderer ) => boolean;
    private interactionCache: { x: number, y: number };
    private updateRequested: boolean;
    private enabled: boolean;
    private color: string;
    public  strokeProps: StrokeProps = { color: "red", size: 5 };
    private points: Point[];

    constructor( width: number, height: number, updateHandler: IUpdateHandler, enabled: boolean, color: string ) {
        super({ x: 0, y: 0, width, height });

        this.setColor( color );
        this.setEnabled( enabled );

        /* instance properties */

        this.table            = [];
        this.updateHandler    = updateHandler;
        this.interactionCache = { x: -1, y: -1 };
        this.updateRequested  = false;
        this.points           = [];

        this._resourceId + `wfr_${++id}`;
    }

    /* public methods */

    setEditable( isEditable: boolean ): void {
        this.setInteractive( isEditable );
        this.setDraggable( isEditable );
    }

    /**
     * set a reference to the current WaveTable we're displaying/editing
     */
    setTable( table: number[] ): void {
        this.cached = false;
        this.table = table;
        this.invalidate(); // force re-render
    }

    /**
     * Renders and caches a representation of the current Sample we're displaying
     */
    setSample( buffer?: AudioBuffer ): void {
        if ( buffer === undefined ) {
            return;
        }
        const { width, height } = this.canvas!.getElement();
        
        this.canvas!.loadResource( this._resourceId, bufferToWaveForm( buffer, this.color, width, height, window.devicePixelRatio ?? 1 ))
            .then(() => {
                this.cached = true;
                this.invalidate();
            });
    }

    /**
     * generates the waveform for given function type and
     * sets it as the currently visible WaveTable
     */
    generateAndSetTable( type: string ): void {
        const size = Config.WAVE_TABLE_SIZE;
        this.table.length = size;

        // all waveforms have their peak halfway through their cycle
        // except for PWM (Pulse Width Modulation)
        const m = Math.round(( type === OscillatorTypes.PWM ) ? size / 3 : size / 2 );

        let phase = 0;
        const phaseIncrement = ( 1 / size );

        // generate waveform for value range -1 to +1
        switch ( type )
        {
            case OscillatorTypes.SINE:
                for ( let i = 0; i < size; ++i ) {
                    this.table[ i ] = (( 180.0 - Math.sin( i * Math.PI / 180 ) * 180 ) / 180 ) - 1;
                }
                break;

            case OscillatorTypes.TRIANGLE:
                for ( let i = 0; i < size; ++i ) {
                    this.table[ i ] = ( m - Math.abs( i % ( 2 * m ) - m )) * ( 1 / ( m / 2 ) ) - 1;
                }
                break;

            case OscillatorTypes.SAW:
                for ( let i = 0; i < size; ++i ) {
                    this.table[ i ]  = ( phase < 0 ) ? phase - Math.round( phase - 1 ) : phase - Math.round( phase );
                    this.table[ i ] *= ( 1 / ( m / 2 )) - 2;
                    phase      += phaseIncrement;
                }
                break;

            case OscillatorTypes.SQUARE:
            case OscillatorTypes.PWM:
                for ( let i = 0; i < size; ++i ) {
                    this.table[ i ] = ( i < m ) ? -1 : 1;
                }
                break;

            case OscillatorTypes.NOISE:
                for ( let i = 0; i < size; ++i ) {
                    this.table[ i ] = Math.random() * 2 - 1;
                }
                break;
        }
        this.setTable( this.table );
    }

    setColor( color: string ): void {
        this.color = color;
        if ( this.enabled ) {
            this.strokeProps.color = color;
        }
    }

    setEnabled( enabled: boolean ): void {
        this.enabled = enabled;
        this.strokeProps.color = enabled ? this.color : "#444";
    }

    /**
     * Optional external draw handler to hook into the render routine
     * Returns boolean indicating whether it has handled all required
     * rendering (when false, base draw behaviour will be executed afterwards)
     * This can be used for conditional rendering overrides.
     */
    setExternalDraw( handler: ( renderer: IRenderer ) => boolean ): void {
        this.drawHandler = handler;
    }

    /* zCanvas overrides */

    override draw( renderer: IRenderer ): void {
        if ( this.drawHandler?.( renderer )) {
            return;
        }

        const { width, height } = this._bounds;
   
        if ( this.cached ) {
            renderer.drawImage( this._resourceId, 0, 0, width, height );
            return;
        }

        if ( this.points.length !== Math.ceil( width )) {
            // pool the Points list to prevent unnecessary garbage collection on excessive allocation
            this.points.length = Math.ceil( width );
            for ( let i = 0, l = this.points.length; i < l; ++i ) {
                this.points[ i ] = this.points[ i ] ?? { x: i, y: 0 };
            }
        }
        const ratio = ( this.table.length / width );
        const y = this._bounds.top + height;
            
        for ( let i = 0; i < width; ++i ) {
            const tableIndex = Math.round( ratio * i );
            const value = ( this.table[ tableIndex ] + 1 ) * 0.5; // convert from -1 to +1 bipolar range
            
            this.points[ i ].y = y - ( value * height );
        }
        renderer.drawPath( this.points, "transparent", this.strokeProps );
    }

    override handleInteraction( eventX: number, eventY: number, event: Event ): boolean {
        if ( !this._interactive ) {
            return false;
        }
        if ( this.isDragging ) {
            if ( event.type === "touchend" ||
                 event.type === "mouseup" ) {
                this.isDragging = false;
                return true;
            }

            // translate pointer position to a table value

            let tableIndex = Math.round(( eventX / this._bounds.width ) * this.table.length );
            tableIndex     = Math.min( this.table.length - 1, tableIndex ); // do not exceed max length
            let value      = ( 1 - ( eventY / this._bounds.height ) * 2 );
            this.table[ tableIndex ] = value;

            const cache = this.interactionCache;

            // these have been observed to be floating point on Chrome for Android

            eventX = Math.round( eventX );
            eventY = Math.round( eventY );

            // smooth the surrounding coordinates to avoid sudden spikes

            if ( cache.x > -1 ) {
                let xDelta    = eventX - cache.x,
                    yDelta    = eventY - cache.y,
                    xScale    = xDelta / Math.abs( xDelta ),
                    yScale    = yDelta / Math.abs( xDelta ),
                    increment = 0,
                    w         = this._bounds.width,
                    h         = this._bounds.height,
                    l         = this.table.length;

                while ( cache.x !== eventX ) {
                    tableIndex = Math.round(( cache.x / w ) * l );
                    tableIndex = Math.min( l - 1, tableIndex ); // do not exceed max length
                    value      = ( 1 - ( Math.floor(( yScale * increment ) + cache.y ) / h ) * 2 );
                    this.table[ tableIndex ] = value;
                    cache.x += xScale;
                    ++increment;
                }
            }
            cache.x = eventX;
            cache.y = eventY;

            event.preventDefault();

            // don't hog the CPU by firing the callback instantly

            if ( !this.updateRequested ) {
                this.updateRequested = true;
                requestAnimationFrame(() => {
                    this.updateHandler( this.table );
                    this.updateRequested = false;
                });
            }
        }
        else if ( event.type === "touchstart" ||
                  event.type === "mousedown" )
        {
            this.isDragging = true;
            return true;
        }
        return false;
    }

    override dispose(): void {
        super.dispose();
        this.table = undefined;
        this.points = undefined;
    }
}
export default WaveformRenderer;
