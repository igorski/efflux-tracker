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

const Config            = require( "../config/Config" );
const Copy              = require( "../i18n/Copy" );
const WaveTableDraw     = require( "../components/WaveTableDraw" );
const Manual            = require( "../definitions/Manual" );
const Messages          = require( "../definitions/Messages" );
const InstrumentFactory = require( "../model/factory/InstrumentFactory" );
const Form              = require( "../utils/Form" );
const ObjectUtil        = require( "../utils/ObjectUtil" );
const zCanvas           = require( "zCanvas" ).zCanvas;
const Pubsub            = require( "pubsub-js" );

/* private properties */

let container, efflux, keyboardController, view, canvas, wtDraw,
    instrumentSelect, presetSelect, presetSave, presetName,
    oscEnabledSelect, oscWaveformSelect, oscVolumeControl, instrumentVolumeControl,
    detuneControl, octaveShiftControl, fineShiftControl,
    attackControl, decayControl, sustainControl, releaseControl,
    filterEnabledSelect, frequencyControl, qControl, lfoSelect, filterSelect, speedControl, depthControl,
    delayEnabledSelect, delayTypeSelect, delayTimeControl, delayFeedbackControl, delayCutoffControl, delayOffsetControl;

let activeOscillatorIndex = 0, instrumentId = 0, instrumentRef;

const EMPTY_PRESET_VALUE = "null";

