/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2017 - http://www.igorski.nl
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

let efflux, editorModel, selectionModel, wrapper, patternContainer,
    pContainers, pContainerSteps, slotHighlight;

const SLOT_WIDTH  = 150;
const SLOT_HEIGHT = 32;

const PatternTrackListView = module.exports = {

    init( effluxRef, wrapperRef ) {

        efflux           = effluxRef;
        wrapper          = wrapperRef;
        editorModel      = efflux.EditorModel;
        selectionModel   = efflux.SelectionModel;
        patternContainer = document.querySelector( "#patternContainer" );
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
            activeChannel : editorModel.activeInstrument,
            activeStep    : editorModel.activeStep,
            format        : efflux.SettingsModel.getSetting( SettingsModel.PROPERTIES.INPUT_FORMAT ) || "hex"

        }).then(() => {

            // clear cached containers after render
            pContainers = null;
            pContainerSteps = [];

            if ( editorModel.activeStep !== -1 )
                PatternTrackListView.highlightActiveStep();
        });
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

        for ( let pIndex = 0, l = pContainers.length; pIndex < l; ++pIndex ) {
            pContainer = pContainers[ pIndex ];
            selection  = selectionModel.selectedChannels[ pIndex ];
            items      = grabPatternContainerStepFromTemplate( pIndex );
            pContainer.querySelectorAll( "li" );

            let sIndex = items.length;

            while ( sIndex-- ) {

                item = items[ sIndex ];

                const activePattern      = ( pIndex === editorModel.activeInstrument );
                const activeSelectedStep = ( sIndex === activeStep );

                // no particular slot selected within pattern step

                if ( activeSlot === -1 ) {

                    const css = item.classList;

                    if ( activePattern && activeSelectedStep )
                        css.add( activeStyle );
                    else
                        css.remove( activeStyle );

                    // highlight selection if set

                    if ( selection && selection.indexOf( sIndex ) > -1 )
                        css.add( selectedStyle );
                    else
                        css.remove( selectedStyle );
                }
                else {
                    // slot selected, highlight active slot

                    if ( activePattern && activeSelectedStep ) {
                        const slots = item.querySelectorAll( "span" );
                        slotHighlight = slots[ activeSlot ];
                        if ( slotHighlight )
                            slotHighlight.classList.add( activeStyle );
                    }
                    // remove selected style from step if no selection was set
                    if ( !selection )
                        item.classList.remove( selectedStyle );

                    // ensure the step has a selection outline
                    if ( activePattern && activeSelectedStep )
                        item.classList.add( activeStyle );
                    else
                        item.classList.remove( activeStyle );
                }
            }
        }
    },

    /**
     * handle the event when the user clicks/taps a slot within the pattern
     *
     * @public
     * @param aEvent
     * @param keyboardController
     * @param patternTrackListController
     */
    handleSlotClick( aEvent, keyboardController, patternTrackListController ) {
        grabPatternContainersFromTemplate();
        const shiftDown = keyboardController.hasShift();
        let selectionChannelStart = editorModel.activeInstrument,
            selectionStepStart    = editorModel.activeStep;
        let found = false, pContainer, items;

        if ( selectionModel.hasSelection() ) {
            selectionChannelStart = selectionModel.firstSelectedChannel;
            selectionStepStart    = selectionModel.minSelectedStep;
        }

        for ( let i = 0, l = pContainers.length; i < l; ++i ) {

            if ( found ) break;

            pContainer = pContainers[ i ];
            items = grabPatternContainerStepFromTemplate( i );

            let j = items.length;
            while ( j-- )
            {
                if ( items[ j ] === aEvent.target ) {

                    if ( i !== editorModel.activeInstrument ) {
                        editorModel.activeInstrument = i; // when entering a new channel lane, make default instrument match index
                        editorModel.activeInstrument = i;
                    }

                    // if shift was held down, we're making a selection
                    if ( shiftDown ) {
                        selectionModel.setSelectionChannelRange( selectionChannelStart, i );
                        selectionModel.setSelection( selectionStepStart, j );
                    }
                    else
                        selectionModel.clearSelection();

                    editorModel.activeStep = j;
                    editorModel.activeSlot = -1;

                    if ( !shiftDown && aEvent.type === "click" )
                        selectSlotWithinClickedStep( aEvent );

                    PatternTrackListView.highlightActiveStep();

                    keyboardController.setListener( patternTrackListController );

                    if ( aEvent.type === "dblclick" ) {
                        aEvent.preventDefault();
                        patternTrackListController.editNoteForStep();
                        found = true;
                    }
                    break;
                }
            }
        }
    },

    /**
     * ensure the currently active step (after a keyboard navigation)
     * is visible on screen
     */
    focusActiveStep( container ) {

        const top        = container.scrollTop;
        const left       = patternContainer.scrollLeft;
        const bottom     = top + container.offsetHeight;
        const right      = left + patternContainer.offsetWidth;
        const slotLeft   = editorModel.activeInstrument * SLOT_WIDTH;
        const slotRight  = ( editorModel.activeInstrument + 1 ) * SLOT_WIDTH;
        const slotTop    = editorModel.activeStep * SLOT_HEIGHT;
        const slotBottom = ( editorModel.activeStep + 1 ) * SLOT_HEIGHT;

        if ( slotBottom >= bottom ) {
            container.scrollTop = slotBottom - container.offsetHeight;
        }
        else if ( slotTop < top ) {
            container.scrollTop = slotTop;
        }

        if ( slotRight >= right ) {
            patternContainer.scrollLeft = ( slotRight - patternContainer.offsetWidth ) + SLOT_WIDTH;
        }
        else if ( slotLeft < left ) {
            patternContainer.scrollLeft = slotLeft;
        }
    }
};

/* internal methods */

function selectSlotWithinClickedStep( aEvent ) {
    // only when supported, and even then not on Safari... =/
    if ( !( "caretRangeFromPoint" in document ) || Bowser.safari )
        return;

    const el = document.caretRangeFromPoint( aEvent.clientX, aEvent.clientY );
    let slot = 0;

    if ( el && el.startContainer ) {
        let container = el.startContainer;
        if ( !( container instanceof Element && container.parentElement instanceof Element ))
            container = container.parentElement;

        if ( container.classList.contains( "moduleValue" ))
            slot = 3;
        else if ( container.classList.contains( "moduleParam" ))
            slot = 2;
        else if ( container.classList.contains( "instrument" ))
            slot = 1;
    }
    editorModel.activeSlot = slot;
    Pubsub.publish( Messages.HIGHLIGHTED_SLOT_CHANGED );
}

/**
 * function to retrieve and cache the currently available DOM containers
 * inside the pattern template
 *
 * @private
 */
function grabPatternContainersFromTemplate() {
    pContainers = pContainers || wrapper.querySelectorAll( ".pattern" );
}

function grabPatternContainerStepFromTemplate( i ) {
    return ( pContainerSteps[ i ] = pContainerSteps[ i ] || pContainers[ i ].querySelectorAll( "li" ));
}
