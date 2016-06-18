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
const WaveTableDraw     = require( "../components/WaveTableDraw" );
const Manual            = require( "../definitions/Manual" );
const Messages          = require( "../definitions/Messages" );
const InstrumentFactory = require( "../factory/InstrumentFactory" );
const Form              = require( "../utils/Form" );
const TemplateUtil      = require( "../utils/TemplateUtil" );
const zCanvas           = require( "zCanvas" ).zCanvas;
const Pubsub            = require( "pubsub-js" );

/* private properties */

let container, efflux, view, canvas, wtDraw,
    instrumentSelect, oscEnabledSelect, oscWaveformSelect, oscVolumeControl, instrumentVolumeControl,
    detuneControl, octaveShiftControl, fineShiftControl,
    attackControl, decayControl, sustainControl, releaseControl,
    filterEnabledSelect, frequencyControl, qControl, lfoSelect, filterSelect, speedControl, depthControl,
    delayEnabledSelect, delayTypeSelect, delayTimeControl, delayFeedbackControl, delayCutoffControl, delayOffsetControl;

let activeOscillatorIndex = 0, instrumentId = 0, instrumentRef;

const InstrumentController = module.exports =
{
    visible : false,

    init( containerRef, effluxRef )
    {
        container = containerRef;
        efflux    = effluxRef;

        // prepare view

        view = document.createElement( "div" );
        view.setAttribute( "id", "instrumentEditor" );
        view.innerHTML = TemplateUtil.render( "instrumentEditor" );

        instrumentSelect        = view.querySelector( "#instrumentSelect" );
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
            }
        });

        // add listeners

        view.querySelector( ".close-button" ).addEventListener( "click", handleClose );
        view.querySelector( ".help-button" ).addEventListener ( "click", handleHelp );
        view.querySelector( "#oscillatorTabs" ).addEventListener( "click", handleOscillatorTabClick );
        instrumentSelect.addEventListener ( "change", handleInstrumentSelect );
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

        [
            Messages.CLOSE_OVERLAYS,
            Messages.TOGGLE_INSTRUMENT_EDITOR,
            Messages.WINDOW_RESIZED

        ].forEach(( msg ) => Pubsub.subscribe( msg, handleBroadcast ));

        // initialize

        updateWaveformSize();
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
}

function handleFilterChange( aEvent )
{
    const filter = instrumentRef.filter;

    filter.frequency = parseFloat( frequencyControl.value );
    filter.q         = parseFloat( qControl.value );
    filter.speed     = parseFloat( speedControl.value );
    filter.depth     = depthControl.value;
    filter.lfoType   = Form.getSelectedOption( lfoSelect );
    filter.type      = Form.getSelectedOption( filterSelect );
    filter.enabled   = ( Form.getSelectedOption( filterEnabledSelect ) === "true" );

    Pubsub.publishSync( Messages.UPDATE_FILTER_SETTINGS, [ instrumentId, filter ]);
}

function handleDelayChange( aEvent )
{
    const delay = instrumentRef.delay;

    delay.enabled  = ( Form.getSelectedOption( delayEnabledSelect ) === "true" );
    delay.type     = parseFloat( Form.getSelectedOption( delayTypeSelect ));
    delay.time     = parseFloat( delayTimeControl.value );
    delay.feedback = parseFloat( delayFeedbackControl.value );
    delay.cutoff   = parseFloat( delayCutoffControl.value );
    delay.offset   = parseFloat( delayOffsetControl.value ) - .5;

    Pubsub.publishSync( Messages.UPDATE_DELAY_SETTINGS, [ instrumentId, delay ]);
}

function handleInstrumentSelect( aEvent )
{
    instrumentId = parseFloat( Form.getSelectedOption( instrumentSelect ));
    InstrumentController.update();
}

function handleOscillatorEnabledChange( aEvent )
{
    const oscillator = instrumentRef.oscillators[ activeOscillatorIndex ];
    oscillator.enabled = ( Form.getSelectedOption( oscEnabledSelect ) === "true" );
    cacheOscillatorWaveForm( oscillator );
}

function handleOscillatorWaveformChange( aEvent )
{
    const oscillator = instrumentRef.oscillators[ activeOscillatorIndex ];
    instrumentRef.oscillators[ activeOscillatorIndex ].waveform = Form.getSelectedOption( oscWaveformSelect );
    showWaveformForOscillator( oscillator );
    cacheOscillatorWaveForm( oscillator );

    if ( !oscillator.enabled ) {
        Form.setSelectedOption( oscEnabledSelect, true );
        oscillator.enabled = true;
    }
}

function handleOscillatorVolumeChange( aEvent )
{
    instrumentRef.oscillators[ activeOscillatorIndex ].volume = parseFloat( oscVolumeControl.value );
    Pubsub.publishSync(
        Messages.ADJUST_OSCILLATOR_VOLUME,
        [ instrumentId, activeOscillatorIndex, instrumentRef.oscillators[ activeOscillatorIndex ] ]
    );
}

function handleInstrumentVolumeChange( aEvent )
{
    instrumentRef.volume = parseFloat( instrumentVolumeControl.value );
    Pubsub.publishSync(
        Messages.ADJUST_INSTRUMENT_VOLUME, [ instrumentId, instrumentRef.volume ]
    );
}

function showWaveformForOscillator( oscillator )
{
    if ( oscillator.waveform !== "CUSTOM" )
        wtDraw.generateAndSetTable( oscillator.waveform );
    else
        wtDraw.setTable( InstrumentFactory.getTableForOscillator( oscillator ));

    togglePitchSliders( oscillator.waveform !== "NOISE" ); // no pitch shifting for noise buffer
}

function cacheOscillatorWaveForm( oscillator )
{
    if ( oscillator.enabled && oscillator.waveform === "CUSTOM" )
        Pubsub.publishSync( Messages.SET_CUSTOM_WAVEFORM, [ instrumentId, activeOscillatorIndex, oscillator.table ]);
    else
        Pubsub.publishSync( Messages.ADJUST_OSCILLATOR_WAVEFORM, [ instrumentId, activeOscillatorIndex, oscillator ]);
}

function updateWaveformSize()
{
    const ideal       = Config.WAVE_TABLE_SIZE; // equal to the length of the wave table
    const windowWidth = window.innerWidth;
    const width       = ( windowWidth < ideal ) ? windowWidth *  .9: ideal;

    if ( canvas.getWidth() !== width ) {
        canvas.setDimensions( width, 200 );
        wtDraw._bounds.width = width;
    }
}

function togglePitchSliders( enabled )
{
    [ octaveShiftControl, fineShiftControl ].forEach(( slider ) =>
    {
        if ( enabled )
            slider.removeAttribute( "disabled" );
        else
            slider.setAttribute( "disabled", "disabled" );
    });
}
