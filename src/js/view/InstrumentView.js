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

const Config            = require( "../config/Config" );
const Form              = require( "../utils/Form" );
const Manual            = require( "../definitions/Manual" );
const Messages          = require( "../definitions/Messages" );
const Pubsub            = require( "pubsub-js" );
const InstrumentFactory = require( "../model/factory/InstrumentFactory" );
const WaveTableDraw     = require( "../components/WaveTableDraw" );
const zCanvas           = require( "zCanvas" );

let efflux, model, listener, keyboardController;
let element, canvas, wtDraw,
    instrumentSelect, presetSelect, presetSave, presetNameInput,
    oscEnabledSelect, oscWaveformSelect, oscVolumeControl, instrumentVolumeControl,
    detuneControl, octaveShiftControl, fineShiftControl,
    amplitudeEditor, pitchEditor,
    attackControl, decayControl, sustainControl, releaseControl,
    pitchRangeControl, pitchAttackControl, pitchDecayControl, pitchSustainControl, pitchReleaseControl,
    moduleEditorPage1, moduleEditorPage2,
    filterEnabledSelect, frequencyControl, qControl, lfoSelect, filterSelect, speedControl, depthControl,
    eqEnabledSelect, eqLowControl, eqMidControl, eqHighControl,
    odEnabledSelect, odDriveControl, odColorControl, odPreBandControl, odPostCutControl,
    delayEnabledSelect, delayTypeSelect, delayTimeControl, delayFeedbackControl, delayCutoffControl, delayOffsetControl;