const InstrumentController = module.exports =
{
    visible : false,

    init( containerRef, effluxRef, keyboardControllerRef )
    {
        container          = containerRef;
        efflux             = effluxRef;
        keyboardController = keyboardControllerRef;

        // prepare view

        view = document.createElement( "div" );
        view.setAttribute( "id", "instrumentEditor" );

        efflux.TemplateService.render( "instrumentEditor", view ).then(() => {

            instrumentSelect        = view.querySelector( "#instrumentSelect" );
            presetSelect            = view.querySelector( "#presetSelect" );
            presetSave              = view.querySelector( "#presetSave" );
            presetName              = view.querySelector( "#presetName" );
            oscEnabledSelect        = view.querySelector( "#oscillatorEnabled" );
            oscWaveformSelect       = view.querySelector( "#oscillatorWaveformSelect" );
            oscVolumeControl        = view.querySelector( "#volume" );
            instrumentVolumeControl = view.querySelector( "#instrumentVolume" );

            // oscillator tuning
            detuneControl           = view.querySelector( "#detune" );
            octaveShiftControl      = view.querySelector( "#octaveShift" );
            fineShiftControl        = view.querySelector( "#fineShift" );
            attackControl           = view.querySelector( "#attack" );
            decayControl            = view.querySelector( "#decay" );
            sustainControl          = view.querySelector( "#sustain" );
            releaseControl          = view.querySelector( "#release" );

            // filter
            filterEnabledSelect     = view.querySelector( "#filterEnabled" );
            frequencyControl        = view.querySelector( "#filterFrequency" );
            qControl                = view.querySelector( "#filterQ" );
            lfoSelect               = view.querySelector( "#filterLFO" );
            filterSelect            = view.querySelector( "#filterType" );
            speedControl            = view.querySelector( "#filterSpeed" );
            depthControl            = view.querySelector( "#filterDepth" );

            // delay
            delayEnabledSelect   = view.querySelector( "#delayEnabled" );
            delayTypeSelect      = view.querySelector( "#delayType" );
            delayTimeControl     = view.querySelector( "#delayTime" );
            delayFeedbackControl = view.querySelector( "#delayFeedback" );
            delayCutoffControl   = view.querySelector( "#delayCutoff" );
            delayOffsetControl   = view.querySelector( "#delayOffset" );

            canvas = new zCanvas( 512, 200 ); // 512 equals the size of the wave table (see InstrumentFactory)
            canvas.setBackgroundColor( "#000000" );
            canvas.insertInPage( view.querySelector( "#canvasContainer" ));

            wtDraw = new WaveTableDraw( canvas.getWidth(), canvas.getHeight(), ( table ) =>
            {
                let oscillator;
                if ( instrumentRef ) {

                    oscillator       = instrumentRef.oscillators[ activeOscillatorIndex ];
                    oscillator.table = table;

                    // when drawing, force the oscillator type to transition to custom
                    // and activate the oscillator (to make changes instantly audible)
                    if ( oscillator.waveform !== "CUSTOM" ) {
                        Form.setSelectedOption( oscWaveformSelect, "CUSTOM" );
                        if ( !oscillator.enabled ) {
                            oscillator.enabled = true;
                            Form.setSelectedOption( oscEnabledSelect, true );
                        }
                        handleOscillatorWaveformChange( null );
                    }
                    else
                        cacheOscillatorWaveForm( instrumentRef.oscillators[ activeOscillatorIndex ] );

                    invalidatePreset();
                }
            });

            // add listeners

            view.querySelector( ".close-button" ).addEventListener( "click", handleClose );
            view.querySelector( ".help-button" ).addEventListener ( "click", handleHelp );
            view.querySelector( "#oscillatorTabs" ).addEventListener( "click", handleOscillatorTabClick );
            instrumentSelect.addEventListener ( "change", handleInstrumentSelect );
            presetSelect.addEventListener     ( "change", handlePresetSelect );
            presetSave.addEventListener       ( "click",  handlePresetSave );
            presetName.addEventListener       ( "focus",  handlePresetFocus );
            presetName.addEventListener       ( "blur",   handlePresetBlur );
            oscEnabledSelect.addEventListener ( "change", handleOscillatorEnabledChange );
            oscWaveformSelect.addEventListener( "change", handleOscillatorWaveformChange );
            oscVolumeControl.addEventListener ( "input",  handleOscillatorVolumeChange );

            [ detuneControl, octaveShiftControl, fineShiftControl ].forEach(( control ) => {
                control.addEventListener( "input", handleTuningChange );
            });

            [ attackControl, decayControl, sustainControl, releaseControl ].forEach(( control ) => {
                control.addEventListener( "input", handleEnvelopeChange );
            });

            instrumentVolumeControl.addEventListener( "input", handleInstrumentVolumeChange );

            filterEnabledSelect.addEventListener( "change", handleFilterChange );
            lfoSelect.addEventListener          ( "change", handleFilterChange );
            filterSelect.addEventListener       ( "change", handleFilterChange );
            [ frequencyControl, qControl, speedControl, depthControl ].forEach(( control ) => {
                control.addEventListener( "input", handleFilterChange );
            });

            delayEnabledSelect.addEventListener( "change", handleDelayChange );
            delayTypeSelect.addEventListener   ( "change", handleDelayChange );
            [ delayTimeControl, delayFeedbackControl, delayCutoffControl, delayOffsetControl ].forEach( ( control ) => {
                control.addEventListener( "input", handleDelayChange );
            });

            updateWaveformSize();
            updatePresetList();
        });

        // subscribe to Pubsub system

        [
            Messages.CLOSE_OVERLAYS,
            Messages.TOGGLE_INSTRUMENT_EDITOR,
            Messages.SONG_LOADED,
            Messages.WINDOW_RESIZED

        ].forEach(( msg ) => Pubsub.subscribe( msg, handleBroadcast ));
    },

    update()
    {
        const instruments = efflux.activeSong.instruments;
        let i = instruments.length;
        instrumentRef = null;

        while ( i-- ) {
            if ( instruments[ i ].id == instrumentId ) {
                instrumentRef = instruments[ i ];
                break;
            }
        }

        if ( !instrumentRef )
            return;

        const tabs = view.querySelectorAll( "#oscillatorTabs li" );
        let tab;

        i = tabs.length;
        while ( i-- ) {
            tab = tabs[ i ].classList;
            if ( i === activeOscillatorIndex )
                tab.add( "active" );
            else
            tab.remove( "active" );
        }

        const oscillator = instrumentRef.oscillators[ activeOscillatorIndex ];
        view.querySelector( "h2" ).innerHTML = "Editing " + instrumentRef.name;
        showWaveformForOscillator( oscillator );
        Form.setSelectedOption( oscEnabledSelect,  oscillator.enabled );
        Form.setSelectedOption( oscWaveformSelect, oscillator.waveform );
        Form.setSelectedOption( instrumentSelect,  instrumentRef.id );

        detuneControl.value      = oscillator.detune;
        octaveShiftControl.value = oscillator.octaveShift;
        fineShiftControl.value   = oscillator.fineShift;
        oscVolumeControl.value   = oscillator.volume;

        attackControl.value  = oscillator.adsr.attack;
        decayControl.value   = oscillator.adsr.decay;
        sustainControl.value = oscillator.adsr.sustain;
        releaseControl.value = oscillator.adsr.release;

        instrumentVolumeControl.value = instrumentRef.volume;

        Form.setSelectedOption( filterEnabledSelect, instrumentRef.filter.enabled );
        Form.setSelectedOption( lfoSelect,           instrumentRef.filter.lfoType );
        Form.setSelectedOption( filterSelect,        instrumentRef.filter.type );
        frequencyControl.value = instrumentRef.filter.frequency;
        qControl.value         = instrumentRef.filter.q;
        speedControl.value     = instrumentRef.filter.speed;
        depthControl.value     = instrumentRef.filter.depth;

        Form.setSelectedOption( delayEnabledSelect, instrumentRef.delay.enabled );
        Form.setSelectedOption( delayTypeSelect,    instrumentRef.delay.type );
        delayTimeControl.value     = instrumentRef.delay.time;
        delayFeedbackControl.value = instrumentRef.delay.feedback;
        delayCutoffControl.value   = instrumentRef.delay.cutoff;
        delayOffsetControl.value   = instrumentRef.delay.offset + .5;

        updatePresetList();
    }
};

