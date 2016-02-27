/* imports */

var eventHandler = require( "zjslib" ).EventHandler;
var DOM          = require( "zjslib" ).DOM;

/* variables */

var header, menu, toggle;

var handler        = new eventHandler(),
    menuOpened     = false; // whether menu is opened (mobile hamburger menu)

module.exports =
{
    init : function()
    {
        menu   = document.getElementById( "menu" );
        header = document.getElementById( "header" );

        if ( menu && header )
            toggle = menu.querySelector( ".toggle" );

        if ( toggle )
            handler.addEventListener( toggle, "click", handleToggle );
    }
};

/* event handlers */

function handleToggle( e )
{
    menuOpened = !menuOpened;

    if ( menuOpened )
    {
        DOM.addClass( menu,   "opened" );
        DOM.addClass( header, "expanded" );

        document.body.style.overflow = "hidden"; // prevent scrolling main body when scrolling menu list
    }
    else {
        DOM.removeClass( menu,   "opened" );
        DOM.removeClass( header, "expanded" );
        document.body.style.overflow = "auto";
    }
}
