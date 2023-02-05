import type { Sample } from "@/model/types/sample";

export const mockAudioContext: BaseAudioContext = {
    sampleRate: 44100,
    currentTime: 0
} as BaseAudioContext;

export const mockGainNode: GainNode = {
    gain: {
        cancelScheduledValues: jest.fn(),
        linearRampToValueAtTime: jest.fn(),
        setValueAtTime: jest.fn()
    }
} as unknown as GainNode;

export const mockAudioBuffer: AudioBuffer = {
    sampleRate: 44100,
    length: 132300,
    duration: 3,
    numberOfChannels: 1
} as AudioBuffer;

export const createSample = ( sampleName: string, optId?: string ): Sample => ({
    id         : optId ?? `s{Math.ceil( Math.random() * 100 )}`,
    name       : sampleName,
    source     : "base64;",
    buffer     : mockAudioBuffer,
    rangeStart : 0,
    rangeEnd   : mockAudioBuffer.duration,
    rate       : mockAudioBuffer.sampleRate,
    length     : mockAudioBuffer.duration,
    pitch      : null,
    repitch    : true,
});
