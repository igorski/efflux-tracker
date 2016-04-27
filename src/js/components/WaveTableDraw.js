/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016 - http://www.igorski.nl
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
var zSprite = require( "zCanvas" ).zSprite;

// create the WaveTableDraw prototype as an extension of zSprite

function WaveTableDraw( width, height, updateHandler )
{
    this.super( this, 0, 0, width, height );
    this.setDraggable( true );

    /* instance properties */

    this.table            = [];
    this.updateHandler    = updateHandler;
    this.interactionCache = { x: -1, y: -1 };
}
zSprite.extend( WaveTableDraw );

module.exports = WaveTableDraw;

/* public methods */

/**
 * set a reference to the current WaveTable we're displaying/editing
 *
 * @public
 * @param {Array.<number>} aTableArray
 */
WaveTableDraw.prototype.setTable = function( aTableArray )
{
    this.table = aTableArray;
};

WaveTableDraw.prototype.draw = function( aCanvasContext )
{
    aCanvasContext.strokeStyle = "#CC0000";
    aCanvasContext.lineWidth = 5;
    aCanvasContext.beginPath();

    var h = this._bounds.height,
        x = this._bounds.left,
        y = this._bounds.top + h,
        l = this.table.length,
        size = ( this._bounds.width / ( l - 1 )),
        i = l, point;

    while ( i-- )
    {
        point = ( this.table[ i ] + 1 ) * .5; // convert from -1 to +1 bipolar range
        aCanvasContext.lineTo( x + ( i * size ), y - ( point * h ));
    }
    aCanvasContext.stroke();
    aCanvasContext.closePath();
};

WaveTableDraw.prototype.handleInteraction = function( aEventX, aEventY, aEvent )
{
    if ( this.isDragging ) {

        if ( aEvent.type === "touchend" ||
             aEvent.type === "mouseup" ) {

            this.isDragging = false;
            return true;
        }

        // translate pointer position to a table value

        var tableIndex = Math.round(( aEventX / this._bounds.width ) * this.table.length );
        tableIndex     = Math.min( this.table.length - 1, tableIndex ); // do not exceed max length
        var value      = ( 1 - ( aEventY / this._bounds.height ) * 2 );
        this.table[ tableIndex ] = value;

        var cache = this.interactionCache;

        // these have been observed to be floating point on Chrome for Android

        aEventX = Math.round( aEventX );
        aEventY = Math.round( aEventY );

        // smooth the surrounding coordinates to avoid sudden spikes

        if ( cache.x > -1 )
        {
            var xDelta    = aEventX - cache.x,
                yDelta    = aEventY - cache.y,
                xScale    = xDelta / Math.abs( xDelta ),
                yScale    = yDelta / Math.abs( xDelta ),
                increment = 0,
                w         = this._bounds.width,
                h         = this._bounds.height,
                l         = this.table.length;

            while ( cache.x !== aEventX ) {

                tableIndex = Math.round(( cache.x / w ) * l );
                tableIndex     = Math.min( l - 1, tableIndex ); // do not exceed max length
                value      = ( 1 - ( Math.floor(( yScale * increment ) + cache.y ) / h ) * 2 );
                this.table[ tableIndex ] = value;
                cache.x += xScale;
                ++increment;
            }
        }
        cache.x = aEventX;
        cache.y = aEventY;

        aEvent.preventDefault();

        this.updateHandler( this.table );
    }
    else if ( aEvent.type === "touchstart" ||
              aEvent.type === "mousedown" )
    {
        this.isDragging = true;
        return true;
    }
    return false;
};
