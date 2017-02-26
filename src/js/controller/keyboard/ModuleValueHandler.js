/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2017 - http://www.igorski.nl
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

const SettingsModel = require( "../../model/SettingsModel" );
const EventFactory  = require( "../../model/factory/EventFactory" );
const EventUtil     = require( "../../utils/EventUtil" );
const NumberUtil    = require( "../../utils/NumberUtil" );
const Messages      = require( "../../definitions/Messages" );
const Pubsub        = require( "pubsub-js" );

let efflux, editorModel;

let lastCharacter = "", lastTypeAction = 0;

module.exports = {

    init( effluxRef ) {

        efflux      = effluxRef;
        editorModel = efflux.EditorModel;
    },

    handleParam( keyCode ) {
        const now = Date.now();
        const previousTypeAction = lastTypeAction;

        lastTypeAction = now;

        const character = String.fromCharCode(( 96 <= keyCode && keyCode <= 105 )? keyCode - 48 : keyCode );

        if ( !character || !character.match( /^[a-z0-9]+$/i ))
            return;

        // if this character was typed shortly after the previous one,
        // combine their values for more precise control

        let value = ( now - previousTypeAction < 500 ) ? lastCharacter + character : "0" + character;
        lastCharacter = character;

        // validate value
        switch ( efflux.SettingsModel.getSetting( SettingsModel.PROPERTIES.INPUT_FORMAT )) {
            default:
            case "hex":
                if ( !NumberUtil.isHex( value ))
                    return;
                else
                    value = NumberUtil.fromHex( value );
                    break;

            case "pct":
                value = parseFloat( value );
                if ( isNaN( value ) || value < 0 || value > 100 )
                    return;
        }

        const event = getEventForPosition( true );

        // no module param defined yet ? create as duplicate of previously defined property
        if ( !event.mp ) {
            const prevEvent = EventUtil.getFirstEventBeforeStep(
                efflux.activeSong.patterns[ editorModel.activePattern ]
                                 .channels[ editorModel.activeInstrument ], editorModel.activeStep
            );
            event.mp = EventFactory.createModuleParam(
                ( prevEvent && prevEvent.mp ) ? prevEvent.mp.module : "volume", 50, false
            );
        }

        event.mp.value = value;

        Pubsub.publish( Messages.REFRESH_PATTERN_VIEW );
    }
};

// TODO: duplicated from ModuleParamHandler...

function getEventForPosition( createIfNotExisting ) {
    let event = efflux.activeSong.patterns[ editorModel.activePattern ]
                                 .channels[ editorModel.activeInstrument ][ editorModel.activeStep ];

    if ( !event && createIfNotExisting === true ) {

        event = EventFactory.createAudioEvent();

        event.instrument = editorModel.activeInstrument;
        Pubsub.publish( Messages.ADD_EVENT_AT_POSITION, [ event, {
            patternIndex      : editorModel.activePattern,
            channelIndex      : editorModel.activeInstrument,
            step              : editorModel.activeStep,
            newEvent          : true,
            advanceOnAddition : false
        } ]);
    }
    return event;
}
