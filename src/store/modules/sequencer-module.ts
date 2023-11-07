/**
* The MIT License (MIT)
*
* Igor Zinken 2016-2023 - https://www.igorski.nl
*
* Permission is hereby granted, free of charge, to any person obtaining a copy of
* this software and associated documentation files (the "Software"), to deal in
* the Software without restriction, including without limitation the rights to
* use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
* the Software, and to permit persons to whom the Software is furnished to do so,
* subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
* FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
* COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
* IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
* CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
import type { Module, Store } from "vuex";
import Vue from "vue";
import Config from "@/config";
import LinkedList from "@/utils/linked-list";
import { noteOn, noteOff, getAudioContext, isRecording, togglePlayback } from "@/services/audio-service";
import { createTimer } from "@/services/audio/webaudio-helper";
import Metronome from "@/services/audio/metronome";
import { type EffluxState } from "@/store";
import { type EffluxAudioEvent, ACTION_IDLE, ACTION_NOTE_ON, } from "@/model/types/audio-event";
import { type EffluxChannel } from "@/model/types/channel";
import { type EffluxPattern } from "@/model/types/pattern";
import { type EffluxSong, EffluxSongType } from "@/model/types/song";
import { getEventLength, calculateMeasureLength } from "@/utils/event-util";
import SequencerWorker from "@/workers/sequencer.worker?worker&inline";

export interface SequencerState {
    playing: boolean;
    looping: boolean;
    recording: boolean; // whether we should record non-sequenced noteOn/noteOff events into the patterns
    scheduleAheadTime: number; // scheduler lookahead in seconds
    stepPrecision: number;
    beatAmount: number; // beat amount (the "3" in 3/4) and beat unit (the "4" in 3/4) describe the time signature
    beatUnit: number;
    queueHandlers: OscillatorNode[],
    channelQueue: LinkedList[],
    activeOrderIndex: number; // active entry inside Songs order list (its value is a pattern list index)
    activePatternIndex: number; // active entry inside Songs pattern list
    measureStartTime: number;
    firstMeasureStartTime: number;
    currentStep: number;
    nextNoteTime: number;
    channels?: EffluxChannel[];
    // only used when song is of EffluxSongType.JAM
    jam: { playingPatternIndex: number, nextPatternIndex: number }[];
};

export const createSequencerState = ( props?: Partial<SequencerState> ): SequencerState => ({
    playing               : false,
    looping               : false,
    recording             : false,
    scheduleAheadTime     : 0.2,
    stepPrecision         : 64,
    beatAmount            : 4,
    beatUnit              : 4,
    queueHandlers         : [],
    channelQueue          : new Array( Config.INSTRUMENT_AMOUNT ),
    activeOrderIndex      : 0,
    activePatternIndex    : 0,
    measureStartTime      : 0,
    firstMeasureStartTime : 0,
    currentStep           : 0,
    nextNoteTime          : 0,
    channels              : undefined,
    jam                   : new Array( Config.INSTRUMENT_AMOUNT ),
    ...props
});

let worker: Worker;

/* internal methods */

/**
 * enqueue given event into the AudioService for playback
 */
function enqueueEvent( store: Store<EffluxState>, event: EffluxAudioEvent, eventChannel: number, startMeasure: number ): void {
    const { sequencer } = store.state;
    const { beatAmount, nextNoteTime, channelQueue } = sequencer;
    const activeSong = store.state.song.activeSong;
    const { action, seq } = event;

    seq.playing      = true; // prevents retriggering of same event
    seq.startMeasure = startMeasure;

    // calculate the total duration for the events optional module parameter
    // automation glide (a noteOn lasts until a new note or a kill event is
    // triggered within the same channel)

    const eventPattern = activeSong.patterns[ store.getters.activePatternIndex ];

    seq.mpLength = eventPattern ? calculateMeasureLength( activeSong.meta.tempo, beatAmount ) / eventPattern.steps : 0;

    // play back the event by rendering its audio through the AudioService
    noteOn( event, activeSong.instruments[ event.instrument ], store.getters.sampleCache, nextNoteTime );

    // dequeue preceding events

    const isNoteOn = action === ACTION_NOTE_ON;
    const queue    = channelQueue[ eventChannel ];

    if ( action !== ACTION_IDLE ) {

        // all non-module parameter change events kill previously playing notes
        let playingNote = queue.tail;

        // when looping and this is the only note in the channel (notes are enqueued last first, see reverse collect loop)
        // not sure what the logic here was : this causes the first note in a looped measure to be cut short
        // (in this commented implementation, the note will sustain indefinitely without retrigger until loop stops)
        /*
        if ( !playingNote && sequencer.looping ) {
            dequeueEvent( sequencer, event, nextNoteTime + seq.length ); // or measure length minus event pos??
            return;
        }
        */
        while ( playingNote ) {
            if ( playingNote.data.id !== event.id ) {
                dequeueEvent( sequencer, playingNote.data, nextNoteTime );
            }
            playingNote.remove();
            playingNote = queue.tail;
        }
    }

    // noteOn events are pushed in a queue to be dequeued when a new noteOn/noteOff
    // event is enqueued for this events channel. Non-noteOn events are immediately
    // dequeued after a single sequencer tick/step (the length of a module parameter
    // automation glide)

    if ( isNoteOn ) {
        queue.add( event );
    } else {
        dequeueEvent( sequencer, event, nextNoteTime + seq.mpLength );
    }
}

