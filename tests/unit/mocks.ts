import { vi } from "vitest";
import type { Store } from "vuex";
import { type Sample, PlaybackType } from "@/model/types/sample";
import type { EffluxState } from "@/store";
import { createEditorState } from "@/store/modules/editor-module";
import { createHistoryState } from "@/store/modules/history-module";
import { createInstrumentState } from "@/store/modules/instrument-module";
import { createMidiState } from "@/store/modules/midi-module";
import { createSampleState } from "@/store/modules/sample-module";
import { createSelectionState } from "@/store/modules/selection-module";
import { createSequencerState } from "@/store/modules/sequencer-module";
import { createSettingsState } from "@/store/modules/settings-module";
import { createSongState } from "@/store/modules/song-module";

export const mockAudioContext: BaseAudioContext = {
    sampleRate: 44100,
    currentTime: 0
} as BaseAudioContext;

export const mockGainNode: GainNode = {
    gain: {
        cancelScheduledValues: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        setValueAtTime: vi.fn()
    }
} as unknown as GainNode;

export const createMockOscillatorNode = (): OscillatorNode => ({
    disconnect: vi.fn(),
} as unknown as OscillatorNode );

export const mockAudioBuffer: AudioBuffer = {
    sampleRate: 44100,
    length: 132300,
    duration: 3,
    numberOfChannels: 1
} as AudioBuffer;

export const createSample = ( sampleName: string, optId?: string, type = PlaybackType.REPITCHED ): Sample => ({
    id         : optId ?? `s{Math.ceil( Math.random() * 100 )}`,
    name       : sampleName,
    source     : "base64;",
    buffer     : mockAudioBuffer,
    rangeStart : 0,
    rangeEnd   : mockAudioBuffer.duration,
    rate       : mockAudioBuffer.sampleRate,
    length     : mockAudioBuffer.duration,
    loop       : true,
    pitch      : null,
    slices     : [],
    type,
});

export const createState = ( props?: Partial<EffluxState> ): EffluxState => ({
    menuOpened: false,
    blindActive: false,
    helpTopic: "general",
    loadingStates: [], // wether one or more long running operations are running
    windowSize: { width: 800, height: 600 },
    dialog: null,
    notifications: [],
    modal: null,
    mobileMode: null,
    dropboxConnected: false,
    mediaConnected: false,
    applicationFocused: true,
    editor: createEditorState(),
    history: createHistoryState(),
    instrument: createInstrumentState(),
    midi: createMidiState(),
    sample: createSampleState(),
    selection: createSelectionState(),
    sequencer: createSequencerState(),
    settings: createSettingsState(),
    song: createSongState(),
    ...props
});

export const createMockStore = ( props?: Partial<EffluxState> ): Store<EffluxState> => ({
    state: createState( props ),
    getters: {
        t: vi.fn(), // vue-i18n
    },
    commit: vi.fn(),
    dispatch: vi.fn(),
}) as unknown as Store<EffluxState>;