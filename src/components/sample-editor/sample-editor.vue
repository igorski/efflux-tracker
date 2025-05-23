/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2025 - https://www.igorski.nl
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
<template>
    <div class="sample-editor">
        <sample-recorder
            v-if="recordInput"
            @close="recordInput = false"
        />
        <div class="header">
            <h2 v-t="'sampleEditor'"></h2>
            <button
                class="help-button"
                @click="openHelp()"
            >?</button>
            <button
                class="close-button"
                @click="$emit( 'close' )"
            >x</button>
            <div class="actions">
                <select-box
                    v-if="availableSamples.length"
                    v-model="selectedSample"
                    :options="availableSamples"
                    class="sample-select"
                />
            </div>
            <hr class="divider" />
        </div>
        <template v-if="sample">
            <div class="sample-meta">
                <input
                    v-if="showNameInput"
                    :value="sample.name"
                    ref="nameInput"
                    @blur="handleNameInputBlur()"
                    @keyup.enter="handleNameInputBlur()"
                />
                <span v-else>{{ $t( "sampleName", { name: sample.name }) }}</span>
                <button
                    type="button"
                    :title="$t('editName')"
                    class="sample-meta__edit-button"
                    @click="handleNameInputShow()"
                >
                    <img src="@/assets/icons/icon-pencil.svg" />
                </button>
                <span>{{ $t( "totalDuration", { duration: meta.totalDuration }) }}</span>
                <span>{{ $t( "sampleRate", { sampleRate: meta.sampleRate }) }}</span>
                <span>{{ $t( "channelAmount", { amount: meta.amountOfChannels }) }}</span>
                <span v-if="!isInUse" v-t="'notInUse'"></span>
            </div>
            <hr class="divider section-divider" />
            <div class="sample-display">
                <sample-display
                    :sample="sample"
                    ref="sampleDisplay"
                    width="740"
                    height="200"
                    @mousedown="handleDragStart"
                    @touchstart="handleDragStart"
                    @mouseup="handleDragEnd"
                    @mouseout="handleDragEnd"
                    @touchcancel="handleDragEnd"
                    @touchend="handleDragEnd"
                    @mousemove="handleDragMove"
                    @touchmove="handleDragMove"
                />
                <div
                    class="sample-display__range"
                    :style="rangeStyle"
                ></div>
                <button
                    type="button"
                    class="sample-display__delete"
                    :title="'delete'"
                    :disabled="isBusy"
                    @click="deleteSample()"
                >&times;</button>
            </div>
            <hr class="divider" />
            <section class="sample-control-list">
                <div class="transport-controls">
                    <button
                        type="button"
                        class="transport-controls__button"
                        :class="{ active: isPlaying && !isBusy }"
                        :title="$t( isPlaying && !isBusy ? 'stop' : 'play')"
                        :disabled="isBusy"
                        @click="isPlaying && !isBusy ? stopPlayback() : startPlayback()"
                    >
                        <i :class="[ isPlaying ? 'icon-stop' : 'icon-play' ]"></i>
                    </button>
                    <div class="toggle-control">
                        <label v-t="'loop'"></label>
                        <toggle-button
                            v-model="sample.loop"
                            :disabled="isBusy"
                            sync
                        />
                    </div>
                    <div class="playback-type-control">
                        <label v-t="'playbackType'"></label>
                        <select-box
                            v-model="sample.type"
                            :options="availablePlaybackTypes"
                            class="playback-type-control__select"
                        />
                    </div>
                </div>
                <div
                    v-if="hasRangeControls"
                    class="range-controls"
                >
                    <div class="range-control">
                        <label v-t="'sampleStart'"></label>
                        <input
                            type="range"
                            name="sampleStart"
                            v-model.number="sampleStart"
                            min="0"
                            max="100"
                            step="0.1"
                            :disabled="isBusy"
                        />
                    </div>
                    <div class="range-control">
                        <label v-t="'sampleEnd'"></label>
                        <input
                            type="range"
                            name="sampleEnd"
                            v-model.number="sampleEnd"
                            min="0"
                            max="100"
                            step="0.1"
                            :disabled="isBusy"
                        />
                    </div>
                    <!-- <span>{{ $t( "totalDuration", { duration: meta.duration }) }}</span> -->
                </div>
                <div
                    v-if="canSlice"
                    class="slice-controls"
                >
                    <div class="range-control">
                        <label v-t="'threshold'"></label>
                        <input
                            type="range"
                            name="threshold"
                            v-model.number="sliceThreshold"
                            min="0"
                            max="100"
                            step="0.1"
                        />
                    </div>
                    <div class="range-control">
                        <label v-t="'lowpassFreq'"></label>
                        <input
                            type="range"
                            name="lowpassFreq"
                            v-model.number="sliceFreq"
                            min="150"
                            max="1500"
                            step="1"
                        />
                    </div>
                </div>
            </section>
        </template>
        <div
            v-else-if="availableSamples.length === 0"
            class="no-samples"
        >
            <p v-t="'noSamplesDescr'"></p>
        </div>
        <hr class="divider section-divider" />
        <div class="footer">
            <div>
                <button
                    v-t="'saveChanges'"
                    type="button"
                    :disabled="!sample || isBusy"
                    @click="commitChanges()"
                ></button>
                <button
                    v-t="'createInstrument'"
                    type="button"
                    :disabled="!sample || isBusy"
                    @click="commitAndCreateInstrument()"
                ></button>
                <button
                    v-if="canTrim"
                    v-t="'trim'"
                    type="button"
                    :disabled="!sample || !hasAltRange || isBusy"
                    @click="trimSample()"
                ></button>
                <span
                    v-if="isBusy && encodeProgress"
                    class="progress"
                >{{ ( encodeProgress * 100 ).toFixed() }}</span>
            </div>
            <div>
                <button
                    type="button"
                    v-t="'record'"
                    @click="recordInput = true"
                ></button>
                <file-loader file-types="audio" class="file-loader" />
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import AudioEncoder from "audio-encoder";
import debounce from "lodash.debounce";
import ToggleButton from "@/components/third-party/vue-js-toggle-button/ToggleButton.vue";
import { mapState, mapGetters, mapMutations, mapActions } from "vuex";
import FileLoader from "@/components/file-loader/file-loader.vue";
import Actions from "@/definitions/actions";
import ManualURLs from "@/definitions/manual-urls";
import ModalWindows from "@/definitions/modal-windows";
import OscillatorTypes from "@/definitions/oscillator-types";
import SampleDisplay from "@/components/sample-display/sample-display.vue";
import SampleRecorder from "@/components/sample-recorder/sample-recorder.vue";
import SelectBox from "@/components/forms/select-box.vue";
import createAction from "@/model/factories/action-factory";
import InstrumentFactory from "@/model/factories/instrument-factory";
import { type Sample, PlaybackType } from "@/model/types/sample";
import { getAudioContext } from "@/services/audio-service";
import { createAnalyser, detectPitch } from "@/services/audio/analyser";
import { loadSample } from "@/services/audio/sample-loader";
import { getPitchByFrequency } from "@/services/audio/pitch";
import { resampleBuffer, sliceBuffer } from "@/utils/sample-util";
import { mapTransients } from "@/utils/transient-detector";