/**
 * dequeue event for stopping its playback by the AudioService
 */
function dequeueEvent( state: SequencerState, event: EffluxAudioEvent, time: number ): void {
    // unset the playing state of the event at the moment it is killed (though
    // it's release cycle is started, we can consider the event eligible for
    // a playback retrigger...

    // ------------- from efc58fc188d5b3e137f709c6cef3d0a04fff3f7c
    // we'd like to use AudioService.noteOff(event, time) scheduled at the right note off time
    // without using a timer in dequeueEvent(), but we suffer from stability issues
    const clock = createTimer( getAudioContext(), time, () => {
        event.seq.playing = false;

        noteOff( event );
        freeHandler( state, clock ); // clear reference to this timed event
    });

    // store reference to prevent garbage collection prior to callback execution, this
    // seems unnecessary but is actually necessary to guarantee stability under Safari (!)
    state.queueHandlers.push( clock );
    // noteOff(event, time);
    // E.O. efc58fc188d5b3e137f709c6cef3d0a04fff3f7c -------------
}

/**
 * free reference to given "clock" (makes it eligible for garbage collection)
 */
function freeHandler( state: SequencerState, node: OscillatorNode ): void {
    node.disconnect();
    node.onended = null;

    const i = state.queueHandlers.indexOf( node );
    if ( i !== -1 ) {
        state.queueHandlers.splice( i, 1 );
    }
}

function collect( store: Store<EffluxState> ): void {
    const state: SequencerState = store.state.sequencer;
    const audioContext: BaseAudioContext = getAudioContext();

    // adapted from http://www.html5rocks.com/en/tutorials/audio/scheduling/
    // and extended to work for multi timbral sequencing
    const sequenceEvents = !( state.recording && Metronome.countIn && !Metronome.countInComplete );
    let i, channel, channelStep, event, seq, compareTime;

    const { activeOrderIndex } = state;

    if ( !state.channels ) {
        return;
    }

    while ( state.nextNoteTime < ( audioContext.currentTime + state.scheduleAheadTime )) {
        if ( sequenceEvents ) {
            compareTime = state.nextNoteTime - state.measureStartTime;
            i = state.channels!.length;

            while ( i-- ) {
                channel     = state.channels![ i ];
                channelStep = channel.length;

                while ( channelStep-- ) {
                    event = channel[ channelStep ];

                    // empty slots, recording events or events outside of the current measure can be ignored
                    if ( !event || event.recording ) {
                        continue;
                    }
                    seq = event.seq;

                    if ( seq.playing ) {
                        continue; // so can playing events
                    }

                    // event playback is triggered when its duration is within the current sequencer position range

                    if ( compareTime >= seq.startMeasureOffset &&
                         compareTime < ( seq.startMeasureOffset + seq.length ))
                    {
                        enqueueEvent( store, event, i, activeOrderIndex );
                    }
                }
            }
        }
        if ( Metronome.enabled.value ) {
            Metronome.play( 2, state.currentStep, state.stepPrecision, state.nextNoteTime, audioContext );
        }
        // advance to next step position
        step( store );
    }
}

/**
 * advances the currently active step of the pattern
 * onto the next, when the end of pattern has been reached, the
 * pattern will either loop or we the Sequencer will progress onto the next pattern
 */
