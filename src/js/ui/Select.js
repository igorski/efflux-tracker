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
module.exports = Select;

/**
 * a custom Select element that behaves consistenly across
 * browsers / operating systems with regards to keyboard control !
 *
 * @constructor

 * @param {Element} aElement DOM element that acts as the container
 * @param {!Function} aChangeCallback callback to fire whenever the selected
 *                    value of the Select has changed
 * @param {Array.<Object>=} aOptions optional, list of values to populate the select with
 *        you can also supply an element with a child <ul> element with list items
 */
function Select( aElement, aChangeCallback, aOptions )
{
    /* instance properties */

    /**
     * @private
     * @type {Array.<{
      *        title: string,
      *        value: string
      *      }>}
     */
    this._options;

    /**
     * @private
     * @type {Element}
     */
    this._element;

    /**
     * @private
     * @type {Element}
     */
    this._container;

    /**
     * optional SelectList this Select can belong to
     *
     * @public
     * @type {SelectList}
     */
    this.list;

    /**
     * @private
     * @type {boolean}
     */
    this._opened = false;

    /**
     * @private
     * @type {boolean}
     */
    this._focused = false;

    /**
     * @private
     * @type {number}
     */
    this._selectedIndex = 0;

    /**
     * the selected index upon focus
     *
     * @public
     * @type {string}
     */
    this._selectedIndexOnFocus = -Infinity;

    /**
     * @private
     * @type {!Function}
     */
    this._onChange = aChangeCallback;

    /* initialize */

    if ( aElement.tagName === "UL" ) {
        this._element   = aElement;
        this._container = aElement.parentNode;
    }
    else
    {
        this._container = aElement;
        var foundList   = false;

        if ( aElement.childNodes.length > 0 )
        {
            var i = aElement.childNodes.length, node, child;

            while ( i-- )
            {
                node = aElement.childNodes[ i ];
                if ( node.tagName === "UL" || node.tagName === "OL" ) {
                    this._element = node;
                    this._options = [];

                    // collect options when defined as li nodes
                    var j = node.childNodes.length;
                    while ( j-- ) {
                        child = node.childNodes[ j ];
                        if ( child.tagName === "LI" ) {
                            this._options.push({
                                title: child.innerHTML,
                                value: child.getAttribute( "data-value" ) || child.innerHTML
                            });
                        }
                    }
                    this._options.reverse();
                    foundList = true;
                    break;
                }
            }
        }

        if ( !foundList ) {
            this._element = document.createElement( "ul" );
            aElement.appendChild( this._element );
        }
    }

    if ( aOptions instanceof Array )
        this.setOptions( aOptions );

    aElement.addEventListener( "click", this.handleClick.bind( this ));
    aElement.classList.add( "selector" );
}

/* public methods */

/**
 * @public
 *
 * @param {Array.<{
 *          title: string,
 *          value: string
 *        }>} aOptions
 */
Select.prototype.setOptions = function( aOptions )
{
    this._selectedIndex = 0;
    this._options       = aOptions;

    var element = this._element;

    // remove existing contents

    while ( element.childNodes.length > 0 ) {
        element.removeChild( element.childNodes[ 0 ]);
    }

    var option;
    aOptions.forEach( function( aOption, index )
    {
        option = document.createElement( "li" );
        option.innerHTML = aOption.title;
        option.setAttribute( "data-value", aOption.value );

        element.appendChild( option );

        // auto select first value

        if ( index === 0 )
            option.classList.add( "selected" );
    });
};

/**
 * @public
 * @return {boolean}
 */
Select.prototype.hasOptions = function()
{
    return this._options instanceof Array && this._options.length > 0;
};

/**
 * retrieve the currently selected value
 *
 * @public
 * @return {string}
 */
Select.prototype.getValue = function()
{
    if ( this._options.length > this._selectedIndex )
        return this._options[ this._selectedIndex ].value;

    return null;
};

/**
 * @public
 *
 * @param {string} value
 * @param {boolean=} dispatch optional, whether to fire change callback, defaults to true
 */
Select.prototype.setValue = function( value, dispatch )
{
    if ( !this._options || this._options.length === 0 || ( value === null || value === undefined )) {
        this._selectedIndex = 0;
        return;
    }

    dispatch = ( typeof dispatch === "boolean" ) ? dispatch : true;

    var i = this._options.length, option;
    while ( i-- )
    {
        option = this._options[ i ];

        if ( option.value.toString() === value.toString() ) {

            this._selectedIndex = i;
            this._element.childNodes[ i ].classList.add( "selected" );

            if ( dispatch && typeof this._onChange === "function" )
                this._onChange();
        }
        else {
            this._element.childNodes[ i ].classList.remove( "selected" );
        }
    }
};