import messages from "./messages.json";

const PITCH_ANALYSIS_WINDOW_SIZE = 2000; // amount of milliseconds we analyse audio for dominant pitch

const MP3_PAD_START   = 1057; // samples added at the beginning of an MP3 encoded file
const rangeToPosition = ( rangeValue, length ) => length * ( rangeValue / 100 );
const secToPctRatio   = ({ duration }) => 100 / duration;

function sanitizeRangeValue( value : number): number {
    return Math.max( 0, Math.min( 100, value ));
}

export default {
    i18n: { messages },
    components: {
        FileLoader,
        SampleDisplay,
        SampleRecorder,
        SelectBox,
        ToggleButton,
    },
    data: () => ({
        sample         : null,
        recordInput    : false,
        playbackNode   : null,
        isPlaying      : false,
        encodeProgress : 0,
        isBusy         : false,
        isInUse        : false,
        showNameInput  : false,
        hasPitch       : false,
        sliceThreshold : 20,
        sliceFreq      : 1000,
        // playback range (in percentile range)
        sampleStart : 0,
        sampleEnd   : 100
    }),
    computed: {
        ...mapState({
            selectedInstrument: state => state.editor.selectedInstrument,
        }),
        ...mapGetters([
            "activeSong",
            "currentSample",
            "samples",
        ]),
        availableSamples(): { label: string, value: string }[] {
            return this.samples.map(({ id, name }) => ({ label: name, value: id }));
        },
        availablePlaybackTypes(): { label: string, value: PlaybackType }[] {
            return [
                { label: this.$t( "default" ), value: PlaybackType.DEFAULT },
                { label: this.$t( "repitch" ), value: PlaybackType.REPITCHED },
                { label: this.$t( "sliced" ),  value: PlaybackType.SLICED },
            ];
        },
        selectedSample: {
            get(): string | undefined {
                return this.currentSample?.id;
            },
            set( id: string ): void {
                this.setCurrentSample( this.samples.find( sample => sample.id === id ));
            }
        },
        hasRangeControls(): boolean {
            return this.sample?.type !== PlaybackType.SLICED;
        },
        hasAltRange(): boolean {
            if ( !this.sample?.buffer ) {
                return false;
            }
            // if the sampleStart is at the exact MP3 padding we assume we don't have an alt range
            // (after trimming the sample, it is MP3 encoded which adds this padding)
            const paddedSamples = MP3_PAD_START / this.sample.buffer.sampleRate;
            if ( this.sampleStart === paddedSamples * secToPctRatio( this.sample.buffer )
                // guesstimate whether sample end was untouched (MP3 adds end padding as well)
                 && this.sampleEnd >= 100 - paddedSamples * secToPctRatio( this.sample.buffer ))
            {
                return false;
            }
            return this.sampleStart !== 0 || this.sampleEnd !== 100;
        },
        rangeStyle(): { left: string, right: string, width: string } {
            if ( this.canSlice ) {
                return { left: 0, right: 0, width: "100%" };
            }
            return {
                left  : `${this.sampleStart}%`,
                right : `${this.sampleEnd}%`,
                width : `${this.sampleEnd - this.sampleStart}%`
            };
        },
        canTrim(): boolean {
            return !this.canSlice;
        },
        canSlice(): boolean {
            return this.sample?.type === PlaybackType.SLICED;
        },
        meta(): { totalDuration: string, sampleRate: number, amountOfChannels: number, duration: string } {
            const { duration } = this.sample.buffer;
            return {
                totalDuration: duration.toFixed( 2 ),
                sampleRate: this.sample.buffer.sampleRate,
                amountOfChannels: this.sample.buffer.numberOfChannels,
                duration: ((( this.sampleEnd - this.sampleStart ) / 100 ) * duration ).toFixed( 2 )
            };
        },
    },
    watch: {
        currentSample: {
            immediate: true,
            handler( value: Sample, oldValue?: Sample ): void {
                if ( !oldValue || !value || value.id !== oldValue.id ) {
                    this.sample = value ? { ...value } : null;
                    this.stopPlayback();

                    if ( !value ) {
                        return;
                    }
                    // convert ranges to percentile (for range controls)
                    const ratio = secToPctRatio( value.buffer );
                    this.sampleStart = sanitizeRangeValue( value.rangeStart * ratio );
                    this.sampleEnd   = sanitizeRangeValue( value.rangeEnd * ratio );

                    if ( value.editProps ) {
                        this.sliceThreshold = value.editProps.st;
                        this.sliceFreq = value.editProps.sf;
                    }

                    this.isInUse = this.activeSong.instruments.some(({ oscillators }) =>
                        oscillators.some(({ sample }) => sample === value.name )
                    );
                    this.$nextTick(() => {
                        this.hasPitch = !!this.sample.pitch;
                    });
                }
            },
        },
        "sample.type"( type: PlaybackType, oldType?: PlaybackType ): void {
            if ( type === PlaybackType.SLICED && this.sample.slices.length === 0 ) {
                this.sliceSample();
            } else {
                this.hasPitch = !!this.sample.pitch;
            }
        },
        "sample.loop"( value: boolean ): void {
            if ( this.playbackNode ) {
                this.playbackNode.loop = value;
            }
        },
        sampleStart( value: number ): void {
            if ( value > this.sampleEnd ) {
                this.sampleEnd = Math.min( 100, value + 1 );
            }
            this.invalidateRange();
        },
        sampleEnd( value: number ): void {
            if ( value < this.sampleStart ) {
                this.sampleStart = Math.max( 0, value - 1 );
            }
            this.invalidateRange();
        },
        sliceThreshold(): void {
            this.debouncedSlice();
        },
        sliceFreq(): void {
            this.debouncedSlice();
        },
    },
    created(): void {
        if ( !this.sample && this.samples.length ) {
             this.setCurrentSample( this.samples[ 0 ]);
        }
        this.debouncedSlice = debounce( this.sliceSample.bind( this ), 50 );
    },
    beforeUnmount(): void {
        this.stopPlayback();
    },
    methods: {
        ...mapMutations([
            "cacheSample",
            "closeDialog",
            "openDialog",
            "openModal",
            "removeSample",
            "removeSampleFromCache",
            "setBlindActive",
            "setCurrentSample",
            "showNotification",
            "suspendKeyboardService",
            "updateOscillator",
            "updateSongSample",
        ]),
        ...mapActions([
            "updateSampleProps",
        ]),
        openHelp(): void {
            window.open( ManualURLs.SAMPLE_EDITOR, "_blank" );
        },
        deleteSample(): void {
            this.openDialog({
                type    : "confirm",
                message : this.$t( "deleteConfirmDescr" ),
                confirm : () => {
                    this.removeSampleFromCache( this.sample );
                    this.removeSample( this.sample );
                    if ( this.samples.length ) {
                        this.setCurrentSample( this.samples[ 0 ]);
                    }
                }
            });
        },
        /* sample auditioning */
        startPlayback( muted = false ): void {
            if ( this.playbackNode ) {
                this.stopPlayback();
            }
            this.playbackNode = getAudioContext().createBufferSource();
            this.playbackNode.buffer = this.canSlice ? this.sample.buffer : this.sliceBufferForRange();
            this.playbackNode.addEventListener( "ended", event => {
                this.isPlaying = this.playbackNode && event.target !== this.playbackNode;
            });
            this.playbackNode.loop = this.sample.loop;
            if ( !muted ) {
                this.playbackNode.connect( getAudioContext().destination );
            }
            this.playbackNode.start();
            this.isPlaying = true;
        },
        stopPlayback(): void {
            this.playbackNode?.disconnect();
            this.playbackNode?.stop();
            this.playbackNode = null;
            this.isPlaying = false;
        },
        /* saving sample, after performing pitch analysis, when required */
        async commitChanges(): Promise<Sample> {
            const sample = {
                ...this.sample,
                rangeStart : ( this.sampleStart / 100 ) * this.sample.buffer.duration,
                rangeEnd   : ( this.sampleEnd / 100 ) * this.sample.buffer.duration,
                editProps: {
                    st: this.sliceThreshold,
                    sf: this.sliceFreq,
                },
            };
            // if no pitch changes need to be calculated (e.g. isn't repitched type or already has pitch)
            if ( sample.type !== PlaybackType.REPITCHED || this.hasPitch ) {
                const updatedSample = await this.updateSampleProps( sample );
                this.showNotification({
                    message : this.$t( "savedChanges", { sample: updatedSample.name })
                });
                return updatedSample;
            }
            this.isBusy = true;
            this.stopPlayback();

            this.openDialog({
                title       : this.$t( "pleaseWait" ),
                message     : this.$t( "analysingPitch" ),
                hideActions : true,
            });
            this.setBlindActive( true );

            this.pitches = [];
            this.startPlayback( true );

            this.pitchAnalyser = createAnalyser( this.playbackNode, getAudioContext() );
            this.pitchFn       = this.detectCurrentPitch.bind( this );
            this.detectCurrentPitch();

            return new Promise( resolve => {
                setTimeout(() => {
                    this.stopPlayback();

                    window.cancelAnimationFrame( this.pitchRaf );
                    this.pitchAnalyser?.disconnect();
                    this.pitchAnalyser = null;

                    // get the most occurring frequency from the signal
                    // TODO: should we round the frequencies here ?
                    const mode = arr => arr.sort(( a, b ) =>
                        arr.filter( v => v === a ).length -
                        arr.filter( v => v === b ).length
                    ).pop();

                    const frequency = mode( this.pitches );
                    const { note, octave, cents } = getPitchByFrequency( frequency );
                    this.pitches.length = 0;

                    sample.pitch = { frequency, note, octave, cents };
                    
                    this.hasPitch = true;
                    this.updateSongSample( sample );
                    this.cacheSample( sample );
                    this.closeDialog();
                    this.showNotification({
                        message : this.$t( "savedDominantPitch", { note, octave } )
                    });
                    this.isBusy = false;

                    resolve( sample );
                }, PITCH_ANALYSIS_WINDOW_SIZE );
            });
        },
        detectCurrentPitch(): void {
            const pitch = detectPitch( this.pitchAnalyser, getAudioContext() );
            if ( pitch ) {
                this.pitches.push( pitch );
            }
            this.pitchRaf = window.requestAnimationFrame( this.pitchFn );
        },
        /* range handling */
        handleDragStart( event: PointerEvent ): void {
            const offsetX = event.type.startsWith( "touch" ) ? event.touches[ 0 ].pageX : event.offsetX;
            this.isDragging = true;

            const waveformBounds = this.$refs.sampleDisplay.$el.getBoundingClientRect();

            this.dragWidth    = waveformBounds.width;
            this.dragRatio    = this.dragWidth / 100;
            this.startOffsetX = offsetX;
            this.dragSS       = this.sampleStart;
            this.dragSE       = this.sampleEnd;
        },
        handleDragEnd(): void {
            this.isDragging = false;
        },
        handleDragMove( event: PointerEvent ): void {
            if ( !this.isDragging ) {
                return;
            }
            const offsetX = event.type.startsWith( "touch" ) ? event.touches[ 0 ].pageX : event.offsetX;
            const delta = offsetX - this.startOffsetX;

            this.sampleStart = sanitizeRangeValue( this.dragSS + ( delta / this.dragRatio ) );
            this.sampleEnd   = sanitizeRangeValue( this.dragSE + ( delta / this.dragRatio ) );
        },
        /* other */
        sliceBufferForRange(): AudioBuffer | null {
            return sliceBuffer(
                this.sample.buffer,
                rangeToPosition( this.sampleStart, this.sample.buffer.duration ),
                rangeToPosition( this.sampleEnd,   this.sample.buffer.duration ),
                getAudioContext(),
            );
        },
        async trimSample(): Promise<void> {
            this.isBusy = true;
            this.openDialog({
                title       : this.$t( "pleaseWait" ),
                message     : this.$t( "trimmingSample" ),
                hideActions : true,
            });
            const hadPitch = this.hasPitch; // needs no recalculation after trim
            let buffer = this.sliceBufferForRange();
            if ( this.sample.buffer.sampleRate !== 44100 ) {
                buffer = await resampleBuffer( buffer, 44100 ); // AudioEncoder supports max sample rate of 44.1 kHz
            }
            const duration = buffer.duration;
            AudioEncoder( buffer, 192, progress => {
                this.encodeProgress = progress;
            }, async blob => {
                // we generate the buffer again as the encoded file might
                // have slightly different sample lengths (otherwise rangeEnd
                // will not be 100 % upon opening this saved sample once more)
                buffer = await loadSample( blob, getAudioContext() );
                // encoded MP3 is expected to have a longer duration than the source https://lame.sourceforge.io/tech-FAQ.txt
                // we expect 1057 padded samples at the start which we set as the new range start
                const rangeStart = buffer.duration > duration ? MP3_PAD_START / buffer.sampleRate : 0;
                const sample = {
                    ...this.sample,
                    source     : blob,
                    buffer,
                    rangeStart,
                    // note we keep the original duration for the new range (MP3 also has padded samples at the end)
                    rangeEnd : Math.min( buffer.duration, rangeStart + duration ),
                    rate     : buffer.sampleRate,
                    length   : buffer.duration
                };
                this.updateSongSample( sample );
                const ratio = secToPctRatio( buffer );
                this.sampleStart = sample.rangeStart * ratio;
                this.sampleEnd   = sample.rangeEnd * ratio;
                this.sample      = sample;

                this.$nextTick(() => {
                    this.hasPitch = hadPitch;
                });
                this.closeDialog();
                this.isBusy = false;
            });
        },
        sliceSample(): void {
            this.sample.slices = mapTransients(
                this.sample.buffer,
                Math.max( 0.01, ( this.sliceThreshold / 100 ) / 2 ),
                this.sliceFreq,
            );
        },
        invalidateRange(): void {
            if ( this.isPlaying ) {
                this.startPlayback();
            }
            this.hasPitch = false; // pitch must be recalculated
        },
        async commitAndCreateInstrument(): Promise<void> {
            const sample = await this.commitChanges();
            
            const instrument = InstrumentFactory.create( this.selectedInstrument, sample.name );
            instrument.oscillators[ 0 ].waveform = OscillatorTypes.SAMPLE;
            instrument.oscillators[ 0 ].sample = sample.name;

            createAction( Actions.REPLACE_INSTRUMENT, {
                store: this.$store,
                instrument,
            });
            this.openModal( ModalWindows.INSTRUMENT_EDITOR );
        },
        async handleNameInputShow(): Promise<void> {
            this.showNameInput = true;
            await this.$nextTick();
            this.suspendKeyboardService( true );
            this.$refs.nameInput.focus();
        },
        async handleNameInputBlur(): Promise<void> {
            this.showNameInput = false;
            this.suspendKeyboardService( false );
            let name = this.$refs.nameInput.value;
            if ( name ) {
                const updatedSample = await this.updateSampleProps({ ...this.sample, name });
                this.sample.name = updatedSample.name;
            }
        },
    }
};
</script>