/* private methods */

function handleBroadcast( type, payload )
{
    switch ( type )
    {
        case Messages.TOGGLE_INSTRUMENT_EDITOR:

            Pubsub.publishSync( Messages.CLOSE_OVERLAYS, InstrumentController );
            Pubsub.publishSync( Messages.SHOW_BLIND );

            container.appendChild( view );
            canvas.addChild( wtDraw );

            instrumentId = payload;
            InstrumentController.update(); // sync with model
            break;

        case Messages.CLOSE_OVERLAYS:

            if ( payload !== InstrumentController && view.parentNode ) {
                container.removeChild( view );
                canvas.removeChild( wtDraw );
            }
            break;

        case Messages.WINDOW_RESIZED:
            updateWaveformSize();
            break;

        case Messages.SONG_LOADED:
            updatePresetList();
            break;
    }
}

function handleClose( aEvent )
{
    Pubsub.publishSync( Messages.CLOSE_OVERLAYS );
}

function handleHelp( aEvent )
{
    window.open( Manual.INSTRUMENT_EDITOR_HELP, "_blank" );
}

function handleOscillatorTabClick( aEvent )
{
    const element = aEvent.target;
    if ( element.nodeName === "LI" ) {

        const value = parseFloat( element.getAttribute( "data-oscillator" ));
        if ( !isNaN( value )) {
            activeOscillatorIndex = value - 1;
            InstrumentController.update();
        }
    }
}

function handleTuningChange( aEvent )
{
    const oscillator = instrumentRef.oscillators[ activeOscillatorIndex ],
          target     = aEvent.target,
          value      = parseFloat( target.value );

    switch ( target )
    {
        case detuneControl:
            oscillator.detune = value;
            break;

        case octaveShiftControl:
            oscillator.octaveShift = value;
            break;

        case fineShiftControl:
            oscillator.fineShift = value;
            break;
    }
    Pubsub.publishSync( Messages.ADJUST_OSCILLATOR_TUNING, [ instrumentId, activeOscillatorIndex, oscillator ]);
    invalidatePreset();
}