function step( store: Store<EffluxState> ): void {
    const activeSong = store.state.song.activeSong;
    const state      = store.state.sequencer;
    
    // Advance current note and time by the given subdivision...
    state.nextNoteTime += (( 60 / activeSong.meta.tempo ) * 4 ) / state.stepPrecision;

    // advance the beat number, wrap to zero when start of next bar is enqueued

    const currentStep = state.currentStep + 1;
    if ( currentStep === state.stepPrecision ) {
        store.commit( "setCurrentStep", 0 );

        if ( activeSong.type === EffluxSongType.JAM ) {
            let sync = false;
            for ( const channel of state.jam ) {
                if ( channel.playingPatternIndex !== channel.nextPatternIndex ) {
                    channel.playingPatternIndex = channel.nextPatternIndex;
                    sync = true;
                }
            }
            if ( sync ) {
                cacheActivePatternChannels( state, activeSong );
                console.info('synced pattern indices');
            }
        }

        let sync = true;
        const nextOrderIndex = state.activeOrderIndex + 1;
        const maxOrderIndex  = activeSong.order.length - 1;
    
        // for non-JAM songs, advance/update the measure only when the Sequencer isn't looping
        if ( !state.looping && activeSong.type !== EffluxSongType.JAM ) {
            if ( nextOrderIndex > maxOrderIndex ) {
                // last measure reached, jump back to first
                store.commit( "gotoPattern", { orderIndex: 0, song: activeSong });

                // stop playing if we're recording output

                if ( isRecording() ) {
                    store.commit( "setPlaying", false );
                    return;
                }
            } else {
                store.commit( "gotoNextPattern", activeSong );
                sync = false; // gotoNextPattern already syncs
            }
        }
        if ( sync ) {
            syncPositionToSequencerUpdate( state, activeSong, state.activeOrderIndex );
        }

        if ( state.recording ) {

            // one bar metronome count in ?

            if ( Metronome.countIn && !Metronome.countInComplete ) {

                Metronome.enabled.value     = Metronome.restore;
                Metronome.countInComplete   = true;
                state.firstMeasureStartTime = getAudioContext().currentTime;

                store.commit( "gotoPattern", { orderIndex: 0, song: activeSong });
                return;
            }
        }
    } else {
        store.commit( "setCurrentStep", currentStep );
    }
}

function syncPositionToSequencerUpdate( state: SequencerState, activeSong: EffluxSong, orderIndex: number ): void {
    setPosition( state, { activeSong, orderIndex, currentTime: state.nextNoteTime });
}

function cacheActivePatternChannels( state: SequencerState, activeSong: EffluxSong ): void {
    const { activeOrderIndex, activePatternIndex } = state;

    // a jam song allows each individual channel to be playing back at a different pattern index
    const isJam = activeSong.type === EffluxSongType.JAM;

    if ( isJam ) {
        const channels: EffluxChannel[] = [];
        for ( let channelIndex = 0, cl = state.jam.length; channelIndex < cl; ++channelIndex ) {
            const { playingPatternIndex } = state.jam[ channelIndex ];
            channels.push( activeSong.patterns[ playingPatternIndex ].channels[ channelIndex ]);
        }
        state.channels = channels;

        console.info("-- caching them channels", channels)
    } else {
        state.channels = activeSong.patterns[ activePatternIndex ].channels;
    }

    for ( let channelIndex = 0, l = state.channels!.length; channelIndex < l; ++channelIndex ) {
        // as jams don't use orders, the order and pattern index is always the same
        const orderIndex = isJam ? state.jam[ channelIndex ].playingPatternIndex : activeOrderIndex;
        for ( const event of state.channels![ channelIndex ] ) {
            if ( event ) {
                event.seq.length = getEventLength( event, channelIndex, orderIndex, activeSong );
            }
        }
    }
}

/**
 * set the sequencers position to given target pattern and optional offset defined by currentTime
 *
 * @param {Object} state sequencer Vuex store module
 * @param {Object} activeSong
 * @param {number} orderIndex
 * @param {number=} currentTime optional time to sync given pattern to
 *        this will default to the currentTime of the AudioContext for instant enqueuing
 */
