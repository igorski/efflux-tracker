import { describe, it, expect, vi } from "vitest";

import SampleFactory from "@/model/factories/sample-factory";
import { serialize } from "@/model/serializers/sample-serializer";
import type { XTKSample } from "@/model/serializers/sample-serializer";
import { PlaybackType } from "@/model/types/sample";
import { mockAudioContext, mockAudioBuffer } from "../../mocks";

let mockFn: ( fnName: string, ...args: any ) => void;
vi.mock( "@/utils/sample-util", () => ({
    sliceBuffer: vi.fn(( ...args ) => mockFn( "sliceBuffer", ...args )),
}));
vi.mock( "@/services/audio/webaudio-helper", () => ({
    createOfflineAudioContext: vi.fn(() => mockAudioContext )
}));
vi.mock( "@/services/audio-service", () => ({
    getAudioContext: vi.fn(() => mockAudioContext )
}));
vi.mock( "@/services/audio/sample-loader", () => ({
    loadSample: vi.fn(( ...args ) => Promise.resolve( mockFn( "loadSample", ...args )))
}));
let mockFnFileUtil: ( fnName: string, ...args: any ) => void;
vi.mock( "@/utils/file-util", () => ({
    fileToBase64: vi.fn(( ...args ) => Promise.resolve( mockFnFileUtil( "fileToBase64", ...args ))),
    base64ToBlob: vi.fn(( ...args ) => Promise.resolve( mockFnFileUtil( "base64ToBlob", ...args )))
}));

