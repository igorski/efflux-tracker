import { describe, it, expect } from "vitest";
import OscillatorTypes from "@/definitions/oscillator-types";
import InstrumentFactory from "@/model/factories/instrument-factory";
import type { InstrumentOscillator } from "@/model/types/instrument";
import ADSR from "@/services/audio/adsr-module";
import { mockGainNode } from "../../mocks";

describe( "ADSR", () => {

    // mock AudioGainNode

    const output = { ...mockGainNode };

    const createOscillator = ( props?: Partial<InstrumentOscillator> ): InstrumentOscillator => ({
        ...InstrumentFactory.createOscillator( true ),
        ...props
    });

    // attack envelopes

    it( "should allow notes to playback at full volume instantly for most waveforms at 0 attack", () => {
        const oscillator = createOscillator({
            adsr: {
                attack: 0,
                decay: 0,
                sustain: .75,
                release: 0
            }
        });
        const WAVEFORMS = [
            OscillatorTypes.SAW, OscillatorTypes.SQUARE, OscillatorTypes.NOISE, OscillatorTypes.CUSTOM
        ];
        WAVEFORMS.forEach( waveform => {
            oscillator.waveform = waveform;

            const startTime    = 2;
            const expectedTime = startTime; // 0 attack value implies instant-max volume

            ADSR.applyAmpEnvelope( oscillator, output, startTime );
            expect( output.gain.linearRampToValueAtTime ).toHaveBeenCalledWith( 1.0, expectedTime );
        });
    });

    it( "should have a short fade-in for certain waveforms with 0 attack to prevent popping", () => {
        const oscillator = createOscillator({
            adsr: {
                attack: 0,
                decay: 0,
                sustain: .75,
                release: 0
            }
        });
        const WAVEFORMS = [ OscillatorTypes.SINE, OscillatorTypes.TRIANGLE ];

        WAVEFORMS.forEach( waveform => {

            oscillator.waveform = waveform;

            const startTime    = 2;
            const expectedTime = startTime + 0.002; // these waveforms have a slight fade in to prevent popping

            ADSR.applyAmpEnvelope( oscillator, output, startTime );
            expect( output.gain.linearRampToValueAtTime ).toHaveBeenCalledWith( 1.0, expectedTime );
        });
    });

    it( "should delay full volume for a positive attack range", () => {
        const oscillator = createOscillator({
            adsr: {
                attack: .89,
                decay: 0,
                sustain: .75,
                release: 0
            }
        });
        // all waveforms are now treated equally
        const WAVEFORMS = [
            OscillatorTypes.SAW, OscillatorTypes.SQUARE, OscillatorTypes.NOISE, OscillatorTypes.CUSTOM,
            OscillatorTypes.SINE, OscillatorTypes.TRIANGLE
        ];

        WAVEFORMS.forEach( waveform => {

            oscillator.waveform = waveform;

            const startTime    = 2;
            const expectedTime = startTime + oscillator.adsr.attack;

            ADSR.applyAmpEnvelope( oscillator, output, startTime );
            expect(output.gain.linearRampToValueAtTime).toHaveBeenCalledWith(1.0, expectedTime);
        });
    });

    // release envelopes

    it( "should allow notes to instantly stop playing for most waveforms at 0 release", () => {
        const oscillator = createOscillator({
            adsr: {
                attack: 0,
                decay: 0,
                sustain: .75,
                release: 0
            }
        });
        const WAVEFORMS = [
            OscillatorTypes.SAW, OscillatorTypes.SQUARE, OscillatorTypes.NOISE, OscillatorTypes.CUSTOM
        ];
        WAVEFORMS.forEach( waveform => {

            oscillator.waveform = waveform;

            const startTime    = 2;
            const expectedTime = startTime; // 0 attack value implies instant-max volume

            ADSR.applyAmpRelease( oscillator, output, startTime );
            expect(output.gain.linearRampToValueAtTime).toHaveBeenCalledWith(1.0, expectedTime);
        });
    });

    it( "should have a short fade-out for certain waveforms at 0 release to prevent popping", () => {
        const oscillator = createOscillator({
            adsr: {
                attack: 0,
                decay: 0,
                sustain: .75,
                release: 0
            }
        });
        const WAVEFORMS = [ OscillatorTypes.SINE, OscillatorTypes.TRIANGLE ];

        WAVEFORMS.forEach( waveform  => {
            oscillator.waveform = waveform;

            const startTime    = 2;
            const expectedTime = startTime + 0.002; // these waveforms have a slight fade out to prevent popping

            ADSR.applyAmpRelease( oscillator, output, startTime );
            expect(output.gain.linearRampToValueAtTime).toHaveBeenCalledWith(1.0, expectedTime);
        });
    });

    it( "should delay killing playback for a positive release range", () => {
        const oscillator = createOscillator({
            adsr: {
                attack: 0,
                decay: 0,
                sustain: .75,
                release: .89
            }
        });
        // all waveforms are now treated equally
        const WAVEFORMS = [
            OscillatorTypes.SAW, OscillatorTypes.SQUARE, OscillatorTypes.NOISE,
            OscillatorTypes.CUSTOM, OscillatorTypes.SINE, OscillatorTypes.TRIANGLE
        ];

        WAVEFORMS.forEach( waveform => {
            oscillator.waveform = waveform;

            const startTime    = 2;
            const expectedTime = startTime + oscillator.adsr.release;

            ADSR.applyAmpRelease( oscillator, output, startTime );
            expect(output.gain.linearRampToValueAtTime).toHaveBeenCalledWith(1.0, expectedTime);
        });
    });
});