<style lang="scss" scoped>
@use "@/styles/_colors";
@use "@/styles/_mixins";
@use "@/styles/_variables";
@use "@/styles/forms";
@use "@/styles/transporter";
@use "@/styles/typography";

$width: 760px;

.sample-editor {
    @include mixins.editorComponent();
    @include mixins.overlay();
    height: auto;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);

    @include mixins.minWidth( $width ) {
        width: $width;
    }

    @include mixins.minWidthFallback( $width ) {
        width: 100%;
        height: 100%;
        @include mixins.verticalScrollOnMobile();
    }

    .header h2 {
        padding: 0 variables.$spacing-medium;
    }

    .actions {
        @include mixins.large() {
            position: absolute;
            top: variables.$action-button-top;
            right: #{variables.$spacing-xlarge * 2 - variables.$spacing-xsmall};
        }
        @include mixins.mobile() {
            margin: variables.$spacing-small #{variables.$spacing-medium - variables.$spacing-xxsmall};
        }
    }

    .section-divider {
        margin-top: variables.$spacing-small;
    }

    .footer {
        @include mixins.minWidth( $width ) {
            display: flex;
            justify-content: space-between;
            padding: variables.$spacing-small variables.$spacing-medium variables.$spacing-xsmall;
        }

        @include mixins.minWidthFallback( $width ) {
            button {
                margin-top: variables.$spacing-small;
            }
        }

        .file-loader {
            display: inline;
        }
    }
}

