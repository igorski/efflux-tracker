import { describe, it, expect } from "vitest";
import { Transpose } from "@/services/audio/pitch";

describe( "Pitch", () => {
    describe( "When transposing a pitch", () => {
        it( "should be able to transpose up", () => {
            expect( Transpose( "C", 3, 3 )).toEqual({ note: "D#", octave: 3 });
        });

        it( "should be able to transpose down", () => {
            expect( Transpose( "F#", 3, -3 )).toEqual({ note: "D#", octave: 3 });
        });

        it( "should be able to transpose up across octaves", () => {
            expect( Transpose( "D", 3, 17 )).toEqual({ note: "G", octave: 4 });
        });

        it( "should be able to transpose down across octaves", () => {
            expect( Transpose( "D", 3, -17 )).toEqual({ note: "A", octave: 1 });
        });

        it( "should not extend an upwards transposition beyond the maximum octave and note range", () => {
            expect( Transpose( "D", 7, 28 )).toEqual({ note: "F#", octave : 8 });
        });

        it( "should not extend a downwards transposition beyond the maximum octave and note range", () => {
            expect( Transpose( "F#", 3, -28 )).toEqual({ note: "D", octave : 1 });
        });
    });
});