function handleEnvelopeChange( aEvent )
{
    const oscillator = instrumentRef.oscillators[ activeOscillatorIndex ],
          target     = aEvent.target,
          value      = parseFloat( target.value );

    switch ( target )
    {
        case attackControl:
            oscillator.adsr.attack = value;
            break;

        case decayControl:
            oscillator.adsr.decay = value;
            break;

        case sustainControl:
            oscillator.adsr.sustain = value;
            break;

        case releaseControl:
            oscillator.adsr.release = value;
            break;
    }
    invalidatePreset();
}

function handleFilterChange( aEvent )
{
    const filter = instrumentRef.filter;

    filter.frequency = parseFloat( frequencyControl.value );
    filter.q         = parseFloat( qControl.value );
    filter.speed     = parseFloat( speedControl.value );
    filter.depth     = parseFloat( depthControl.value );
    filter.lfoType   = Form.getSelectedOption( lfoSelect );
    filter.type      = Form.getSelectedOption( filterSelect );
    filter.enabled   = ( Form.getSelectedOption( filterEnabledSelect ) === "true" );

    Pubsub.publishSync( Messages.UPDATE_FILTER_SETTINGS, [ instrumentId, filter ]);
    invalidatePreset();
}

function handleDelayChange( aEvent ) {

    const delay = instrumentRef.delay;

    delay.enabled  = ( Form.getSelectedOption( delayEnabledSelect ) === "true" );
    delay.type     = parseFloat( Form.getSelectedOption( delayTypeSelect ));
    delay.time     = parseFloat( delayTimeControl.value );
    delay.feedback = parseFloat( delayFeedbackControl.value );
    delay.cutoff   = parseFloat( delayCutoffControl.value );
    delay.offset   = parseFloat( delayOffsetControl.value ) - .5;

    Pubsub.publishSync( Messages.UPDATE_DELAY_SETTINGS, [ instrumentId, delay ]);
    invalidatePreset();
}

function handleInstrumentSelect( aEvent ) {
    instrumentId = parseFloat( Form.getSelectedOption( instrumentSelect ));
    InstrumentController.update();
}

function handlePresetSelect( aEvent ) {

    const selectedPresetName = Form.getSelectedOption( presetSelect );
    if ( selectedPresetName !== EMPTY_PRESET_VALUE ) {

        if ( instrumentRef && instrumentRef.presetName !== selectedPresetName ) {
            let instrumentPreset = efflux.InstrumentModel.getInstrumentByPresetName( selectedPresetName );

            if ( instrumentPreset ) {
                const newInstrument = ObjectUtil.clone( instrumentPreset );
                newInstrument.id = instrumentId;
                newInstrument.name = instrumentRef.name;
                instrumentRef = efflux.activeSong.instruments[ instrumentId ] = newInstrument;

                InstrumentController.update();
                cacheAllOscillators();
            }
        }
    }
}

function handlePresetSave( aEvent ) {

    const newPresetName = presetName.value.replace( "*", "" );
    if ( newPresetName.trim().length === 0 ) {
        Pubsub.publish( Messages.SHOW_ERROR, Copy.get( "ERROR_NO_INS_NAME" ));
    }
    else {
        instrumentRef.presetName = newPresetName;
        if ( efflux.InstrumentModel.saveInstrument( ObjectUtil.clone( instrumentRef ) )) {
            Pubsub.publish( Messages.SHOW_FEEDBACK, Copy.get( "INSTRUMENT_SAVED", newPresetName ));
            updatePresetList();
        }
    }
}

function handlePresetFocus( aEvent ) {
    keyboardController.setSuspended( true );
}

function handlePresetBlur( aEvent ) {
    keyboardController.setSuspended( false );
}

