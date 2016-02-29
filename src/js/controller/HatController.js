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
var Handlebars = require( "handlebars/dist/handlebars.runtime.min.js" );
var templates  = require( "../handlebars/templates" )( Handlebars );
var Form       = require( "../utils/Form" );
var Pubsub     = require( "pubsub-js" );
var Messages   = require( "../definitions/Messages" );

Handlebars.registerHelper( 'for', function( from, to, incr, block )
{
    var accum = "";

    for ( var i = from; i < to; i += incr )
        accum += block.fn( i );

    return accum;
});

/* private properties */

var container, slocum, keyboardController;
var start, volume, pitch, patternContainer;

var HatController = module.exports =
{
    /**
     * initialize HatController, attach MetaView template into give container
     *
     * @param containerRef
     * @param slocumRef
     * @param keyboardControllerRef
     */
    init : function( containerRef, slocumRef, keyboardControllerRef )
    {
        container          = containerRef;
        slocum             = slocumRef;
        keyboardController = keyboardControllerRef;

        container.innerHTML += templates.hatEditor();

        // cache view elements

        start  = container.querySelector( "#hatStart" );
        volume = container.querySelector( "#hatVolume" );
        pitch  = container.querySelector( "#hatPitch" );
        patternContainer = container.querySelector( ".pattern" );

        // synchronize with model

        HatController.update();

        // add listeners

        start.addEventListener           ( "change", handleStartChange );
        volume.addEventListener          ( "change", handleVolumeChange );
        pitch.addEventListener           ( "change", handlePitchChange );
        patternContainer.addEventListener( "click",  handlePatternClick );

        Pubsub.subscribe( Messages.PATTERN_AMOUNT_UPDATED, handleBroadcast );
        Pubsub.subscribe( Messages.SONG_LOADED,            handleBroadcast );
    },

    /**
     * synchronize MetaView contents with
     * the current state of the model
     */
    update : function()
    {
        var song = slocum.activeSong,
            hats = song.hats;

        var amountOfPatterns = song.patterns.length;
        // title, value

        var options = [{ title: "Never", value: 255 }];
        var i = amountOfPatterns;
        while ( i-- )
        {
            options.push({
                title: "Measure " + ( i + 1 ),
                value: i.toString()
            });
        }
        Form.setOptions( start, options );

        // keep hat start in range in case pattern amount has changed

        if ( hats.start !== 255 && hats.start >= amountOfPatterns )
            hats.start = amountOfPatterns - 1;

        Form.setSelectedOption( start, hats.start );

        volume.value = hats.volume;
        pitch.value  = hats.pitch;

        // update pattern buttons

        var pattern   = hats.pattern;
        var buttons   = patternContainer.querySelectorAll( "li" );
        var increment = ( pattern.length / buttons.length );
        var j, button;

        for ( i = 0, j = 0; i < buttons.length; ++i, j += increment ) {
            button = buttons[ i ];
            if ( pattern[ j ] === 1 )
                button.classList.add( "active" );
            else
                button.classList.remove( "active" );
        }
    },

    /* event handlers */

    handleKey : function( keyCode, event )
    {
        switch ( keyCode )
        {

        }
    }
};

/* private methods */

function handleBroadcast( type, payload )
{
    switch( type )
    {
        case Messages.SONG_LOADED:
        case Messages.PATTERN_AMOUNT_UPDATED:
            HatController.update();
            break;
    }
}

function handleStartChange( aEvent )
{
    slocum.activeSong.hats.start = parseInt( Form.getSelectedOption( start ), 10 );
}

function handleVolumeChange( aEvent )
{
    slocum.activeSong.hats.volume = parseInt( volume.value, 10 );
}

function handlePitchChange( aEvent )
{
    slocum.activeSong.hats.pitch = parseInt( pitch.value, 10 );
}

function handlePatternClick( aEvent )
{
    var element = aEvent.target;

    if ( element.tagName === "LI" )
    {
        element.classList.toggle( "active" );

        // update model

        var pattern   = slocum.activeSong.hats.pattern;
        var buttons   = patternContainer.querySelectorAll( "li" );
        var increment = ( pattern.length / buttons.length );

        for ( var i = 0, j = 0; i < buttons.length; ++i, j += increment )
            pattern[ j ] = buttons[ i ].classList.contains( "active" ) ? 1 : 0;
    }
}
