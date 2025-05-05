import { it, describe, expect } from "vitest";
import {
    getMeasureDurationInSeconds,
    getMeasureDurationInMs,
    msToFrequency,
    secondsToSamples,
    syncIntervalWithBeat,
} from "@/utils/audio-math";

describe( "audio math utilities", () => {
    it( "should be able to calculate the duration of a measure in seconds by the provided tempo map", () => {
        expect( getMeasureDurationInSeconds({
            tempo: 130.5,
            timeSigNumerator: 4,
            timeSigDenominator: 4,
        })).toBeCloseTo( 1.83908 );
    });

    it( "should be able to calculate the duration of a measure in milliseconds by the provided tempo map", () => {
        expect( getMeasureDurationInMs({
            tempo: 130.5,
            timeSigNumerator: 4,
            timeSigDenominator: 4,
        })).toBeCloseTo( 1839.0804 );
    });

    it( "should be able to translate a duration in milliseconds into Hertz", () => {
        expect( msToFrequency( 1000 )).toEqual( 1 );
    });

    it( "should be able to convert a value in seconds into the amount of samples necessary to store the information at provided sample rate", () => {
        expect( secondsToSamples( 2.5, 48000 )).toEqual( 120000 );
    });

    it( "should be able to sync an interval in seconds into the nearest beat subdivision", () => {
        expect( syncIntervalWithBeat( 1.35, {
            tempo: 120,
            timeSigNumerator: 4,
            timeSigDenominator: 4
        }, 16 )).toEqual( 1.375 );
    });
});