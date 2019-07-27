
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

    /**
     * @public
     * @param {Object} effluxRef reference to Efflux namespace (see main.js)
     * @param {Object} keyboardControllerRef reference to keyboard controller)
     * @param {!Function} listenerRef handler for this Views state change events
     * @return {Promise}
     */
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
            instrumentVolumeControl = element.querySelector( "#instrumentVolume" );


            // pitch envelope

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

            // add listeners

            element.querySelector( ".close-button" ).addEventListener  ( "click", ( e ) => listener( self.EVENTS.CLOSE ));
            element.querySelector( ".help-button" ).addEventListener   ( "click", handleHelp );
            element.querySelector( "#oscillatorTabs" ).addEventListener( "click", handleOscillatorTabClick );
            element.querySelector( "#modulesTabs" ).addEventListener   ( "click", handleModulesTabClick );
            instrumentSelect.addEventListener ( "change", handleInstrumentSelect );
            presetSelect.addEventListener     ( "change", handlePresetSelect );
            presetSave.addEventListener       ( "click",  handlePresetSave );
            presetNameInput.addEventListener  ( "focus",  handlePresetFocus );
            presetNameInput.addEventListener  ( "blur",   handlePresetBlur );

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

            listener( self.EVENTS.READY );
        });
    },

    update( instrumentRef, activeOscillatorIndex ) {

        element.querySelector( "h2" ).innerHTML = "Editing " + instrumentRef.name;
    }

    /* public methods */

    setPresets( list, presetName ) {
        Form.setOptions( presetSelect, list );
        Form.setSelectedOption( presetSelect, presetName );

        presetNameInput.value = ( typeof presetName === "string" ) ? presetName : "";
    }
};

/* event handlers */


function handleOscillatorTabClick( aEvent ) {
    const element = aEvent.target;
    if ( element.nodeName === "LI" ) {

        const value = parseFloat( element.getAttribute( "data-oscillator" ));
        if ( !isNaN( value ))
            listener( self.EVENTS.SET_OSC, value - 1 );
    }
}

function handleModulesTabClick( aEvent ) {
    const element = aEvent.target, activeClass = "active";
    let tabIndex = 0;
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
                tabIndex = 1;
                break;
        }
        setActiveTab( document.querySelectorAll( "#modulesTabs li" ), tabIndex );
    }
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
    delay.offset   = parseFloat( delayOffsetControl.value ) - 0.5;

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

function handleInstrumentVolumeChange( aEvent ) {
    model.instrumentRef.volume = parseFloat( instrumentVolumeControl.value );
    Pubsub.publishSync(
        Messages.ADJUST_INSTRUMENT_VOLUME, [ model.instrumentId, model.instrumentRef.volume ]
    );
    invalidatePresetName();
}