function setPosition( state: SequencerState, { activeSong, orderIndex, currentTime }:
    { activeSong: EffluxSong, orderIndex: number, currentTime?: number }) {

    if ( orderIndex >= activeSong.order.length ) {
        orderIndex = activeSong.order.length - 1;
    }

    if ( state.activeOrderIndex !== orderIndex || ( !state.channels && state.playing )) {
        state.activeOrderIndex   = orderIndex;
        state.activePatternIndex = activeSong.order[ orderIndex ];    
        state.currentStep = 0;

        // We need to cache the durations of all events, by doing it for the currently playing pattern we can read
        // this value in the collect() phase. As the song order list can reuse patterns (and thus events) we cannot
        // cache this at the event level as depending on the subsequent pattern the event duration can differ.

        cacheActivePatternChannels( state, activeSong );
    }

    if ( typeof currentTime !== "number" ) {
        currentTime = getAudioContext()?.currentTime || 0;
    }
    state.nextNoteTime          = currentTime!;
    state.measureStartTime      = currentTime!;
    state.firstMeasureStartTime = currentTime! - ( orderIndex * ( 60.0 / activeSong.meta.tempo * state.beatAmount ));

    // when going to the first measure after having reached the end of the song, stop playing
    // all currently sounding notes (that were enqueued after the first measure, in case we
    // are looping the first measure or the song is only one measure in length)

    if ( orderIndex === 0 ) {
        state.channelQueue.forEach(( list: LinkedList ): void => {
            let playingNote = list.tail;
            while ( playingNote ) {
                const nextNote = playingNote.previous;
                if ( playingNote.data.seq.startMeasure !== 0 ) {
                    dequeueEvent( state, playingNote.data, currentTime! );
                    playingNote.data.seq.playing = false;
                    playingNote.remove();
                }
                playingNote = nextNote;
            }
        });
    }
}

/* store */