function handleOscillatorEnabledChange( aEvent ) {
    const oscillator = instrumentRef.oscillators[ activeOscillatorIndex ];
    oscillator.enabled = ( Form.getSelectedOption( oscEnabledSelect ) === "true" );
    cacheOscillatorWaveForm( oscillator );
    invalidatePreset();
}

function handleOscillatorWaveformChange( aEvent ) {
    const oscillator = instrumentRef.oscillators[ activeOscillatorIndex ];
    instrumentRef.oscillators[ activeOscillatorIndex ].waveform = Form.getSelectedOption( oscWaveformSelect );
    showWaveformForOscillator( oscillator );
    cacheOscillatorWaveForm( oscillator );

    if ( !oscillator.enabled ) {
        Form.setSelectedOption( oscEnabledSelect, true );
        oscillator.enabled = true;
    }
    invalidatePreset();
}

function handleOscillatorVolumeChange( aEvent ) {
    instrumentRef.oscillators[ activeOscillatorIndex ].volume = parseFloat( oscVolumeControl.value );
    Pubsub.publishSync(
        Messages.ADJUST_OSCILLATOR_VOLUME,
        [ instrumentId, activeOscillatorIndex, instrumentRef.oscillators[ activeOscillatorIndex ] ]
    );
    invalidatePreset();
}

function handleInstrumentVolumeChange( aEvent ) {
    instrumentRef.volume = parseFloat( instrumentVolumeControl.value );
    Pubsub.publishSync(
        Messages.ADJUST_INSTRUMENT_VOLUME, [ instrumentId, instrumentRef.volume ]
    );
    invalidatePreset();
}

function showWaveformForOscillator( oscillator ) {
    if ( oscillator.waveform !== "CUSTOM" )
        wtDraw.generateAndSetTable( oscillator.waveform );
    else
        wtDraw.setTable( InstrumentFactory.getTableForOscillator( oscillator ));

    togglePitchSliders( oscillator.waveform !== "NOISE" ); // no pitch shifting for noise buffer
}

function cacheAllOscillators() {
    instrumentRef.oscillators.forEach(( oscillator ) => {
        cacheOscillatorWaveForm( oscillator );
    });
}

function cacheOscillatorWaveForm( oscillator ) {
    if ( oscillator.enabled && oscillator.waveform === "CUSTOM" )
        Pubsub.publishSync( Messages.SET_CUSTOM_WAVEFORM, [ instrumentId, activeOscillatorIndex, oscillator.table ]);
    else
        Pubsub.publishSync( Messages.ADJUST_OSCILLATOR_WAVEFORM, [ instrumentId, activeOscillatorIndex, oscillator ]);
}

function updateWaveformSize() {
    const ideal       = Config.WAVE_TABLE_SIZE; // equal to the length of the wave table
    const windowWidth = window.innerWidth;
    const width       = ( windowWidth < ideal ) ? windowWidth *  .9: ideal;

    if ( canvas.getWidth() !== width ) {
        canvas.setDimensions( width, 200 );
        wtDraw._bounds.width = width;
    }
}

function togglePitchSliders( enabled ) {
    [ octaveShiftControl, fineShiftControl ].forEach(( slider ) =>
    {
        if ( enabled )
            slider.removeAttribute( "disabled" );
        else
            slider.setAttribute( "disabled", "disabled" );
    });
}

function updatePresetList() {

    const activeInstrument = efflux.activeSong.instruments[ instrumentId ];
    const presets = efflux.InstrumentModel.getInstruments();
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
    Form.setOptions( presetSelect, list );
    Form.setSelectedOption( presetSelect, activeInstrument.presetName );

    presetName.value = ( typeof activeInstrument.presetName === "string" ) ? activeInstrument.presetName : "";
}

function invalidatePreset() {

    if ( instrumentRef.presetName !== null && presetName.value.indexOf("*") === -1 )
        presetName.value += "*";
}