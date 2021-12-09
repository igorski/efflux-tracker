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
import { sprite } from "zcanvas";
import { getMeasureDurationInSeconds } from "@/utils/audio-math";

const NOTE_LIST = [ "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" ];

export default class PatternRenderer extends sprite
{
    constructor( pattern, index ) {
        super({ x: 0, y: 0, width: 500, height: 1 }); // height will be updated after construction

        this._pattern = pattern;
        this._index = index;
    }

    /* zCanvas overrides */

    setWidth( width ) {
        super.setWidth( width );
        this._patternWidth = width;
    }

    setHeight( height ) {
        super.setHeight( height );
        this._patternHeight = height / this._pattern.channels.length;
    }

    draw( ctx ) {
        const patternDuration = getMeasureDurationInSeconds( 120 ); // TODO: this._tempo
        for ( let i = 0; i < this._pattern.channels.length; ++i ) {
            const channel = this._pattern.channels[ i ];
            const x = this._index * this._patternWidth;
            const y = i * this._patternHeight;
            ctx.fillStyle = i % 2 ? "black" : "red";
            ctx.fillRect(
                x, y,
                this._patternWidth,
                this._patternHeight
            );
            ctx.fillStyle = "#FFF";
            // TODO get highest and lowest note in pattern and position notes according to this scale
            for ( let j = 0; j < channel.length; ++j ) {
                const event = channel[ j ];
                if ( !event ) {
                    continue;
                }
                const eventWidth = ( event.seq.length / patternDuration ) * this._patternWidth;
                const eventHeight = this._patternHeight / 12; // notes in octave
                ctx.fillRect(
                    x + ( j * eventWidth ),
                    y + ( NOTE_LIST.indexOf( event.note ) * eventHeight ), // TODO upper/lower C
                    eventWidth,
                    eventHeight
                );
            }
        }
    }
}
