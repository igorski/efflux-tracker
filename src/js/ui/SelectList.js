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
module.exports = SelectList;

function SelectList( selects, parent, keyboardControllerRef )
{
    /* instance properties */

    /**
     * all Select instances that should be managed by this SelectList
     * their order determines tab index
     *
     * @private
     * @type {Array.<Select>}
     */
    this._selects = selects;

    /**
     * the parent class that manages the SelectList, should be
     * a keyboardController listener type
     *
     * @private
     * @type {Object}
     */
    this._parent = parent;

    /**
     * the keyboard controller used to delegate all keyboard events
     *
     * @private
     * @type {KeyboardController}
     */
    this._keyboardController = keyboardControllerRef;

    /**
     * index of the currently focused Select
     *
     * @private
     * @type {number}
     */
    this._currentFocus = 0;

    /**
     * max index for a focus
     *
     * @private
     * @type {number}
     */
    this._maxFocus = this._selects.length - 1;

    /* initialize */

    this._selects.forEach( function( select )
    {
        select.selectList = this;

    }.bind( this ));
}

/* public methods */

/**
 * focus on the select at given index
 *
 * @public
 *
 * @param {number} selectIndex
 * @param {boolean=} force optional, whether to force focus defaults to false
 */
SelectList.prototype.focus = function( selectIndex, force )
{
    var backwards = ( selectIndex < this._currentFocus );
    var i, nextFocused;

    if ( !backwards )
    {
        for ( i = selectIndex; i <= this._maxFocus; ++i )
        {
            nextFocused = this._selects[ i ];

            if ( nextFocused.isEnabled() )
                break;
        }
    }
    else {
        for ( i = selectIndex; i >= 0; --i )
        {
            nextFocused = this._selects[ i ];

            if ( nextFocused.isEnabled() )
                break;
        }
    }

    if ( force === true )
        nextFocused = this._selects[ selectIndex ];

    if ( nextFocused ) {
        this._selects.forEach( function( select ) {
            select.blur();
        });
        this.focusOnSelect( nextFocused );
    }
};

/**
 * @public
 * @param {Select} select
 */
SelectList.prototype.focusOnSelect = function( select )
{
    this._currentFocus = this._selects.indexOf( select );
    select.focus();
    this._keyboardController.setListener( this );
};

/* event handlers */

/**
 * @public
 *
 * @param {string} type
 * @param {number} keyCode
 * @param {Event} event
 */
SelectList.prototype.handleKey = function( type, keyCode, event )
{
    var handled = this._selects[ this._currentFocus ].handleKey( type, keyCode, event );

    if ( type === "down" )
    {
        switch ( keyCode )
        {
            case 9:  // tab

                if ( event.shiftKey && this._currentFocus > 0 )
                    this.focus( this._currentFocus - 1 );

                else if ( !event.shiftKey && this._currentFocus < this._maxFocus )
                    this.focus( this._currentFocus + 1 );

                break;

            case 13: // enter

                // last selection confirmed, we're done

                if ( this._currentFocus === this._maxFocus ) {
                    this._keyboardController.setListener( this._parent );
                    this._parent.handleKey( type, keyCode, event );
                }
                else
                    this.focus( this._currentFocus + 1 );

                break;

            case 27: // escape

                // if current select box isn't open, we're cancelling the entire ist input

                if ( !handled && !this._selects[ this._currentFocus ].isOpen()) {
                    this._keyboardController.setListener( this._parent );
                    this._parent.handleKey( type, keyCode, event );
                }

                break;
        }
    }
    event.preventDefault();
};