.no-samples {
    height: variables.$sample-waveform-height;
    padding: 0 variables.$spacing-medium;
    @include mixins.boxSize();
}

.sample-meta {
    padding: variables.$spacing-xxsmall variables.$spacing-medium;
    @include typography.toolFont();

    span {
        margin-right: variables.$spacing-medium;
    }

    &__edit-button {
        padding: variables.$spacing-small;
        margin-right: #{variables.$spacing-small + variables.$spacing-xsmall};
    }
}

.sample-select {
    width: 180px;
}

.sample-control-list {
    @include mixins.large() {
        display: flex;
        flex-direction: row;
        padding: 0 variables.$spacing-medium;
        justify-content: space-between;
        align-items: center;
    }
}

.transport-controls {
    padding: variables.$spacing-xsmall 0 0 0;

    .transport-controls__button {
        cursor: pointer;
        background-color: colors.$color-background;
        border: 0;
        padding: 0;

        &:hover {
            background-color: colors.$color-3;
        }

        &.active {
            background-color: colors.$color-2;
        }

        i:before {
            margin: variables.$spacing-xxsmall variables.$spacing-xsmall;
        }
    }
}

.range-controls {
    display: flex;
    justify-content: space-around;
}

.range-control {
    @include typography.toolFont();
    display: inline;

    label, input {
        vertical-align: middle;
        width: auto;
        display: inline;
    }
}

.slice-controls .range-control input {
    width: 120px;
}

.toggle-control {
    @include typography.toolFont();
    display: inline;

    label {
        margin: 0 variables.$spacing-small 0 variables.$spacing-xxsmall;
    }
}

.playback-type-control {
    @include typography.toolFont();
    display: inline;

    label {
        margin: 0 variables.$spacing-medium 0 variables.$spacing-small;
    }

    &__select {
        width: 110px;
    }
}

.progress {
    @include typography.toolFont();
}

.sample-display {
    position: relative;
    width: 100%;
    height: variables.$sample-waveform-height;

    &__range {
        @include mixins.noEvents();
        position: absolute;
        top: 0;
        height: 100%;
        border-left: 2px solid colors.$color-1;
        border-right: 2px solid colors.$color-1;
        background-color: colors.$color-2;
        mix-blend-mode: difference;
    }

    &__delete {
        position: absolute;
        top: variables.$spacing-small;
        right: variables.$spacing-xxsmall;
        font-size: 200%;
        padding: 0 variables.$spacing-small;
        outline: 2px solid #666;
        background-color: #000;
        color: #b6b6b6;

        &:hover {
            background-color: colors.$color-2;
            outline-color: #000;
            color: #000;
        }
    }
}
</style>
