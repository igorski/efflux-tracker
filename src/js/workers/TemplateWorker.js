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
     * comparison functions for templates, use like:
     * {{#if (eq variable "value")}} ... {{/if}}
     *
     * multiple conditionals:
     *
     * {{#if (and
     *           (eq variable "value")
     *           (eq variable2 "value"))}}
     */
    Handlebars.registerHelper({

        eq: function (v1, v2) {
            return v1 === v2;
        },/*
        ne: function (v1, v2) {
            return v1 !== v2;
        },
        lt: function (v1, v2) {
            return v1 < v2;
        },
        gt: function (v1, v2) {
            return v1 > v2;
        },
        lte: function (v1, v2) {
            return v1 <= v2;
        },
        gte: function (v1, v2) {
            return v1 >= v2;
        },
        */
        and: function (v1, v2) {
            return v1 && v2;
        },
        or: function (v1, v2) {
            return v1 || v2;
        }
    });

    /**
     * formats module parameter automations (patternTrackList)
     *
     * use in template like:
     */
    Handlebars.registerHelper( "mparam", function( data ) {

        var out = ( data && data.glide ) ? "G " : "";

        if ( data && data.module ) {
            out += data.module.charAt( 0 ).toUpperCase();
            out += data.module.match(/([A-Z]?[^A-Z]*)/g)[1].charAt( 0 );
        }
        return out;
    });

    /**
     * formats module parameter automation value (patternTrackList)
     * can display in either hexadecimal or percentage-based values
     *
     * use in template like:
     * {{mparam event.mp formatType}}
     */
    Handlebars.registerHelper( "mvalue", function( data, paramFormat ) {

        var out = "", value;

        if ( data ) {

            // show parameter value in either hex or percentages
            // TODO there is a bit of code duplication with NumberUtil here...
            if ( paramFormat === "pct" )
                value = Math.min( 99, parseInt( data.value, 10 )).toString();
            else {
                value = Math.round( data.value * ( 255 / 100 )).toString( 16 ).toUpperCase();
            }
            out += " " + (( value.length === 1 ) ? "0" + value : value );
        }
        return out;
    });
}
