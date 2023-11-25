/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2023 - https://www.igorski.nl
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
                    v-t="'delete'"
                    type="button"
                    :disabled="!sample || isBusy"
                    @click="deleteSample()"
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
import { ToggleButton } from "vue-js-toggle-button";
import { mapGetters, mapMutations, mapActions } from "vuex";
import FileLoader from "@/components/file-loader/file-loader.vue";
import ManualURLs from "@/definitions/manual-urls";
import SampleDisplay from "@/components/sample-display/sample-display.vue";
import SampleRecorder from "@/components/sample-recorder/sample-recorder.vue";
import SelectBox from "@/components/forms/select-box.vue";
import { type Sample, PlaybackType } from "@/model/types/sample";
import { getAudioContext } from "@/services/audio-service";
import { createAnalyser, detectPitch } from "@/services/audio/analyser";
import { loadSample } from "@/services/audio/sample-loader";
import { getPitchByFrequency } from "@/services/audio/pitch";
import { sliceBuffer } from "@/utils/sample-util";
import { mapTransients } from "@/utils/transient-detector";

import messages from "./messages.json";

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
            return !this.canSlice && this.sample?.buffer?.sampleRate === 44100; // TODO currently only 44.1 kHz supported.
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
    beforeDestroy(): void {
        this.stopPlayback();
    },
    methods: {
        ...mapMutations([
            "cacheSample",
            "closeDialog",
            "openDialog",
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
                    this.setCurrentSample( this.samples[ 0 ]);
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
        commitChanges(): void {
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
                this.updateSampleProps( sample );
                this.showNotification({
                    message : this.$t( "savedChanges", { sample: sample.name })
                });
                return;
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

            this.pitchAnalyser  = createAnalyser( this.playbackNode, getAudioContext() );
            this.pitchFn        = this.detectCurrentPitch.bind( this );
            this.detectCurrentPitch();

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
            }, 2000 );
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
            if ( !this.canTrim ) {
                return;
            }
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
        trimSample(): void {
            this.isBusy = true;
            this.openDialog({
                title       : this.$t( "pleaseWait" ),
                message     : this.$t( "trimmingSample" ),
                hideActions : true,
            });
            const hadPitch = this.hasPitch; // needs no recalculation after trim
            let buffer = this.sliceBufferForRange();
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
@import "@/styles/_mixins";
@import "@/styles/forms";
@import "@/styles/transporter";

$width: 760px;

.sample-editor {
    @include editorComponent();
    @include overlay();
    height: auto;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);

    @include minWidth( $width ) {
        width: $width;
    }

    @include minWidthFallback( $width ) {
        width: 100%;
        height: 100%;
        @include verticalScrollOnMobile();
    }

    .header h2 {
        padding: 0 $spacing-medium;
    }

    .actions {
        @include large() {
            position: absolute;
            top: $action-button-top;
            right: #{$spacing-xlarge * 2 - $spacing-xsmall};
        }
        @include mobile() {
            margin: $spacing-small #{$spacing-medium - $spacing-xxsmall};
        }
    }

    .section-divider {
        margin-top: $spacing-small;
    }

    .footer {
        @include minWidth( $width ) {
            display: flex;
            justify-content: space-between;
            padding: $spacing-small $spacing-medium $spacing-xsmall;
        }

        @include minWidthFallback( $width ) {
            button {
                margin-top: $spacing-small;
            }
        }

        .file-loader {
            display: inline;
        }
    }
}

.no-samples {
    height: $sampleWaveformHeight;
    padding: 0 $spacing-medium;
    @include boxSize();
}

.sample-meta {
    padding: $spacing-xxsmall $spacing-medium;
    @include toolFont();

    span {
        margin-right: $spacing-medium;
    }

    &__edit-button {
        padding: $spacing-small;
        margin-right: #{$spacing-small + $spacing-xsmall};
    }
}

.sample-select {
    width: 180px;
}

.sample-control-list {
    @include large() {
        display: flex;
        flex-direction: row;
        padding: 0 $spacing-medium;
        justify-content: space-between;
        align-items: center;
    }
}

.transport-controls {
    padding: $spacing-xsmall 0 0 0;

    .transport-controls__button {
        cursor: pointer;
        background-color: $color-background;
        border: 0;
        padding: 0;

        &:hover {
            background-color: $color-3;
        }

        &.active {
            background-color: $color-2;
        }

        i:before {
            margin: $spacing-xxsmall $spacing-xsmall;
        }
    }
}

.range-controls {
    display: flex;
    justify-content: space-around;
}

.range-control {
    @include toolFont();
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
    @include toolFont();
    display: inline;

    label {
        margin: 0 $spacing-small 0 $spacing-xxsmall;
    }
}

.playback-type-control {
    @include toolFont();
    display: inline;

    label {
        margin: 0 $spacing-medium 0 $spacing-small;
    }

    &__select {
        width: 110px;
    }
}

.progress {
    @include toolFont();
}

.sample-display {
    position: relative;
    width: 100%;
    height: $sampleWaveformHeight;

    &__range {
        @include noEvents();
        position: absolute;
        top: 0;
        height: 100%;
        border-left: 2px solid $color-1;
        border-right: 2px solid $color-1;
        background-color: $color-2;
        mix-blend-mode: difference;
    }
}
</style>
