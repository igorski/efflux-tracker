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
"use strict";

const Handlebars   = require( "handlebars/dist/handlebars.runtime.min.js" );
const templateFile = require( "../handlebars/templates" );
const templates    = new templateFile( Handlebars );

/* register Handlebars helpers */

/**
 * use in template like:
 * {{toLowerCase propertyName}}
 */
Handlebars.registerHelper( "toLowerCase", function( string )
{
    if ( typeof string === "string" )
        return string.toLowerCase();

    return "";
});

/**
 * use in template like:
 * {{loop 10}}
 */
Handlebars.registerHelper( "loop", function( n, block )
{
    let out = "";

    for( let i = 0; i < n; ++i )
        out += block.fn( i );

    return out;
});

/**
 * formats module parameter automations (patternTrackList)
 *
 * use in template like:
 * {{mparam event.mp}}
 */
Handlebars.registerHelper( "mparam", function( data )
{
    let out = "";

    if ( data ) {

        out  = data.module.charAt( 0 ).toUpperCase();
        out += data.module.match(/([A-Z]?[^A-Z]*)/g)[1].charAt( 0 );

        data.value = Math.min( 99, data.value );

        out += " " + (( data.value < 10 ) ? "0" + data.value : data.value );

        if ( data.glide )
            out += " G";
    }
    return out;
});

const TemplateUtil = module.exports =
{
    /**
     * render a template using Handlebars
     *
     * @public
     * @param {string} templateName name of the .hbs file to render
     * @param {Object=} data optional data to pass to the template
     *
     * @return {string} HTML template data
     */
    render( templateName, data )
    {
        if ( typeof templates[ templateName ] === "function" )
            return templates[ templateName ]( data );

        return "";
    },

    /**
     * render a template using Handlebars and return an Element
     *
     * @param {string} templateName
     * @param {Object=} data optional data to pass to the template
     *
     * @return {Element}
     */
    renderAsElement( templateName, data )
    {
        let html    = TemplateUtil.render( templateName, data );
        let element = document.createElement( "div" );
        element.setAttribute( "class", templateName + "-wrapper" );

        if ( html.length > 0 )
            element.innerHTML = html;

        return element;
    }
};
