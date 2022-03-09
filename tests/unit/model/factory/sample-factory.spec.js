/**
 * @jest-environment jsdom
 */
import SampleFactory from "@/model/factories/sample-factory";

let mockFn;
jest.mock( "@/utils/sample-util", () => ({
    sliceBuffer: jest.fn(( ...args ) => mockFn( "sliceBuffer", ...args )),
}));
let mockAudioContext = { sampleRate: 48000 };
jest.mock( "@/services/audio/webaudio-helper", () => ({
    createOfflineAudioContext: jest.fn(() => mockAudioContext )
}));
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

const MOCK_BUFFER = { duration: 4.5, sampleRate: 44100 };

describe( "SampleFactory", () => {
    it( "should be able to construct a new instance from given source, buffer and name", () => {
        const blob = new Blob();
        const name = "foo";
        const sample = SampleFactory.create( blob, MOCK_BUFFER, name );
        expect( sample ).toEqual({
            id: expect.any( String ),
            name,
            source: blob,
            buffer: MOCK_BUFFER,
            rangeStart: 0,
            rangeEnd: MOCK_BUFFER.duration,
            pitch: null,
            repitch: true,
            rate: MOCK_BUFFER.sampleRate,
            length: MOCK_BUFFER.duration,
        });
    });

    describe( "when getting the buffer for a sample", () => {
        const audioContext = {};

        it( "should return the buffer unchanged when there is no custom range playback defined", () => {
            const sample = SampleFactory.create( null, MOCK_BUFFER, "foo" );
            expect( SampleFactory.getBuffer( sample, audioContext )).toEqual( MOCK_BUFFER );
        });

        it( "should return a sliced buffer when a custom range playback is defined", () => {
            const sample = SampleFactory.create( null, MOCK_BUFFER, "foo" );
            sample.rangeStart = 10;
            sample.rangeEnd   = 500;

            const mockSlicedBuffer = { duration: 490 };
            mockFn = jest.fn(() => mockSlicedBuffer );

            expect( SampleFactory.getBuffer( sample, audioContext )).toEqual( mockSlicedBuffer );
            expect( mockFn ).toHaveBeenCalledWith( "sliceBuffer", audioContext, MOCK_BUFFER, sample.rangeStart, sample.rangeEnd );
        });
    });

    describe( "when disassembling a sample", () => {
        it( "should convert sample sources of the binary type into base64", async () => {
            const source = new Blob();
            const sample = SampleFactory.create( source, MOCK_BUFFER, "foo" );
            mockFnFileUtil = jest.fn(() => "serializedSource" );

            const disassembled = await SampleFactory.disassemble( sample );
            expect( mockFnFileUtil ).toHaveBeenCalledWith( "fileToBase64", source );

            expect( disassembled ).toEqual({
                b  : "serializedSource",
                n  : "foo",
                s  : 0,
                e  : MOCK_BUFFER.duration,
                p  : null,
                r  : true,
                sr : sample.rate,
                l  : sample.length
            });
        });

        it( "should leave sample sources of the String type unchanged", async () => {
            const source = "base64";
            const sample = SampleFactory.create( source, MOCK_BUFFER, "foo" );
            mockFnFileUtil = jest.fn(() => "serializedSource" );

            const disassembled = await SampleFactory.disassemble( sample );
            expect( mockFnFileUtil ).not.toHaveBeenCalled();

            expect( disassembled ).toEqual({
                b  : "base64",
                n  : "foo",
                s  : 0,
                e  : MOCK_BUFFER.duration,
                p  : null,
                r  : true,
                sr : MOCK_BUFFER.sampleRate,
                l  : MOCK_BUFFER.duration
            });
        });

        it( "should serialize the custom ranges and pitch data", async () => {
            const sample = SampleFactory.create( "base64", MOCK_BUFFER, "foo" );
            sample.rangeStart = 5;
            sample.rangeEnd = 10;
            const pitch = {
                frequency: 440.12,
                note: "A",
                octave: 3,
                cents: 12
            };
            sample.pitch = pitch;
            sample.repitch = false;

            const disassembled = await SampleFactory.disassemble( sample );
            expect( disassembled ).toEqual({
                b  : "base64",
                n  : "foo",
                s  : 5,
                e  : 10,
                p  : pitch,
                r  : sample.repitch,
                sr : sample.rate,
                l  : MOCK_BUFFER.duration
            })
        });
    });

    it( "should convert the Stringified source back into binary when assembling a sample", async () => {
        const disassembled = {
            b: "base64",
            n: "foo",
            s: 1,
            e: 2.5,
            p: {
                frequency: 440.12,
                note: "A",
                octave: 3,
                cents: 12
            },
            r: false,
            sr: 44100,
            l: 3.5
        };
        const source = new Blob();
        mockFnFileUtil = jest.fn(() => source );
        mockFn = jest.fn(() => MOCK_BUFFER );

        const assembled = await SampleFactory.assemble( disassembled );

        expect( mockFnFileUtil ).toHaveBeenCalledWith( "base64ToBlob", disassembled.b );
        expect( mockFn ).toHaveBeenCalledWith( "loadSample", source, mockAudioContext );
        expect( assembled ).toEqual({
            id: expect.any( String ),
            source,
            buffer: MOCK_BUFFER,
            name: "foo",
            rangeStart: 1,
            rangeEnd: 2.5,
            pitch: disassembled.p,
            repitch: false,
            rate: 44100,
            length: MOCK_BUFFER.duration
        });
    });

    it( "should cap the sample range end to not exceed the sample length", async () => {
        const disassembled = {
            b: "base64",
            n: "foo",
            s: 1,
            e: 5,
            p: {
                frequency: 440.12,
                note: "A",
                octave: 3,
                cents: 12
            },
            r: false,
            sr: 44100,
            l: MOCK_BUFFER.duration
        };
        const source = new Blob();
        mockFnFileUtil = jest.fn(() => source );
        mockFn = jest.fn(() => MOCK_BUFFER );

        const assembled = await SampleFactory.assemble( disassembled );

        expect( mockFnFileUtil ).toHaveBeenCalledWith( "base64ToBlob", disassembled.b );
        expect( mockFn ).toHaveBeenCalledWith( "loadSample", source, mockAudioContext );
        expect( assembled ).toEqual({
            id: expect.any( String ),
            source,
            buffer: MOCK_BUFFER,
            name: "foo",
            rangeStart: 1,
            rangeEnd: MOCK_BUFFER.duration,
            pitch: disassembled.p,
            repitch: false,
            rate: 44100,
            length: MOCK_BUFFER.duration
        });
    });
});
