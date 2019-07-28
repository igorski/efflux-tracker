/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2017-2019 - https://www.igorski.nl
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
import Vue          from 'vue';
import EventFactory from '../../model/factory/EventFactory';
import EventUtil    from '../../utils/EventUtil';
import NumberUtil   from '../../utils/NumberUtil';
import Messages     from '../../definitions/Messages';
import Pubsub       from 'pubsub-js';

let store, state;
let lastCharacter = "", lastTypeAction = 0;

export default {

    init(storeReference) {
        store = storeReference;
        state = store.state;
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
        switch ( store.getters.getSetting( state.settings.PROPERTIES.INPUT_FORMAT )) {
            default:
            case 'hex':
                if ( !NumberUtil.isHex( value ))
                    return;
                else
                    value = NumberUtil.fromHex( value );
                    break;

            case 'pct':
                value = parseFloat( value );
                if ( isNaN( value ) || value < 0 || value > 100 )
                    return;
        }

        const event = getEventForPosition( true );

        // no module param defined yet ? create as duplicate of previously defined property
        if ( !event.mp ) {
            const prevEvent = getPreviousEventWithModuleAutomation(state.editor.activeStep);
            Vue.set(event, 'mp', EventFactory.createModuleParam(
                ( prevEvent && prevEvent.mp ) ? prevEvent.mp.module : 'volume', 50, false
            ));
        }
        Vue.set(event.mp, 'value', value);
    }
};

/* internal methods */

function getPreviousEventWithModuleAutomation( step ) {
    let prevEvent;
    while ( !prevEvent || !prevEvent.mp ) {

        if ( step <= 0 )
            return null;

        prevEvent = EventUtil.getFirstEventBeforeStep(
            state.song.activeSong
                .patterns[ state.sequencer.activePattern ]
                .channels[ state.editor.activeInstrument ], step
        );
        step = ( prevEvent ) ? step - 1 : 0;
    }
    return prevEvent;
}

// TODO: duplicated from ModuleParamHandler...

function getEventForPosition( createIfNotExisting ) {
    let event = state.song.activeSong
                    .patterns[ state.sequencer.activePattern ]
                    .channels[ state.editor.activeInstrument ][ state.editor.activeStep ];

    if ( !event && createIfNotExisting === true ) {

        event = EventFactory.createAudioEvent(state.editor.activeInstrument);
        store.commit('addEventAtPosition', {
            store, event,
            optData: {
                patternIndex      : state.sequencer.activePattern,
                channelIndex      : state.editor.activeInstrument,
                step              : state.editor.activeStep,
                newEvent          : true,
                advanceOnAddition : false
            }
        });
    }
    return event;
}
