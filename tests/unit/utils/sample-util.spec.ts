import { describe, it, expect, beforeAll } from "vitest";
import EventFactory from "@/model/factories/event-factory";
import { type Sample, PlaybackType } from "@/model/types/sample";
import Pitch from "@/services/audio/pitch";
import { getSliceIndexForNote } from "@/utils/sample-util";
import { createSample } from "../mocks";

describe( "Sample utility", () => {
    const TOTAL_SLICES = 24;
    let sample: Sample;

    describe( "when retrieving the appropriate slice index for a given note", () => {
        beforeAll(() => {
            sample = createSample( "foo", "bar", PlaybackType.SLICED );
            
            const sliceLength = Math.floor( sample.buffer.length / TOTAL_SLICES );
            for ( let i = 0; i < TOTAL_SLICES; ++i ) {
                const rangeStart = i * sliceLength;
                sample.slices.push(({ rangeStart, rangeEnd: rangeStart + ( sliceLength - 1 ) }));
            }
        });

        it( "should start at the first slice for a C1 note", () => {
            const index = getSliceIndexForNote( EventFactory.create( 0, "C", 1 ), sample );
            expect( index ).toEqual( 0 );
        });

        it( "should get all the subsequent indices for the following notes within the same 1st octave", () => {
            for ( let i = 1, total = Pitch.OCTAVE_SCALE.length; i < total; ++i ) {
                const note = Pitch.OCTAVE_SCALE[ i ];
                expect( getSliceIndexForNote( EventFactory.create( 0, note, 1 ), sample )).toEqual( i );
            }
        });

        it( "should start at the 13th slice for a C2 note", () => {
            const index = getSliceIndexForNote( EventFactory.create( 0, "C", 2 ), sample );
            expect( index ).toEqual( 12 );
        });

        it( "should get all the subsequent indices for the following notes within the same 2nd octave", () => {
            for ( let i = 1, total = Pitch.OCTAVE_SCALE.length; i < total; ++i ) {
                const note = Pitch.OCTAVE_SCALE[ i ];
                expect( getSliceIndexForNote( EventFactory.create( 0, note, 2 ), sample )).toEqual( i + 12 );
            }
        });

        it( "should return undefined when exceeding all available slices", () => {
            const index = getSliceIndexForNote( EventFactory.create( 0, "C", 3 ), sample );
            expect( index ).toBeUndefined();
        });
    });
});
