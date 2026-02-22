import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import replaceInstrument from "@/model/actions/instrument-replace";
import InstrumentFactory from "@/model/factories/instrument-factory";
import SongFactory from "@/model/factories/song-factory";
import { type EffluxSong } from "@/model/types/song";
import { createMockStore } from "../../mocks";

const mockCacheAllOscillators = vi.fn();
const mockApplyModules = vi.fn();
vi.mock( "@/services/audio-service", () => ({
    default: {
        cacheAllOscillators: vi.fn(( ...args ) => mockCacheAllOscillators( ...args )),
        applyModules: vi.fn(( ...args ) => mockApplyModules( ...args )),
    },
    connectAnalysers: vi.fn(() => true ),
}));

describe( "Instrument replace action", () => {
    const AMOUNT_OF_INSTRUMENTS = 4;

    const store = createMockStore();
    const selectedInstrument = AMOUNT_OF_INSTRUMENTS - 1; 
    let song: EffluxSong;

    beforeEach(() => {
        song = SongFactory.create( AMOUNT_OF_INSTRUMENTS );
        store.state.editor.selectedInstrument = selectedInstrument;
        store.state.song.activeSong = song;

        song.order = [ 0, 1, 1, 2, 3 ];
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it( "should be able to replace the instrument at the currently selected index with the provided instrument", () => {
        const commitSpy = vi.spyOn( store, "commit" );

        const instrument = InstrumentFactory.create( 0 );
        replaceInstrument( store, instrument );

        expect( commitSpy ).toHaveBeenCalledWith( "replaceInstrument", { instrumentIndex: selectedInstrument, instrument });
    });
    
    it( "should set the active oscillator to the first one", () => {
        const commitSpy = vi.spyOn( store, "commit" );

        const instrument = InstrumentFactory.create( 0 );
        replaceInstrument( store, instrument );

        expect( commitSpy ).toHaveBeenCalledWith( "setSelectedOscillatorIndex", 0 );
    });

    it( "should request a cache of all oscillators and apply all modules in the AudioServer", () => {
        const instrument = InstrumentFactory.create( 0 );
        replaceInstrument( store, instrument );

        expect( mockCacheAllOscillators ).toHaveBeenCalledWith( selectedInstrument, instrument );
        expect( mockApplyModules ).toHaveBeenCalledWith( song, true );
    });

    it( "should restore the original values appropriately on undo", () => {
        const commitSpy = vi.spyOn( store, "commit" );

        const existingInstrument = song.instruments[ selectedInstrument ];
        const instrument = InstrumentFactory.create( 0 );
        const { undo } = replaceInstrument( store, instrument );

        vi.clearAllMocks();
        
        undo();

        expect( commitSpy ).toHaveBeenCalledWith( "replaceInstrument", {
            instrumentIndex: selectedInstrument, instrument: existingInstrument }
        );
        expect( mockCacheAllOscillators ).toHaveBeenCalledWith( selectedInstrument, existingInstrument );
        expect( mockApplyModules ).toHaveBeenCalledWith( song, true );
    });
});
