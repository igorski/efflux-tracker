"use strict";

const chai  = require( "chai" );
const sinon = require( "sinon" );
const ADSR  = require( "../../src/js/modules/ADSR" );

describe( "ADSR", () =>
{
    /* setup */

    // use Chai assertion library
    const assert = chai.assert,
          expect = chai.expect;

    // mock AudioGainNode

    const output = {
        gain: {
            cancelScheduledValues: () => true,
            linearRampToValueAtTime: () => true,
            setValueAtTime: () => true
        }
    };

    // attack envelopes

    it( "should allow notes to playback at full volume instantly for most waveforms at 0 attack", () => {
        const oscillator = {
            adsr: {
                attack: 0,
                decay: 0,
                sustain: .75,
                release: 0
            }
        };
        const WAVEFORMS  = [ "SAW", "SQUARE", "NOISE", "CUSTOM" ];

        WAVEFORMS.forEach(( waveform ) => {

            oscillator.waveform = waveform;

            const startTime    = 2;
            const expectedTime = startTime; // 0 attack value implies instant-max volume

            const sandbox = sinon.sandbox.create();
            sandbox.stub( output.gain, "linearRampToValueAtTime" ).callsFake(( value, time ) => {
                assert.strictEqual( time, expectedTime );
                sandbox.restore();
            });
            ADSR.applyAmpEnvelope( oscillator, output, startTime );
        });
    });

    it( "should have a short fade-in for certain waveforms with 0 attack to prevent popping", () => {
        const oscillator = {
            adsr: {
                attack: 0,
                decay: 0,
                sustain: .75,
                release: 0
            }
        };
        const WAVEFORMS  = [ "SINE", "TRIANGLE" ];

        WAVEFORMS.forEach(( waveform ) => {

            oscillator.waveform = waveform;

            const startTime    = 2;
            const expectedTime = startTime + 0.002; // these waveforms have a slight fade in to prevent popping

            const sandbox = sinon.sandbox.create();
            sandbox.stub( output.gain, "linearRampToValueAtTime" ).callsFake(( value, time ) => {
                assert.strictEqual( time, expectedTime );
                sandbox.restore();
            });
            ADSR.applyAmpEnvelope( oscillator, output, startTime );
        });
    });

    it( "should delay full volume for a positive attack range", () => {
        const oscillator = {
            adsr: {
                attack: .89,
                decay: 0,
                sustain: .75,
                release: 0
            }
        };
        // all waveforms are now treated equally
        const WAVEFORMS  = [ "SAW", "SQUARE", "NOISE", "CUSTOM", "SINE", "TRIANGLE" ];

        WAVEFORMS.forEach(( waveform ) => {

            oscillator.waveform = waveform;

            const startTime    = 2;
            const expectedTime = startTime + oscillator.adsr.attack;
            const sandbox = sinon.sandbox.create();
            sandbox.stub( output.gain, "linearRampToValueAtTime" ).callsFake(( value, time ) => {
                assert.strictEqual( time, expectedTime );
                sandbox.restore();
            });
            ADSR.applyAmpEnvelope( oscillator, output, startTime );
        });
    });

    // release envelopes

    it( "should allow notes to instantly stop playing for most waveforms at 0 release", () => {
        const oscillator = {
            adsr: {
                attack: 0,
                decay: 0,
                sustain: .75,
                release: 0
            }
        };
        const WAVEFORMS  = [ "SAW", "SQUARE", "NOISE", "CUSTOM" ];

        WAVEFORMS.forEach(( waveform ) => {

            oscillator.waveform = waveform;

            const startTime    = 2;
            const expectedTime = startTime; // 0 attack value implies instant-max volume

            const sandbox = sinon.sandbox.create();
            sandbox.stub( output.gain, "linearRampToValueAtTime" ).callsFake(( value, time ) => {
                assert.strictEqual( time, expectedTime );
                sandbox.restore();
            });
            ADSR.applyAmpRelease( oscillator, output, startTime );
        });
    });

    it( "should have a short fade-out for certain waveforms at 0 release to prevent popping", () => {
        const oscillator = {
            adsr: {
                attack: 0,
                decay: 0,
                sustain: .75,
                release: 0
            }
        };
        const WAVEFORMS  = [ "SINE", "TRIANGLE" ];

        WAVEFORMS.forEach(( waveform ) => {

            oscillator.waveform = waveform;

            const startTime    = 2;
            const expectedTime = startTime + 0.002; // these waveforms have a slight fade out to prevent popping

            const sandbox = sinon.sandbox.create();
            sandbox.stub( output.gain, "linearRampToValueAtTime" ).callsFake(( value, time ) => {
                assert.strictEqual( time, expectedTime );
                sandbox.restore();
            });
            ADSR.applyAmpRelease( oscillator, output, startTime );
        });
    });

    it( "should delay killing playback for a positive release range", () => {
        const oscillator = {
            adsr: {
                attack: 0,
                decay: 0,
                sustain: .75,
                release: .89
            }
        };
        // all waveforms are now treated equally
        const WAVEFORMS  = [ "SAW", "SQUARE", "NOISE", "CUSTOM", "SINE", "TRIANGLE" ];

        WAVEFORMS.forEach(( waveform ) => {

            oscillator.waveform = waveform;

            const startTime    = 2;
            const expectedTime = startTime + oscillator.adsr.release;
            const sandbox = sinon.sandbox.create();
            sandbox.stub( output.gain, "linearRampToValueAtTime" ).callsFake(( value, time ) => {
                assert.strictEqual( time, expectedTime );
                sandbox.restore();
            });
            ADSR.applyAmpRelease( oscillator, output, startTime );
        });
    });
});

