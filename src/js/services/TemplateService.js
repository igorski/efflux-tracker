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
const Config = require( "../config/Config" );

const TemplateService = module.exports = function()
{
    /* instance properties */

    /**
     * @private
     * @type {Worker}
     */
    this._worker = new Worker("../../workers/TemplateWorker.js");

    /**
     * @private
     * @type {Object}
     */
    this._jobs = {};

    /* initialize */

    this._worker.postMessage({ cmd: "init", scripts: [
        Config.getBasePath() + "/handlebars/handlebars.js",
        Config.getBasePath() + "/handlebars/templates.js"
    ]});
};

/**
 * render a template using Handlebars
 *
 * @public
 * @param {string} aTemplateName name of the .hbs file to render
 * @param {Element} aContainer to append Handlebars contents to
 * @param {Object=} aData optional data to pass to the template
 * @param {boolean=} aAppend optional, whether to append the data after
 *        the current containers contents (defaults to false for a full replace)
 * @param {boolean=} aAutoApply optional, whether to automatically apply the template data
 *                   onto given container, defaults to true
 *
 * @return {Promise}
 */
TemplateService.prototype.render = function( aTemplateName, aContainer, aData, aAppend, aAutoApply ) {

    createJob( this, aTemplateName, aContainer, aAppend, aAutoApply );

    const self = this;
    return new Promise(( resolve, reject ) => {

        const callback = ( html ) => {

            if ( typeof html === "string" ) {
                resolve( html );
            }
            else {
                reject();
            }
        };
        invokeWorker( self, aTemplateName, aData, callback );
    });
};

/**
 * render a template using Handlebars and return an Element
 *
 * @param {string} aTemplateName
 * @param {Object=} aData optional data to pass to the template
 *
 * @return {Promise} success handler receives created Element with applied template
 */
TemplateService.prototype.renderAsElement = function( aTemplateName, aData ) {

    createJob( this, aTemplateName, null, false, false );

    const self = this;
    return new Promise(( resolve, reject ) => {

        const callback = ( html ) => {

            if ( typeof html === "string" ) {

                const element = document.createElement( "div" );
                element.setAttribute( "class", aTemplateName + "-wrapper" );

                if ( html.length > 0 )
                    element.innerHTML = html;

                resolve( element );
            }
            else {
                reject();
            }
        };
        invokeWorker( self, aTemplateName, aData, callback );
    });
};

/**
 * invoked whenever the Worker has finished rendering a job
 *
 * @private
 *
 * @param {string} templateName
 * @param {string} html
 */
TemplateService.prototype.applyTemplate = function( templateName, html )
{
    const job = this._jobs[ templateName ];

    if ( job && job.apply ) {

        if ( job.append )
            job.container.innerHTML += html;
        else
            job.container.innerHTML = html;
    }
    delete this._jobs[ templateName ];
};

/* private methods */

function createJob( serviceRef, aTemplateName, aContainer, aAppend, aAutoApply )
{
    serviceRef._jobs[ aTemplateName ] = {
        container : aContainer,
        append    : ( aAppend === true ),
        apply     : ( typeof aAutoApply === "boolean" ) ? aAutoApply : true
    };
}

function invokeWorker( serviceRef, aTemplateName, aData, aCallback )
{
    const handler = ( msg ) => {

        const data = msg.data;
        if ( data && data.cmd === "ready" ) {
            if ( data.template === aTemplateName ) {
                serviceRef.applyTemplate( data.template, data.html );
                serviceRef._worker.removeEventListener( "message", handler );
                aCallback( data.html );
            }
        }
    };

    serviceRef._worker.addEventListener( "message", handler );
    serviceRef._worker.postMessage({
        cmd: "render",
        template: aTemplateName,
        data: aData
    });
}