describe( "SampleFactory", () => {
    it( "should be able to construct a new instance from given source, buffer, name and playback type", () => {
        const blob = new Blob();
        const name = "foo";
        const sample = SampleFactory.create( blob, mockAudioBuffer, name, PlaybackType.SLICED );
        expect( sample ).toEqual({
            id: expect.any( String ),
            name,
            source: blob,
            buffer: mockAudioBuffer,
            rangeStart: 0,
            rangeEnd: mockAudioBuffer.duration,
            loop: false,
            pitch: null,
            rate: mockAudioBuffer.sampleRate,
            duration: mockAudioBuffer.duration,
            slices: expect.any( Array ),
            type: PlaybackType.SLICED,
        });
    });

    it( "should by default construct for the REPITCHED playbackType", () => {
        const sample = SampleFactory.create( new Blob(), mockAudioBuffer, "foo" );
        expect( sample.type ).toEqual( PlaybackType.REPITCHED );
    });

    describe( "when retrieving the buffer for a sample", () => {
        it( "should return the buffer unchanged when there is no custom playback range defined", () => {
            const sample = SampleFactory.create( null, mockAudioBuffer, "foo" );
            expect( SampleFactory.getBuffer( sample, mockAudioContext )).toEqual( mockAudioBuffer );
        });

        it( "should return a sliced buffer when the sample has a custom playback range", () => {
            const sample = SampleFactory.create( null, mockAudioBuffer, "foo" );
            sample.rangeStart = 10;
            sample.rangeEnd   = 500;

            const mockSlicedBuffer = { length: 490 } as AudioBuffer;
            mockFn = vi.fn(() => mockSlicedBuffer );

            expect( SampleFactory.getBuffer( sample, mockAudioContext )).toEqual( mockSlicedBuffer );
            expect( mockFn ).toHaveBeenCalledWith( "sliceBuffer", mockAudioBuffer, sample.rangeStart, sample.rangeEnd, mockAudioContext );
        });

        it( "should return a sliced buffer for the optionally provided range", () => {
            const sample = SampleFactory.create( null, mockAudioBuffer, "foo" );

            const mockSlicedBuffer = { length: 300 } as AudioBuffer;
            mockFn = vi.fn(() => mockSlicedBuffer );

            expect( SampleFactory.getBuffer( sample, mockAudioContext, 100, 400 )).toEqual( mockSlicedBuffer );
            expect( mockFn ).toHaveBeenCalledWith( "sliceBuffer", mockAudioBuffer, 100, 400, mockAudioContext );
        });
    });

    describe( "when serializing a sample", () => {
        it( "should convert sample sources of the binary type into base64", async () => {
            const source = new Blob();
            const sample = SampleFactory.create( source, mockAudioBuffer, "foo" );
            mockFnFileUtil = vi.fn(() => "serializedSource" );

            const serialized = await serialize( sample );
            expect( mockFnFileUtil ).toHaveBeenCalledWith( "fileToBase64", source );

            expect( serialized ).toEqual({
                b  : "serializedSource",
                n  : "foo",
                s  : 0,
                e  : mockAudioBuffer.duration,
                lp : false,
                p  : null,
                sr : sample.rate,
                l  : sample.duration,
                sl : [],
                t  : sample.type,
            });
        });

        it( "should leave sample sources of the String type unchanged", async () => {
            const source = "base64";
            const sample = SampleFactory.create( source, mockAudioBuffer, "foo" );
            mockFnFileUtil = vi.fn(() => "serializedSource" );

            const serialized = await serialize( sample );
            expect( mockFnFileUtil ).not.toHaveBeenCalled();

            expect( serialized ).toEqual({
                b  : "base64",
                n  : "foo",
                s  : 0,
                e  : mockAudioBuffer.duration,
                lp : false,
                p  : null,
                sr : mockAudioBuffer.sampleRate,
                l  : mockAudioBuffer.duration,
                sl : [],
                t  : sample.type,
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
            sample.type  = PlaybackType.DEFAULT;

            const serialized = await serialize( sample );
            expect( serialized ).toEqual({
                b  : "base64",
                n  : "foo",
                s  : 5,
                e  : 10,
                lp : false,
                p  : pitch,
                sr : sample.rate,
                l  : mockAudioBuffer.duration,
                sl : [],
                t  : PlaybackType.DEFAULT,
            })
        });

        it( "should serialize the optional slice-data", async () => {
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
            sample.slices = [
                { rangeStart: 0, rangeEnd: 1.5 }, { rangeStart: 1.5, rangeEnd: 3 }, { rangeStart: 3, rangeEnd: 10 },
            ];
            sample.type = PlaybackType.SLICED;

            const serialized = await serialize( sample );
            expect( serialized ).toEqual({
                b  : "base64",
                n  : "foo",
                s  : 5,
                e  : 10,
                lp : false,
                p  : pitch,
                sr : sample.rate,
                l  : mockAudioBuffer.duration,
                sl : [{ s: 0, e: 1.5 }, { s: 1.5, e: 3 }, { s: 3, e: 10 }],
                t  : PlaybackType.SLICED,
            });
        });
    });

    it( "should convert the Stringified source back into binary when assembling a sample", async () => {
        const serialized: XTKSample = {
            b: "base64",
            n: "foo",
            s: 1,
            e: 2.5,
            lp: false,
            p: {
                frequency: 440.12,
                note: "A",
                octave: 3,
                cents: 12
            },
            sr: 44100,
            l: 3.5,
            sl: [{ s: 0, e: 0.5 }, { s: 0.5, e: 2.5 }],
            t: PlaybackType.SLICED,
        };
        const source = new Blob();
        mockFnFileUtil = vi.fn(() => source );
        mockFn = vi.fn(() => mockAudioBuffer );

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
            loop: false,
            pitch: serialized.p,
            rate: 44100,
            duration: mockAudioBuffer.duration,
            slices: [{
                rangeStart: 0,
                rangeEnd: 0.5,
            }, {
                rangeStart: 0.5,
                rangeEnd: 2.5,
            }],
            type: PlaybackType.SLICED,
        });
    });

    it( "should cap the sample range end to not exceed the sample length", async () => {
        const serialized = {
            b: "base64",
            n: "foo",
            s: 1,
            e: 5,
            lp: true,
            p: {
                frequency: 440.12,
                note: "A",
                octave: 3,
                cents: 12
            },
            sr: 44100,
            l: mockAudioBuffer.duration,
            t: PlaybackType.DEFAULT,
        };
        const source = new Blob();
        mockFnFileUtil = vi.fn(() => source );
        mockFn = vi.fn(() => mockAudioBuffer );

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
            loop: true,
            pitch: serialized.p,
            rate: 44100,
            duration: mockAudioBuffer.duration,
            slices: expect.any( Array ),
            type: PlaybackType.DEFAULT,
        });
    });

    describe( "when deserializing a legacy sample format", () => {
        const MOCK_LEGACY_SAMPLE = {
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
        
        it( "should appropriately set the DEFAULT PlaybackType", async () => {
            mockFnFileUtil = vi.fn(() => new Blob() );
            mockFn = vi.fn(() => mockAudioBuffer );
    
            const assembled = await SampleFactory.deserialize( MOCK_LEGACY_SAMPLE );

            expect( assembled.type ).toEqual( PlaybackType.DEFAULT );
        });

        it( "should appropriately set the PITCHED PlaybackType", async () => {
            const serialized = { ...MOCK_LEGACY_SAMPLE, r: true };

            mockFnFileUtil = vi.fn(() => new Blob() );
            mockFn = vi.fn(() => mockAudioBuffer );
    
            const assembled = await SampleFactory.deserialize( serialized );

            expect( assembled.type ).toEqual( PlaybackType.REPITCHED );
        });

        it( "should force the loop state to enabled", async () => {

            mockFnFileUtil = vi.fn(() => new Blob() );
            mockFn = vi.fn(() => mockAudioBuffer );
    
            const assembled = await SampleFactory.deserialize( MOCK_LEGACY_SAMPLE );

            expect( assembled.loop ).toEqual( true );
        });
    });

    it( "should be able to serialize and deserialize optional sample editor properties", async () => {
        const sample = SampleFactory.create( new Blob(), mockAudioBuffer, "foo" ); 
        sample.editProps = { st: 0.5, sf: 220 };

        mockFnFileUtil = vi.fn(() => "serializedSource" );
        mockFn = vi.fn(() => mockAudioBuffer );

        const serializedSample = await serialize( sample );
        const assembled = await SampleFactory.deserialize( serializedSample );

        expect( assembled.editProps ).toEqual({ st: 0.5, sf: 220 });
    });
});