const self = module.exports = {

    // View-Controller communication messages (via init() listener)

    EVENTS: {
        READY     : 0,
        CLOSE     : 1,
        SET_OSC   : 2,
        CACHE_OSC : 3,
        SELECT_PRESET: 4,
        SELECT_INSTRUMENT: 5,
        SET_TUNING: 6,
        SAVE_PRESET: 7
    },

    init( effluxRef, keyboardControllerRef, listenerRef ) {

        efflux             = effluxRef;
        model              = efflux.InstrumentModel;
        keyboardController = keyboardControllerRef;
        listener           = listenerRef;

        element = document.createElement( "div" );
        element.setAttribute( "id", "instrumentEditor" );

        efflux.TemplateService.render( "instrumentEditor", element ).then(() => {

            instrumentSelect        = element.querySelector( "#instrumentSelect" );
            presetSelect            = element.querySelector( "#presetSelect" );
            presetSave              = element.querySelector( "#presetSave" );
            presetNameInput         = element.querySelector( "#presetName" );
            oscEnabledSelect        = element.querySelector( "#oscillatorEnabled" );
            oscWaveformSelect       = element.querySelector( "#oscillatorWaveformSelect" );
            oscVolumeControl        = element.querySelector( "#volume" );
            instrumentVolumeControl = element.querySelector( "#instrumentVolume" );

            // oscillator tuning
            detuneControl           = element.querySelector( "#detune" );
            octaveShiftControl      = element.querySelector( "#octaveShift" );
            fineShiftControl        = element.querySelector( "#fineShift" );

            // amplitude envelope
            attackControl           = element.querySelector( "#attack" );
            decayControl            = element.querySelector( "#decay" );
            sustainControl          = element.querySelector( "#sustain" );
            releaseControl          = element.querySelector( "#release" );

            // pitch envelope
            pitchRangeControl       = element.querySelector( "#pitchRange" );
            pitchAttackControl      = element.querySelector( "#pitchAttack" );
            pitchDecayControl       = element.querySelector( "#pitchDecay" );
            pitchSustainControl     = element.querySelector( "#pitchSustain" );
            pitchReleaseControl     = element.querySelector( "#pitchRelease" );

            amplitudeEditor = element.querySelector( "#amplitudeEditor" );
            pitchEditor     = element.querySelector( "#pitchEditor" );

            moduleEditorPage1 = element.querySelector( "#modulesPage1" );
            moduleEditorPage2 = element.querySelector( "#modulesPage2" );

            // filter
            filterEnabledSelect     = element.querySelector( "#filterEnabled" );
            frequencyControl        = element.querySelector( "#filterFrequency" );
            qControl                = element.querySelector( "#filterQ" );
            lfoSelect               = element.querySelector( "#filterLFO" );
            filterSelect            = element.querySelector( "#filterType" );
            speedControl            = element.querySelector( "#filterSpeed" );
            depthControl            = element.querySelector( "#filterDepth" );

            // delay
            delayEnabledSelect   = element.querySelector( "#delayEnabled" );
            delayTypeSelect      = element.querySelector( "#delayType" );
            delayTimeControl     = element.querySelector( "#delayTime" );
            delayFeedbackControl = element.querySelector( "#delayFeedback" );
            delayCutoffControl   = element.querySelector( "#delayCutoff" );
            delayOffsetControl   = element.querySelector( "#delayOffset" );

            // eq
            eqEnabledSelect = element.querySelector( "#eqEnabled" );
            eqLowControl    = element.querySelector( "#eqLow" );
            eqMidControl    = element.querySelector( "#eqMid" );
            eqHighControl   = element.querySelector( "#eqHigh" );

            // overdrive
            odEnabledSelect  = element.querySelector( "#odEnabled" );
            odDriveControl   = element.querySelector( "#odDrive" );
            odColorControl   = element.querySelector( "#odColor" );
            odPreBandControl = element.querySelector( "#odPreBand" );
            odPostCutControl = element.querySelector( "#odPostCut" );

            canvas = new zCanvas.canvas( 512, 200 ); // 512 equals the size of the wave table (see InstrumentFactory)
            canvas.setBackgroundColor( "#000000" );
            canvas.insertInPage( element.querySelector( "#canvasContainer" ));

            wtDraw = new WaveTableDraw( canvas.getWidth(), canvas.getHeight(), handleWaveformUpdate );

            // add listeners

            element.querySelector( ".close-button" ).addEventListener  ( "click", ( e ) => listener( self.EVENTS.CLOSE ));
            element.querySelector( ".help-button" ).addEventListener   ( "click", handleHelp );
            element.querySelector( "#oscillatorTabs" ).addEventListener( "click", handleOscillatorTabClick );
            element.querySelector( "#envelopeTabs" ).addEventListener  ( "click", handleEnvelopeTabClick );
            element.querySelector( "#modulesTabs" ).addEventListener   ( "click", handleModulesTabClick );
            instrumentSelect.addEventListener ( "change", handleInstrumentSelect );
            presetSelect.addEventListener     ( "change", handlePresetSelect );
            presetSave.addEventListener       ( "click",  handlePresetSave );
            presetNameInput.addEventListener  ( "focus",  handlePresetFocus );
            presetNameInput.addEventListener  ( "blur",   handlePresetBlur );
            oscEnabledSelect.addEventListener ( "change", handleOscillatorEnabledChange );
            oscWaveformSelect.addEventListener( "change", handleOscillatorWaveformChange );
            oscVolumeControl.addEventListener ( "input",  handleOscillatorVolumeChange );

            [ detuneControl, octaveShiftControl, fineShiftControl ].forEach(( control ) => {
                control.addEventListener( "input", handleTuningChange );
            });

            [ attackControl, decayControl, sustainControl, releaseControl ].forEach(( control ) => {
                control.addEventListener( "input", handleAmplitudeEnvelopeChange );
            });

            [
                pitchRangeControl, pitchAttackControl, pitchDecayControl,
                pitchSustainControl, pitchReleaseControl
            ].forEach(( control ) => {
                control.addEventListener( "input", handlePitchEnvelopeChange );
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
            [ delayTimeControl, delayFeedbackControl, delayCutoffControl, delayOffsetControl ].forEach(( control ) => {
                control.addEventListener( "input", handleDelayChange );
            });

            eqEnabledSelect.addEventListener( "change", handleEqChange );
            [ eqLowControl, eqMidControl, eqHighControl ].forEach(( control => {
                control.addEventListener( "input", handleEqChange );
            }));

            odEnabledSelect.addEventListener( "change", handleOverdriveChange );
            [ odDriveControl, odColorControl, odPreBandControl, odPostCutControl ].forEach(( control => {
                control.addEventListener( "input", handleOverdriveChange );
            }));

            self.updateWaveformSize();
            listener( self.EVENTS.READY );
        });
    },

    update( instrumentRef, activeOscillatorIndex ) {

        setActiveTab( activeOscillatorIndex );

        const oscillator = getActiveOscillator();
        element.querySelector( "h2" ).innerHTML = "Editing " + instrumentRef.name;

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

        pitchRangeControl.value   = oscillator.pitch.range;
        pitchAttackControl.value  = oscillator.pitch.attack;
        pitchDecayControl.value   = oscillator.pitch.decay;
        pitchSustainControl.value = oscillator.pitch.sustain;
        pitchReleaseControl.value = oscillator.pitch.release;

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

        Form.setSelectedOption( eqEnabledSelect, instrumentRef.eq.enabled );
        eqLowControl.value  = instrumentRef.eq.lowGain;
        eqMidControl.value  = instrumentRef.eq.midGain;
        eqHighControl.value = instrumentRef.eq.highGain;

        Form.setSelectedOption( odEnabledSelect, instrumentRef.overdrive.enabled );
        odDriveControl.value   = instrumentRef.overdrive.drive;
        odColorControl.value   = instrumentRef.overdrive.color;
        odPreBandControl.value = instrumentRef.overdrive.preBand;
        odPostCutControl.value = instrumentRef.overdrive.postCut;
    },

    updateWaveformSize() {
        const ideal       = Config.WAVE_TABLE_SIZE; // equal to the length of the wave table
        const windowWidth = window.innerWidth;
        const width       = ( windowWidth < ideal ) ? windowWidth *  .9: ideal;

        if ( canvas.getWidth() !== width ) {
            canvas.setDimensions( width, 200 );
            wtDraw._bounds.width = width;
        }
    },

    inject( container ) {
        container.appendChild( element );
        canvas.addChild( wtDraw );
    },

    remove() {
        if ( element.parentNode ) {
            element.parentNode.removeChild( element );
            canvas.removeChild( wtDraw );
        }
    },

    /* public methods */

    setPresets( list, presetName ) {
        Form.setOptions( presetSelect, list );
        Form.setSelectedOption( presetSelect, presetName );

        presetNameInput.value = ( typeof presetName === "string" ) ? presetName : "";
    }
};

/* event handlers */

function handleWaveformUpdate( table ) {
    let oscillator;
    if ( model.instrumentRef ) {
        oscillator       = getActiveOscillator();
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
            listener( self.EVENTS.CACHE_OSC );

        invalidatePresetName();
    }
}

function handleHelp( aEvent ) {
    window.open( Manual.INSTRUMENT_EDITOR_HELP, "_blank" );
}

function handleOscillatorTabClick( aEvent ) {
    const element = aEvent.target;
    if ( element.nodeName === "LI" ) {

        const value = parseFloat( element.getAttribute( "data-oscillator" ));
        if ( !isNaN( value ))
            listener( self.EVENTS.SET_OSC, value - 1 );
    }
}

function handleEnvelopeTabClick( aEvent ) {
    const element = aEvent.target, activeClass = "active";
    if ( element.nodeName === "LI" ) {
        switch( element.getAttribute( "data-type" )) {
            default:
            case "amplitude":
                amplitudeEditor.classList.add( activeClass );
                pitchEditor.classList.remove( activeClass );
                break;
            case "pitch":
                amplitudeEditor.classList.remove( activeClass );
                pitchEditor.classList.add( activeClass );
                break;
        }
        const tabs = element.querySelectorAll( "#envelopeTabs li" );
        let i = tabs.length;
        while ( i-- ) {
            const tab = tabs[ i ];
            if ( tab === element )
                tab.classList.add( "active" );
            else
                tab.classList.remove( "active" );
        }
    }
}

function handleModulesTabClick( aEvent ) {
    const element = aEvent.target, activeClass = "active";
    if ( element.nodeName === "LI" ) {
        switch( element.getAttribute( "data-type" )) {
            default:
            case "page1":
                moduleEditorPage1.classList.add( activeClass );
                moduleEditorPage2.classList.remove( activeClass );
                break;
            case "page2":
                moduleEditorPage1.classList.remove( activeClass );
                moduleEditorPage2.classList.add( activeClass );
                break;
        }
        const tabs = element.querySelectorAll( "#modulesTabs li" );
        let i = tabs.length;
        while ( i-- ) {
            const tab = tabs[ i ];
            if ( tab === element )
                tab.classList.add( "active" );
            else
                tab.classList.remove( "active" );
        }
    }
}

function handleTuningChange( aEvent ) {
    const target = aEvent.target,
          value  = parseFloat( target.value );

    let type;
    switch ( target ) {
        default:
        case detuneControl:
            type = "detune";
            break;

        case octaveShiftControl:
            type = "octave";
            break;

        case fineShiftControl:
            type = "fine";
            break;
    }
    listener( self.EVENTS.SET_TUNING, { type: type, value: value });
    invalidatePresetName();
}

function handleAmplitudeEnvelopeChange( aEvent ) {
    const oscillator = getActiveOscillator(),
          target     = aEvent.target,
          value      = parseFloat( target.value );

    switch ( target ) {
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
    invalidatePresetName();
}

function handlePitchEnvelopeChange( aEvent ) {
    const oscillator = getActiveOscillator(),
          target     = aEvent.target,
          value      = parseFloat( target.value );

    switch ( target ) {
        case pitchRangeControl:
            oscillator.pitch.range = value;
            break;

        case pitchAttackControl:
            oscillator.pitch.attack = value;
            break;

        case pitchDecayControl:
            oscillator.pitch.decay = value;
            break;

        case pitchSustainControl:
            oscillator.pitch.sustain = value;
            break;

        case pitchReleaseControl:
            oscillator.pitch.release = value;
            break;
    }
    invalidatePresetName();
}

function handleFilterChange( aEvent ) {
    const filter = model.instrumentRef.filter;

    filter.frequency = parseFloat( frequencyControl.value );
    filter.q         = parseFloat( qControl.value );
    filter.speed     = parseFloat( speedControl.value );
    filter.depth     = parseFloat( depthControl.value );
    filter.lfoType   = Form.getSelectedOption( lfoSelect );
    filter.type      = Form.getSelectedOption( filterSelect );
    filter.enabled   = ( Form.getSelectedOption( filterEnabledSelect ) === "true" );

    Pubsub.publishSync( Messages.UPDATE_FILTER_SETTINGS, [ model.instrumentId, filter ]);
    invalidatePresetName();
}

function handleDelayChange( aEvent ) {

    const delay = model.instrumentRef.delay;

    delay.enabled  = ( Form.getSelectedOption( delayEnabledSelect ) === "true" );
    delay.type     = parseFloat( Form.getSelectedOption( delayTypeSelect ));
    delay.time     = parseFloat( delayTimeControl.value );
    delay.feedback = parseFloat( delayFeedbackControl.value );
    delay.cutoff   = parseFloat( delayCutoffControl.value );
    delay.offset   = parseFloat( delayOffsetControl.value ) - .5;

    Pubsub.publishSync( Messages.UPDATE_DELAY_SETTINGS, [ model.instrumentId, delay ]);
    invalidatePresetName();
}

function handleEqChange( aEvent ) {

    const eq = model.instrumentRef.eq;

    eq.enabled  = ( Form.getSelectedOption( eqEnabledSelect ) === "true" );
    eq.lowGain  = parseFloat( eqLowControl.value );
    eq.midGain  = parseFloat( eqMidControl.value );
    eq.highGain = parseFloat( eqHighControl.value );

    Pubsub.publishSync( Messages.UPDATE_EQ_SETTINGS, [ model.instrumentId, eq ]);
    invalidatePresetName();
}

function handleOverdriveChange( aEvent ) {

    const overdrive = model.instrumentRef.overdrive;

    overdrive.enabled  = ( Form.getSelectedOption( odEnabledSelect ) === "true" );
    overdrive.drive    = parseFloat( odDriveControl.value );
    overdrive.color    = parseFloat( odColorControl.value );
    overdrive.preBand  = parseFloat( odPreBandControl.value );
    overdrive.postCut  = parseFloat( odPostCutControl.value );

    Pubsub.publishSync( Messages.UPDATE_OVERDRIVE_SETTINGS, [ model.instrumentId, overdrive ]);
    invalidatePresetName();
}

function handleInstrumentSelect( aEvent ) {
    const instrumentId = parseFloat( Form.getSelectedOption( instrumentSelect ));
    listener( self.EVENTS.SELECT_INSTRUMENT, instrumentId );
}

function handlePresetSelect( aEvent ) {
    const selectedPresetName = Form.getSelectedOption( presetSelect );
    listener( self.EVENTS.SELECT_PRESET, selectedPresetName );
}

function handlePresetSave( aEvent ) {
    const newPresetName = presetNameInput.value.replace( "*", "" );
    listener( self.EVENTS.SAVE_PRESET, newPresetName );
}

function handlePresetFocus( aEvent ) {
    keyboardController.setSuspended( true );
}

function handlePresetBlur( aEvent ) {
    keyboardController.setSuspended( false );
}

function handleOscillatorEnabledChange( aEvent ) {
    const oscillator = getActiveOscillator();
    oscillator.enabled = ( Form.getSelectedOption( oscEnabledSelect ) === "true" );
    listener( self.EVENTS.CACHE_OSC );
    invalidatePresetName();
}

function handleOscillatorWaveformChange( aEvent ) {
    const oscillator = getActiveOscillator();
    getActiveOscillator().waveform = Form.getSelectedOption( oscWaveformSelect );
    showWaveformForOscillator( oscillator );
    listener( self.EVENTS.CACHE_OSC );

    if ( !oscillator.enabled ) {
        Form.setSelectedOption( oscEnabledSelect, true );
        oscillator.enabled = true;
    }
    invalidatePresetName();
}

function handleOscillatorVolumeChange( aEvent ) {
    getActiveOscillator().volume = parseFloat( oscVolumeControl.value );
    Pubsub.publishSync(
        Messages.ADJUST_OSCILLATOR_VOLUME,
        [ model.instrumentId, model.activeOscillatorIndex, getActiveOscillator() ]
    );
    invalidatePresetName();
}

function handleInstrumentVolumeChange( aEvent ) {
    model.instrumentRef.volume = parseFloat( instrumentVolumeControl.value );
    Pubsub.publishSync(
        Messages.ADJUST_INSTRUMENT_VOLUME, [ model.instrumentId, model.instrumentRef.volume ]
    );
    invalidatePresetName();
}

/* private methods */

function showWaveformForOscillator( oscillator ) {
    if ( oscillator.waveform !== "CUSTOM" )
        wtDraw.generateAndSetTable( oscillator.waveform );
    else
        wtDraw.setTable( InstrumentFactory.getTableForOscillator( oscillator ));

    togglePitchSliders( oscillator.waveform !== "NOISE" ); // no pitch shifting for noise buffer
}

function invalidatePresetName() {
    if ( model.instrumentRef.presetName !== null && presetNameInput.value.indexOf( "*" ) === -1 )
        presetNameInput.value += "*";
}

function setActiveTab( activeOscillatorIndex ) {
    const tabs = element.querySelectorAll( "#oscillatorTabs li" );
    let tab;

    let i = tabs.length;
    while ( i-- ) {
        tab = tabs[ i ].classList;
        if ( i === activeOscillatorIndex )
            tab.add( "active" );
        else
        tab.remove( "active" );
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

function getActiveOscillator() {
    return model.instrumentRef.oscillators[ model.activeOscillatorIndex ];
}
