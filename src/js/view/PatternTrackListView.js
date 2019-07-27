/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2018 - https://www.igorski.nl
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

const SettingsModel = require( "../model/SettingsModel" );
const Messages      = require( "../definitions/Messages" );
const Pubsub        = require( "pubsub-js" );
const Bowser        = require( "bowser" );

let efflux, editorModel, selectionModel, settingsModel, wrapper, container,
    pContainers, pContainerSteps, slotHighlight;

let stepAmount = 0, rafPending = false, containerWidth = 0, containerHeight = 0;

const self = module.exports = {

    init( effluxRef, containerRef, wrapperRef ) {

        efflux         = effluxRef;
        wrapper        = wrapperRef;
        editorModel    = efflux.EditorModel;
        selectionModel = efflux.SelectionModel;
        settingsModel  = efflux.SettingsModel;
        container      = containerRef;

        // initialize
        updateStepAmount( 16 );
    },

    /**
     * render the currently active pattern on-screen
     * @public
     * @param {PATTERN} pattern
     */
    render( pattern ) {

        efflux.TemplateService.render( "patternTrackList", wrapper, {
            steps         : editorModel.amountOfSteps,
            pattern       : pattern,
            activeStep    : editorModel.activeStep,
            format        : settingsModel.getSetting( SettingsModel.PROPERTIES.INPUT_FORMAT ) || "hex"

        }).then(() => {

            // clear cached containers after render
            pContainers     = null;
            pContainerSteps = [];

            if ( editorModel.activeStep !== -1 )
                self.highlightActiveStep();
        });

        // subscribe to pubsub messaging

        [
            Messages.SONG_LOADED,

        ].forEach(( msg ) => Pubsub.subscribe( msg, handleBroadcast ));
    },

    /**
     * highlights the currently active step (and its slots)
     * inside the pattern view
     *
     * @public
     */
    highlightActiveStep() {
        grabPatternContainersFromTemplate();
        const activeStyle = "active", selectedStyle = "selected",
              activeStep  = editorModel.activeStep,
              activeSlot  = editorModel.activeSlot;

        let selection, pContainer, items, item;

        if ( slotHighlight )
            slotHighlight.classList.remove( activeStyle );

        slotHighlight = null;

        for ( let channelIndex = 0, l = pContainers.length; channelIndex < l; ++channelIndex ) {
            pContainer = pContainers[ channelIndex ];
            selection  = selectionModel.selectedChannels[ channelIndex ];
            items      = grabPatternContainerStepFromTemplate( channelIndex );
            pContainer.querySelectorAll( "li" );

            let stepIndex = items.length;

            while ( stepIndex-- ) {

                item = items[ stepIndex ];

                const activeChannel      = ( channelIndex === editorModel.activeInstrument );
                const activeSelectedStep = ( stepIndex === activeStep );

                // no particular slot selected within pattern step

                if ( activeSlot === -1 ) {

                    const css = item.classList;

                    if ( activeChannel && activeSelectedStep )
                        css.add( activeStyle );
                    else
                        css.remove( activeStyle );

                    // highlight selection if set

                    if ( selection && selection.indexOf( stepIndex ) > -1 )
                        css.add( selectedStyle );
                    else
                        css.remove( selectedStyle );
                }
                else {
                    // slot selected, highlight active slot

                    //if ( activeChannel && activeSelectedStep ) {
                    //    const slots = item.querySelectorAll( "span" );
                    //    slotHighlight = slots[ activeSlot ];
                    //    if ( slotHighlight )
                    //        slotHighlight.classList.add( activeStyle );
                    //}
                    //// remove selected style from step if no selection was set
                    //if ( !selection )
                    //    item.classList.remove( selectedStyle );

                    // ensure the step has a selection outline
                    if ( activeChannel && activeSelectedStep )
                        item.classList.add( activeStyle );
                    else
                        item.classList.remove( activeStyle );
                }
            }
        }
    },
};

/* internal methods */

function handleBroadcast( type, payload ) {
    switch ( type ) {
        case Messages.SONG_LOADED:
            updateStepAmount( editorModel.amountOfSteps );
            break;
    }
}


function updateStepAmount( amount ) {
    stepAmount = amount;
}
