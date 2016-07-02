/**
 * TemplateWorker leverages the creation of HTML templates
 * using Handlebars off the main execution thread
 */
var data, html;

self.addEventListener('message', function( aEvent ) {

    data = aEvent.data;

    if ( data !== undefined ) {

        switch ( data.cmd )
        {
            case "init":

                var scripts = data.scripts;

                if ( Array.isArray( scripts )) {
                    scripts.forEach( function( script ) {
                        importScripts( script );
                    });
                    if ( Handlebars !== undefined )
                        registerHelpers();
                }
                break;

            case "render":

                html = "";

                if ( typeof self.effluxTemplates[ data.template ] === "function" ) {
                    html = self.effluxTemplates[ data.template ]( data.data );
                }
                self.postMessage({ cmd: "ready", template: data.template, html: html });
                break;
        }
    }

}, false );

function registerHelpers() {

    /**
     * use in template like:
     * {{toLowerCase propertyName}}
     */
    Handlebars.registerHelper( "toLowerCase", function( string ) {

        if ( typeof string === "string" )
            return string.toLowerCase();

        return "";
    });

    /**
     * use in template like:
     * {{loop 10}}
     */
    Handlebars.registerHelper( "loop", function( n, block ) {

        var out = "";

        for( var i = 0; i < n; ++i )
            out += block.fn( i );

        return out;
    });

    /**
     * formats module parameter automations (patternTrackList)
     *
     * use in template like:
     * {{mparam event.mp}}
     */
    Handlebars.registerHelper( "mparam", function( data ) {

        var out = "";

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
}