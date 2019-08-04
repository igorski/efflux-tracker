/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2019 - https://www.igorski.nl
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
import Vue          from 'vue';
import AudioService from '../services/audio-service';
import EventFactory from '../model/factory/event-factory';
import EventUtil    from './event-util';

let playingNotes = {};

const InstrumentUtil =
{
    /**
     * tune given frequency to given oscillators tuning
     *
     * @public
     *
     * @param {number} frequency in Hz
     * @param {INSTRUMENT_OSCILLATOR} oscillator
     * @return {number} tuned frequency in Hz
     */
    tuneToOscillator( frequency, oscillator )
    {
        // tune event frequency to oscillator tuning

        const tmpFreq = frequency + ( frequency / 1200 * oscillator.detune ); // 1200 cents == octave
        let outFreq = tmpFreq;

        if ( oscillator.octaveShift !== 0 )
        {
            if ( oscillator.octaveShift < 0 )
                outFreq = tmpFreq / Math.abs( oscillator.octaveShift * 2 );
            else
                outFreq += ( tmpFreq * Math.abs( oscillator.octaveShift * 2 ) - 1 );
        }

        const fineShift = ( tmpFreq / 12 * Math.abs( oscillator.fineShift ));

        if ( oscillator.fineShift < 0 )
            outFreq -= fineShift;
         else
            outFreq += fineShift;

        return outFreq;
    },

    /**
     * get a buffer playback speed in the -1 to +1 range
     * for given oscillator tuning
     *
     * @param {INSTRUMENT_OSCILLATOR} oscillator
     * @return {number}
     */
    tuneBufferPlayback( oscillator )
    {
        return 1 + ( oscillator.detune / 50 );
    },

    /**
     * alter the frequency of currently playing events to match changes
     * made to the tuning of given oscillator
     *
     * @public
     *
     * @param {Array.<EVENT_OBJECT>} events
     * @param {number} oscillatorIndex
     * @param {INSTRUMENT_OSCILLATOR} oscillator
     */
    adjustEventTunings( events, oscillatorIndex, oscillator )
    {
        events.forEach(event => {

            if (!event)
                return;

            if ( event.length > oscillatorIndex ) {

                const voice     = event[ oscillatorIndex ];
                const generator = voice.generator;

                if ( generator instanceof OscillatorNode )
                    generator.frequency.value = InstrumentUtil.tuneToOscillator( voice.frequency, oscillator );

                else if ( generator instanceof AudioBufferSourceNode )
                    generator.playbackRate.value = InstrumentUtil.tuneBufferPlayback( oscillator );
            }
        });
    },

    /**
     * alter the volume of currently playing events to match changes
     * made to the volume of given oscillator
     *
     * @public
     *
     * @param {Array.<EVENT_OBJECT>} events
     * @param {number} oscillatorIndex
     * @param {INSTRUMENT_OSCILLATOR} oscillator
     */
    adjustEventVolume( events, oscillatorIndex, oscillator )
    {
        events.forEach(event => {

            if (!event)
                return;

            if ( event.length > oscillatorIndex ) {
                const voice = event[ oscillatorIndex ];
                voice.gain.gain.value = oscillator.volume;
            }
        });
    },

    /**
     * alter the wavetable of currently playing events to match
     * changes made to the waveform of given oscillator
     *
     * @public
     *
     * @param {Array.<EVENT_OBJECT>} events
     * @param {number} oscillatorIndex
     * @param {PeriodicWave} table
     */
    adjustEventWaveForms( events, oscillatorIndex, table )
    {
        if ( !( table instanceof PeriodicWave ))
            return;

        events.forEach(event => {

            if (!event)
                return;

            if ( event.length > oscillatorIndex ) {
                const generator = event[oscillatorIndex].generator;
                if (generator instanceof OscillatorNode )
                    generator.setPeriodicWave(table);
            }
        });
    },

    /**
     * @public
     *
     * @param {{ note: string, octave: number }} pitch
     * @param {INSTRUMENT} instrument to play back the note on
     * @param {boolean=} record whether to record the note into given instruments pattern list
     * @param {Object} store root Vuex store
     * @return {AUDIO_EVENT|null}
     */
    noteOn( pitch, instrument, record, store )
    {
        const id = pitchToUniqueId( pitch );

        if ( playingNotes[ id ])
            return null; // note already playing

        const audioEvent  = EventFactory.createAudioEvent( instrument.id );
        audioEvent.note   = pitch.note;
        audioEvent.octave = pitch.octave;
        audioEvent.action = 1; // noteOn

        playingNotes[ id ] = { event: audioEvent, instrument: instrument, recording: record === true };
        AudioService.noteOn(audioEvent, instrument);

        if ( record )
            recordEventIntoSong( audioEvent, store );

        return audioEvent;
    },

    /**
     * @public
     * @param {{ note: string, octave: number }} pitch
     * @param {Object} store root Vuex store
    */
    noteOff( pitch, store )
    {
        const id      = pitchToUniqueId( pitch );
        const eventVO = playingNotes[ id ];

        if ( eventVO ) {
            AudioService.noteOff(eventVO.event, eventVO.instrument);

            if ( eventVO.recording ) {
                const offEvent = EventFactory.createAudioEvent( eventVO.instrument.id );
                offEvent.action = 2; // noteOff
                recordEventIntoSong( offEvent, store );
            }
            Vue.set(eventVO.event, 'recording', false);
           // audioEvent.event.seq.playing = false;
        }
        delete playingNotes[ id ];
    }
};

export default InstrumentUtil;

/* private methods */

function pitchToUniqueId( pitch ) {
    return `${pitch.note}${pitch.octave}`;
}

function recordEventIntoSong( audioEvent, store )
{
    if ( store.state.sequencer.playing ) {

        // sequencer is playing, add event at current step

        const song          = store.state.song.activeSong;
        const activePattern = store.state.sequencer.activePattern;
        const pattern       = song.patterns[ activePattern ];
        const channel       = pattern.channels[ store.state.editor.activeInstrument ];
        const step          = Math.round( store.getters.position.step / 64 * store.getters.amountOfSteps );

        EventUtil.setPosition(
            audioEvent, pattern, activePattern, step, song.meta.tempo
        );
        audioEvent.recording = true;
        const existingEvent  = channel[ step ];

        // if an event was present at given position, retain it's module parameter actions
        if ( existingEvent )
            audioEvent.mp = { ...existingEvent.mp };

        Vue.set(channel, step, audioEvent );

        // update linked list for AudioEvents
        EventUtil.linkEvent( audioEvent, store.state.editor.activeInstrument, song, store.state.editor.eventList );
    }
    else {
        // sequencer isn't playing, add event at current editor step
        // unless it is a noteOff, let the user add it explicitly
        if ( audioEvent.action !== 2 )
            store.commit('addEventAtPosition', {
                store, event: audioEvent,
                optData: {
                    newEvent: true,
                },
            });
    }
}