/**
 * selects a value if the given value matches the first
 * character of the value title
 *
 * @public
 * @param {string|number} value
 *
 * @return {boolean} whether something has changed
 */
Select.prototype.setValueByFirstLetter = function( value )
{
    if ( typeof value === "string" && value.length > 1 )
        throw new Error( "cannot work with multiple characters, only single digits" );

    var char = value.toString().toUpperCase(), l = this._options.length, option;

    // start from the currently select index (allows jumping between values
    // that have a similar start character)

    for ( var i = this._selectedIndex + 1; i < l; ++i )
    {
        option = this._options[ i ];

        if ( option.title.charAt && option.title.charAt( 0 ).toUpperCase() === char ||
             option.title.toString() === value )
        {
            this.setValue( option.value, false );
            return true;
        }
    }

    // no value found, start from the beginning of the range

    for ( i = 0, l = this._selectedIndex; i < l; ++i )
    {
        option = this._options[ i ];

        if ( option.title.charAt && option.title.charAt( 0 ).toUpperCase() === char ||
             option.title.toString() === value )
        {
            this.setValue( option.value, false );
            return true;
        }
    }
    return false;
};

/**
 * @public
 *
 * @param {boolean} value
 */
Select.prototype.setEnabled = function( value )
{
    this._enabled = ( typeof value === "boolean" ) ? value : false;

    if ( this._enabled ) {
        this._element.classList.remove( "disabled" );
    }
    else {
        this._element.classList.add( "disabled" );
    }
};

/**
 * @public
 * @return {boolean}
 */
Select.prototype.isEnabled = function()
{
    return this._enabled;
};

/**
 * @public
 */
Select.prototype.focus = function()
{
    if ( this._focused )
        return;

    this._container.focus();
    this._container.classList.add( "focused" );

    this._focused              = true;
    this._selectedIndexOnFocus = this._selectedIndex;
};

/**
 * @public
 */
Select.prototype.blur = function()
{
    if ( !this._focused )
        return;

    this._container.classList.remove( "focused" );
    this.close();

    this._focused = false;
};

/**
 * @public
 * @return {boolean}
 */
Select.prototype.isFocused = function()
{
    return this._focused;
};

/**
 * @public
 */
Select.prototype.open = function()
{
    this._opened = true;
    this._container.classList.add( "opened" );
};

/**
 * @public
 */
Select.prototype.close = function()
{
    this._opened = false;
    this._container.classList.remove( "opened" );
};

/**
 * @public
 * @return {boolean}
 */
Select.prototype.isOpen = function()
{
    return this._opened;
};

/* event handlers */

/**
 * @public
 *
 * @param {string} type
 * @param {number} keyCode
 * @param {Event} event
 *
 * @return {boolean} whether key was handled
 */
Select.prototype.handleKey = function( type, keyCode, event )
{
    var maxIndex = this._options.length - 1;
    var handled = true;

    if ( type === "down" )
    {
        switch ( keyCode )
        {
            default:

                // any other key pressed (likely letter or number)
                // check whether there is a value in the options list that start with this character
                var char = String.fromCharCode(( 96 <= keyCode && keyCode <= 105 )? keyCode - 48 : keyCode );
                handled = this.setValueByFirstLetter( char );
                break;

            case 38: // up
            case 37: // left

                if ( !this._opened ) {
                    this.open();
                }

                if ( --this._selectedIndex < 0 )
                    this._selectedIndex = 0;
                else
                    this.setValue( this._options[ this._selectedIndex ].value, false );

                break;

            case 40: // down
            case 39: // right

                if ( !this._opened ) {
                    this.open();
                }

                if ( ++this._selectedIndex > maxIndex )
                    this._selectedIndex = maxIndex;
                else
                    this.setValue( this._options[ this._selectedIndex ].value, false );

                break;

            case 32: // space
            case 13: // enter
            case 9:  // tab

                if ( this._selectedIndex !== this._selectedIndexOnFocus &&
                    typeof this._onChange === "function" )
                {
                    this._onChange();
                }

                if ( this._opened ) {

                    this.close();
                }
                else
                    this.open();

                break;

            case 27: // escape

                if ( this._opened )
                    this.close();
                else
                    handled = false;

                break;
        }
    }
    event.preventDefault();
    return handled;
};

/**
 * @private
 *
 * @param {Event} aEvent
 */
Select.prototype.handleClick = function( aEvent )
{
    if ( !this._opened ) {
        this.open();

        if ( this.list ) {
            this.list.focusOnSelect( this );
        }
    }
    else {
        var target = aEvent.target;
        if ( target.nodeName === "LI" )
            this.setValue( target.getAttribute( "data-value" ));

        this.close();
    }
};
