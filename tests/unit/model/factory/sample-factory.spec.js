import SampleFactory from "@/model/factories/sample-factory";

let mockFn;
jest.mock( "@/utils/sample-util", () => ({
    sliceBuffer: jest.fn(( ...args ) => mockFn( "sliceBuffer", ...args )),
}));

describe( "SampleFactory", () => {
    it( "should be able to construct a new instance from given source, buffer and name", () => {
        const blob = new Blob();
        const buffer = { duration: 1000 };
        const name = "foo";
        const sample = SampleFactory.create( blob, buffer, name );
        expect( sample ).toEqual({
            name,
            source: blob,
            buffer,
            rangeStart: 0,
            rangeEnd: buffer.duration,
            pitch: null
        });
    });

    describe( "when getting the buffer for a sample", () => {
        const audioContext = {};

        it( "should return the buffer unchanged when there is no custom range playback defined", () => {
            const buffer = { duration: 1000 };
            const sample = SampleFactory.create( null, buffer, "foo" );
            expect( SampleFactory.getBuffer( sample, audioContext )).toEqual( buffer );
        });

        it( "should return a sliced buffer when a custom range playback is defined", () => {
            const buffer = { duration: 1000 };
            const sample = SampleFactory.create( null, buffer, "foo" );
            sample.rangeStart = 10;
            sample.rangeEnd   = 500;

            const mockSlicedBuffer = { duration: 490 };
            mockFn = jest.fn(() => mockSlicedBuffer );

            expect( SampleFactory.getBuffer( sample, audioContext )).toEqual( mockSlicedBuffer );
            expect( mockFn ).toHaveBeenCalledWith( "sliceBuffer", audioContext, buffer, sample.rangeStart, sample.rangeEnd );
        });
    });
});
