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

const Copy              = require( "../i18n/Copy" );
const Messages          = require( "../definitions/Messages" );
const InstrumentFactory = require( "../model/factory/InstrumentFactory" );
const View              = require( "../view/InstrumentView" );
const ObjectUtil        = require( "../utils/ObjectUtil" );
const Pubsub            = require( "pubsub-js" );

/* private properties */

let container, efflux, model, view;
const EMPTY_PRESET_VALUE = "null";

const InstrumentController = module.exports =
{
    visible : false,

    init( containerRef, effluxRef, keyboardControllerRef ) {
        container = containerRef;
        efflux    = effluxRef;
        model     = efflux.InstrumentModel;

        // prepare view

        View.init( efflux, keyboardControllerRef, handleViewMessage );

        // subscribe to Pubsub system

        [
            Messages.CLOSE_OVERLAYS,
            Messages.TOGGLE_INSTRUMENT_EDITOR,
            Messages.SONG_LOADED,
            Messages.WINDOW_RESIZED

        ].forEach(( msg ) => Pubsub.subscribe( msg, handleBroadcast ));
    },

    update() {
        const instruments = efflux.activeSong.instruments;
        let i = instruments.length;
        model.instrumentRef = null;

        while ( i-- ) {
            if ( instruments[ i ].id == model.instrumentId ) {
                model.instrumentRef = instruments[ i ];
                break;
            }
        }
        if ( !model.instrumentRef )
            return;

        View.update( model.instrumentRef, model.activeOscillatorIndex );

        updatePresetList();
    }
};

/* private methods */

function handleBroadcast( type, payload ) {
    switch ( type ) {
        case Messages.TOGGLE_INSTRUMENT_EDITOR:

            Pubsub.publishSync( Messages.CLOSE_OVERLAYS, InstrumentController );
            Pubsub.publishSync( Messages.SHOW_BLIND );
            Pubsub.publishSync( Messages.OVERLAY_OPENED );

            View.inject( container );

            model.instrumentId = payload;
            InstrumentController.update(); // sync with model
            break;

        case Messages.CLOSE_OVERLAYS:

            if ( payload !== InstrumentController )
                View.remove();
            break;

        case Messages.WINDOW_RESIZED:
            View.updateWaveformSize();
            break;

        case Messages.SONG_LOADED:
            updatePresetList();
            model.activeOscillatorIndex = 0;
            break;
    }
}

function handleViewMessage( type, optPayload ) {
    switch ( type ) {
        case View.EVENTS.READY:
            updatePresetList();
            break;
        case View.EVENTS.SET_OSC:
            model.activeOscillatorIndex = /** @type {number} */ ( optPayload );
            InstrumentController.update();
            break;
        case View.EVENTS.CACHE_OSC:
            cacheOscillatorWaveForm( model.instrumentRef.oscillators[ model.activeOscillatorIndex ]);
            break;
        case View.EVENTS.SELECT_PRESET:
            handlePresetSelect( /** @type {string} */ ( optPayload ));
            break;
        case View.EVENTS.SELECT_INSTRUMENT:
            model.instrumentId = /** @type {number} */ ( optPayload );
            InstrumentController.update();
            break;
        case View.EVENTS.SAVE_PRESET:
            const newPresetName = /** @type {string} */ ( optPayload );
            if ( newPresetName.trim().length === 0 ) {
                Pubsub.publish( Messages.SHOW_ERROR, Copy.get( "ERROR_NO_INS_NAME" ));
            }
            else {
                model.instrumentRef.presetName = newPresetName;
                if ( model.saveInstrument( ObjectUtil.clone( model.instrumentRef ) )) {
                    Pubsub.publish( Messages.SHOW_FEEDBACK, Copy.get( "INSTRUMENT_SAVED", newPresetName ));
                    updatePresetList();
                }
            }
            break;
        case View.EVENTS.SET_TUNING:
            handleTuningChange( optPayload.type, optPayload.value );
            break;
        case View.EVENTS.CLOSE:
            handleClose();
            break;
    }
}

function handleClose( aEvent ) {
    Pubsub.publishSync( Messages.CLOSE_OVERLAYS );
}

function handlePresetSelect( selectedPresetName ) {
    if ( selectedPresetName !== EMPTY_PRESET_VALUE ) {
        if ( model.instrumentRef && model.instrumentRef.presetName !== selectedPresetName ) {
            let instrumentPreset = model.getInstrumentByPresetName( selectedPresetName );

            if ( instrumentPreset ) {
                const newInstrument = InstrumentFactory.loadPreset(
                    instrumentPreset,
                    model.instrumentId,
                    model.instrumentRef.name
                );
                model.instrumentRef = efflux.activeSong.instruments[ model.instrumentId ] = newInstrument;
                model.activeOscillatorIndex = 0;
                InstrumentController.update();
                cacheAllOscillators();
                Pubsub.publishSync( Messages.APPLY_INSTRUMENT_MODULES );
            }
        }
    }
}

function handleTuningChange( type, value ) {
    const oscillator = model.instrumentRef.oscillators[ model.activeOscillatorIndex ];
    switch ( type ) {
        case "detune":
            oscillator.detune = value;
            break;

        case "octave":
            oscillator.octaveShift = value;
            break;

        case "fine":
            oscillator.fineShift = value;
            break;
    }
    Pubsub.publishSync( Messages.ADJUST_OSCILLATOR_TUNING, [ model.instrumentId, model.activeOscillatorIndex, oscillator ]);
}

function cacheAllOscillators() {
    model.instrumentRef.oscillators.forEach(( oscillator ) => {
        cacheOscillatorWaveForm( oscillator );
    });
}

function cacheOscillatorWaveForm( oscillator ) {
    if ( oscillator.enabled && oscillator.waveform === "CUSTOM" )
        Pubsub.publishSync( Messages.SET_CUSTOM_WAVEFORM, [ model.instrumentId, model.activeOscillatorIndex, oscillator.table ]);
    else
        Pubsub.publishSync( Messages.ADJUST_OSCILLATOR_WAVEFORM, [ model.instrumentId, model.activeOscillatorIndex, oscillator ]);
}

function updatePresetList() {

    const activeInstrument = efflux.activeSong.instruments[ model.instrumentId ];
    const presets = model.getInstruments();
    const list    = [];

    list.push({ title: Copy.get( "INPUT_PRESET" ), value: EMPTY_PRESET_VALUE });
    presets.forEach(( preset ) => {
        list.push({ title: preset.presetName, value: preset.presetName });
    });
    presets.sort(( a, b ) => {
        if( a.presetName < b.presetName ) return -1;
        if( a.presetName > b.presetName ) return 1;
        return 0;
    });
    View.setPresets( list, activeInstrument.presetName );
}
