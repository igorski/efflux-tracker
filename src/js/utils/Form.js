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
        return aSelect.options[ aSelect.selectedIndex ].value;
    },

    /**
     * sets the currently selected index of a given select input
     * element to the option that matches given aValue
     *
     * @param {Element} aSelect
     * @param {string|number} aValue
     */
    setSelectedOption : function( aSelect, aValue )
    {
        var options = aSelect.options;
        var i = options.length, option;

        aValue = aValue.toString();

        while ( i-- )
        {
            option = options[ i ];

            if ( option.value === aValue ) {
                option.setAttribute( "selected", "selected" );
            }
            else {
                option.removeAttribute( "selected" );
            }
        }
    }
};
