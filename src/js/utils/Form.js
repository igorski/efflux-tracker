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
module.exports =
{
    /**
     * convenience method to get the value of the currently
     * selected option for given select input element
     *
     * @param {Element} aSelect
     * @return {string}
     */
    getSelectedOption : function( aSelect )
    {
        if ( aSelect.options && aSelect.options.length > 0 )
            return aSelect.options[ aSelect.selectedIndex ].value;

        return "";
    },

    /**
     * sets the currently selected index of a given select input
     * element to the option that matches given aValue
     *
     * @param {Element} aSelect
     * @param {string|number|boolean} aValue
     */
    setSelectedOption : function( aSelect, aValue )
    {
        var options = aSelect.options;

        if ( !options )
            return;

        var i = options.length, option;

        aValue = aValue.toString();

        while ( i-- )
        {
            option = options[ i ];

            if ( option.value === aValue ) {
                option.setAttribute( "selected", "selected" );
                aSelect.value = aValue;
            }
            else {
                option.removeAttribute( "selected" );
            }
        }
    },

    /**
     * sets the available options for a given select box
     *
     * @param {Element} aSelect
     * @param {Array.<{
     *            title: string,
     *            value: *
     *        }>} aOptions
     */
    setOptions : function( aSelect, aOptions )
    {
        var children = aSelect.childNodes;
        var i = children.length;

        while ( i-- ) {
            aSelect.removeChild( aSelect.childNodes[ i ]);
        }

        var element;

        aOptions.forEach( function( option )
        {
            element           = document.createElement( "option" );
            element.value     = option.value;
            element.innerHTML = option.title;

            aSelect.appendChild( element );
        });
    }
};
