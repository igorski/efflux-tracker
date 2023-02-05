/**
 * @jest-environment jsdom
 */
import SampleFactory from "@/model/factories/sample-factory";
import { serialize } from "@/model/serializers/sample-serializer";
import type { XTKSample } from "@/model/serializers/sample-serializer";
import { mockAudioContext, mockAudioBuffer } from "../../mocks";

let mockFn: ( fnName: string, ...args: any ) => void;
jest.mock( "@/utils/sample-util", () => ({
    sliceBuffer: jest.fn(( ...args ) => mockFn( "sliceBuffer", ...args )),
}));
jest.mock( "@/services/audio/webaudio-helper", () => ({
    createOfflineAudioContext: jest.fn(() => mockAudioContext )
}));
jest.mock( "@/services/audio-service", () => ({
    getAudioContext: jest.fn(() => mockAudioContext )
}));
jest.mock( "@/services/audio/sample-loader", () => ({
    loadSample: jest.fn(( ...args ) => Promise.resolve( mockFn( "loadSample", ...args )))
}));
let mockFnFileUtil: ( fnName: string, ...args: any ) => void;
jest.mock( "@/utils/file-util", () => ({
    fileToBase64: jest.fn(( ...args ) => Promise.resolve( mockFnFileUtil( "fileToBase64", ...args ))),
    base64ToBlob: jest.fn(( ...args ) => Promise.resolve( mockFnFileUtil( "base64ToBlob", ...args )))
}));

describe( "SampleFactory", () => {
    it( "should be able to construct a new instance from given source, buffer and name", () => {
        const blob = new Blob();
        const name = "foo";
        const sample = SampleFactory.create( blob, mockAudioBuffer, name );
        expect( sample ).toEqual({
            id: expect.any( String ),
            name,
            source: blob,
            buffer: mockAudioBuffer,
            rangeStart: 0,
            rangeEnd: mockAudioBuffer.duration,
            pitch: null,
            repitch: true,
            rate: mockAudioBuffer.sampleRate,
            length: mockAudioBuffer.duration,
        });
    });

    describe( "when getting the buffer for a sample", () => {
        it( "should return the buffer unchanged when there is no custom range playback defined", () => {
            const sample = SampleFactory.create( null, mockAudioBuffer, "foo" );
            expect( SampleFactory.getBuffer( sample, mockAudioContext )).toEqual( mockAudioBuffer );
        });

        it( "should return a sliced buffer when a custom range playback is defined", () => {
            const sample = SampleFactory.create( null, mockAudioBuffer, "foo" );
            sample.rangeStart = 10;
            sample.rangeEnd   = 500;

            const mockSlicedBuffer = { duration: 490 };
            mockFn = jest.fn(() => mockSlicedBuffer );

            expect( SampleFactory.getBuffer( sample, mockAudioContext )).toEqual( mockSlicedBuffer );
            expect( mockFn ).toHaveBeenCalledWith( "sliceBuffer", mockAudioContext, mockAudioBuffer, sample.rangeStart, sample.rangeEnd );
        });
    });

    describe( "when serializing a sample", () => {
        it( "should convert sample sources of the binary type into base64", async () => {
            const source = new Blob();
            const sample = SampleFactory.create( source, mockAudioBuffer, "foo" );
            mockFnFileUtil = jest.fn(() => "serializedSource" );

            const serialized = await serialize( sample );
            expect( mockFnFileUtil ).toHaveBeenCalledWith( "fileToBase64", source );

            expect( serialized ).toEqual({
                b  : "serializedSource",
                n  : "foo",
                s  : 0,
                e  : mockAudioBuffer.duration,
                p  : null,
                r  : true,
                sr : sample.rate,
                l  : sample.length
            });
        });

        it( "should leave sample sources of the String type unchanged", async () => {
            const source = "base64";
            const sample = SampleFactory.create( source, mockAudioBuffer, "foo" );
            mockFnFileUtil = jest.fn(() => "serializedSource" );

            const serialized = await serialize( sample );
            expect( mockFnFileUtil ).not.toHaveBeenCalled();

            expect( serialized ).toEqual({
                b  : "base64",
                n  : "foo",
                s  : 0,
                e  : mockAudioBuffer.duration,
                p  : null,
                r  : true,
                sr : mockAudioBuffer.sampleRate,
                l  : mockAudioBuffer.duration
            });
        });

        it( "should serialize the custom ranges and pitch data", async () => {
            const sample = SampleFactory.create( "base64", mockAudioBuffer, "foo" );
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

            const serialized = await serialize( sample );
            expect( serialized ).toEqual({
                b  : "base64",
                n  : "foo",
                s  : 5,
                e  : 10,
                p  : pitch,
                r  : sample.repitch,
                sr : sample.rate,
                l  : mockAudioBuffer.duration
            })
        });
    });

    it( "should convert the Stringified source back into binary when assembling a sample", async () => {
        const serialized: XTKSample = {
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
        mockFn = jest.fn(() => mockAudioBuffer );

        const assembled = await SampleFactory.deserialize( serialized );

        expect( mockFnFileUtil ).toHaveBeenCalledWith( "base64ToBlob", serialized.b );
        expect( mockFn ).toHaveBeenCalledWith( "loadSample", source, mockAudioContext );
        expect( assembled ).toEqual({
            id: expect.any( String ),
            source,
            buffer: mockAudioBuffer,
            name: "foo",
            rangeStart: 1,
            rangeEnd: 2.5,
            pitch: serialized.p,
            repitch: false,
            rate: 44100,
            length: mockAudioBuffer.duration
        });
    });

    it( "should cap the sample range end to not exceed the sample length", async () => {
        const serialized = {
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
            l: mockAudioBuffer.duration
        };
        const source = new Blob();
        mockFnFileUtil = jest.fn(() => source );
        mockFn = jest.fn(() => mockAudioBuffer );

        const assembled = await SampleFactory.deserialize( serialized );

        expect( mockFnFileUtil ).toHaveBeenCalledWith( "base64ToBlob", serialized.b );
        expect( mockFn ).toHaveBeenCalledWith( "loadSample", source, mockAudioContext );
        expect( assembled ).toEqual({
            id: expect.any( String ),
            source,
            buffer: mockAudioBuffer,
            name: "foo",
            rangeStart: 1,
            rangeEnd: mockAudioBuffer.duration,
            pitch: serialized.p,
            repitch: false,
            rate: 44100,
            length: mockAudioBuffer.duration
        });
    });
});
