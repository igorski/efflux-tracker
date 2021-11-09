import SampleFactory from "@/model/factories/sample-factory";

let mockFn;
jest.mock( "@/utils/sample-util", () => ({
    sliceBuffer: jest.fn(( ...args ) => mockFn( "sliceBuffer", ...args )),
}));
let mockAudioContext = "audioContext";
jest.mock( "@/services/audio-service", () => ({
    getAudioContext: jest.fn(() => mockAudioContext )
}));
jest.mock( "@/services/audio/sample-loader", () => ({
    loadSample: jest.fn(( ...args ) => Promise.resolve( mockFn( "loadSample", ...args )))
}));
let mockFnFileUtil;
jest.mock( "@/utils/file-util", () => ({
    fileToBase64: jest.fn(( ...args ) => Promise.resolve( mockFnFileUtil( "fileToBase64", ...args ))),
    base64ToBlob: jest.fn(( ...args ) => Promise.resolve( mockFnFileUtil( "base64ToBlob", ...args )))
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

    describe( "when disassembling a sample", () => {
        it( "should convert sample sources of the binary type into base64", async () => {
            const source = new Blob();
            const sample = SampleFactory.create( source, { duration: 1000 }, "foo" );
            mockFnFileUtil = jest.fn(() => "serializedSource" );

            const disassembled = await SampleFactory.disassemble( sample );
            expect( mockFnFileUtil ).toHaveBeenCalledWith( "fileToBase64", source );

            expect( disassembled ).toEqual({
                b: "serializedSource",
                n: "foo",
                s: 0,
                e: 1000,
                p: null
            });
        });

        it( "should leave sample sources of the String type unchanged", async () => {
            const source = "base64";
            const sample = SampleFactory.create( source, { duration: 1000 }, "foo" );
            mockFnFileUtil = jest.fn(() => "serializedSource" );

            const disassembled = await SampleFactory.disassemble( sample );
            expect( mockFnFileUtil ).not.toHaveBeenCalled();

            expect( disassembled ).toEqual({
                b: "base64",
                n: "foo",
                s: 0,
                e: 1000,
                p: null
            });
        });

        it( "should serialize the custom ranges and pitch data", async () => {
            const sample = SampleFactory.create( "base64", { duration: 1000 }, "foo" );
            sample.rangeStart = 5;
            sample.rangeEnd = 10;
            const pitch = {
                frequency: 440.12,
                note: "A",
                octave: 3,
                cents: 12
            };
            sample.pitch = pitch;

            const disassembled = await SampleFactory.disassemble( sample );
            expect( disassembled ).toEqual({
                b: "base64",
                n: "foo",
                s: 5,
                e: 10,
                p: pitch
            })
        });
    });

    it( "should convert the Stringified source back into binary when assembling a sample", async () => {
        const disassembled = {
            b: "base64",
            n: "foo",
            s: 5,
            e: 10,
            p: {
                frequency: 440.12,
                note: "A",
                octave: 3,
                cents: 12
            }
        };
        const source = new Blob();
        const buffer = { duration: 1000 };
        mockFnFileUtil = jest.fn(() => source );
        mockFn = jest.fn(() => buffer );

        const assembled = await SampleFactory.assemble( disassembled );

        expect( mockFnFileUtil ).toHaveBeenCalledWith( "base64ToBlob", disassembled.b );
        expect( mockFn ).toHaveBeenCalledWith( "loadSample", source, mockAudioContext );
        expect( assembled ).toEqual({
            source,
            buffer,
            name: "foo",
            rangeStart: 5,
            rangeEnd: 10,
            pitch: disassembled.p
        });
    });
});