const SequencerModule: Module<SequencerState, any> = {
    state: createSequencerState(),
    getters: {
        isPlaying( state: SequencerState ): boolean {
            return state.playing;
        },
        isLooping( state: SequencerState ): boolean {
            return state.looping;
        },
        isRecording( state: SequencerState ): boolean {
            return state.recording;
        },
        // @ts-expect-error 'state' is declared but its value is never read.
        isMetronomeEnabled( state: SequencerState ): boolean {
            return Metronome.enabled.value;
        },
        activeOrderIndex( state: SequencerState ): number {
            return state.activeOrderIndex;
        },
        activePatternIndex( state: SequencerState ): number {
            return state.activePatternIndex;
        },
        amountOfSteps( state: SequencerState, rootGetters: any ): number {
            return rootGetters.activeSong.patterns[ state.activePatternIndex ].steps;
        },
    },
    mutations: {
        setPlaying( state: SequencerState, isPlaying: boolean ): void {
            const currentState = state.playing;
            state.playing = !!isPlaying;
            if ( state.playing === currentState ) {
                return;
            }
            if ( state.playing ) {
                if ( state.recording && Metronome.countIn ) {
                    Metronome.countInComplete = false;
                    Metronome.enabled.value   = true;
                }
                state.currentStep = 0;  // always start from beginning
                worker.postMessage({
                    cmd: "start",
                    interval: ( state.scheduleAheadTime * 1000 ) / 4
                });
            } else {
                worker.postMessage({ cmd : "stop" });
                while ( state.queueHandlers.length ) {
                    freeHandler( state, state.queueHandlers[ 0 ]);
                }
                state.channelQueue.forEach( list => list.flush());
                state.channels = undefined;
            }
            togglePlayback( state.playing );
        },
        setLooping( state: SequencerState, isLooping: boolean ): void {
            state.looping = !!isLooping;
        },
        setRecording( state: SequencerState, isRecording: boolean ): void {
            state.recording = !!isRecording;
        },
        setActiveOrderIndex( state: SequencerState, value: number ): void {
            state.activeOrderIndex = value;
        },
        setActivePatternIndex( state: SequencerState, value: number ): void {
            state.activePatternIndex = value;
        },
        gotoPattern( state: SequencerState, { orderIndex, song } : { orderIndex: number, song: EffluxSong }): void {
            syncPositionToSequencerUpdate( state, song, orderIndex );
        },
        gotoPreviousPattern( state: SequencerState, activeSong: EffluxSong ): void {
            let { activeOrderIndex, activePatternIndex } = state;
            if ( activeOrderIndex > 0 ) {
                activeOrderIndex   = activeOrderIndex - 1;
                activePatternIndex = activeSong.order[ activeOrderIndex ];  
            }
            if ( state.playing ) {
                syncPositionToSequencerUpdate( state, activeSong, activeOrderIndex );
            } else {
                state.currentStep = 0;
                state.activeOrderIndex   = activeOrderIndex;
                state.activePatternIndex = activePatternIndex; 
            }
        },
        gotoNextPattern( state: SequencerState, activeSong: EffluxSong ): void {
            let { activeOrderIndex, activePatternIndex } = state;
            const max = activeSong.order.length - 1;
            if ( activeOrderIndex < max ) {
                activeOrderIndex   = state.activeOrderIndex + 1;
                activePatternIndex = activeSong.order[ activeOrderIndex ];  
            }
            if ( state.playing ) {
                syncPositionToSequencerUpdate( state, activeSong, activeOrderIndex );
            } else {
                state.currentStep = 0;
                state.activeOrderIndex   = activeOrderIndex;
                state.activePatternIndex = activePatternIndex; 
            }
        },
        setCurrentStep( state: SequencerState, step: number ): void {
            state.currentStep = step;
        },
        // @ts-expect-error 'state' is declared but its value is never read.
        setPatternSteps( state: SequencerState, { pattern, steps }: { pattern: EffluxPattern, steps: number }): void {
            const oldAmount = pattern.steps;
            pattern.channels.forEach(( channel: EffluxChannel, index: number ): void => {
                const transformed: EffluxChannel = new Array( steps );
                let i, j, increment;

                // ensure that the Array contains non-empty values
                for ( i = 0; i < steps; ++i ) {
                    // @ts-expect-error using 0 as falsy value to specify this channel slot is empty
                    transformed[ i ] = 0;
                }

                if ( steps < oldAmount ) {
                    // reducing resolution, e.g. changing from 32 to 16 steps
                    increment = oldAmount / steps;
                    for ( i = 0, j = 0; i < steps; ++i, j += increment ) {
                       transformed[ i ] = channel[ j ];
                    }
                } else {
                    // increasing resolution, e.g. changing from 16 to 32 steps
                    increment = steps / oldAmount;
                    for ( i = 0, j = 0; i < oldAmount; ++i, j += increment ) {
                       transformed[ j ] = channel[ i ];
                    }
                }
                Vue.set( pattern.channels, index, transformed );
                Vue.set( pattern, "steps", steps );
            });
        },
        setJamPattern( state: SequencerState, { instrumentIndex, patternIndex }: { instrumentIndex: number, patternIndex: number }): void {
            const nextPatternIndex = patternIndex;
            let { playingPatternIndex } = state.jam[ instrumentIndex ];
            if ( !state.playing ) {
                playingPatternIndex = nextPatternIndex;
            }
            Vue.set( state.jam, instrumentIndex, { playingPatternIndex, nextPatternIndex });
        },
        // @ts-expect-error 'state' is declared but its value is never read.
        setMetronomeEnabled( state: SequencerState, enabled: boolean ): void {
            Metronome.enabled.value = !!enabled;
        },
        invalidateChannelCache( state: SequencerState, { song, orderIndex }: { song: EffluxSong, orderIndex?: number }): void {
            const compareIndex = orderIndex ?? state.activeOrderIndex;
            if ( !state.playing || state.activeOrderIndex !== compareIndex ) {
                return; // cache will be invalidated by sequencers position update
            }
            cacheActivePatternChannels( state, song );
        },
        setPosition,
    },
    actions: {
        prepareSequencer({ state }: { state: SequencerState }, rootStore: Store<EffluxState> ): Promise<void> {
            return new Promise( resolve => {
                for ( let i = 0; i < state.jam.length; ++i ) {
                    state.jam[ i ] = { playingPatternIndex: 0, nextPatternIndex: 0 };
                }

                // create LinkedLists to store all currently playing events for all channels

                for ( let i = 0; i < state.channelQueue.length; ++i ) {
                    state.channelQueue[ i ] = state.channelQueue[ i ] ?? new LinkedList();
                }

                // spawn Worker to handle the intervallic polling
                
                worker = worker || new SequencerWorker();
                worker.onmessage = ({ data }) => {
                    if ( data.cmd === "collect" && state.playing ) {
                        collect( rootStore );
                    }
                };
                resolve();
            });
        },
    }
};
export default SequencerModule;
