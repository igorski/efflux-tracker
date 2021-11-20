/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021 - https://www.igorski.nl
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
                <span>{{ sample.name }}</span>
                <span>{{ $t( "totalDuration", { duration: meta.totalDuration }) }}</span>
                <span>{{ $t( "sampleRate", { sampleRate: meta.sampleRate }) }}</span>
                <span>{{ $t( "channelAmount", { amount: meta.amountOfChannels }) }}</span>
            </div>
            <hr class="divider section-divider" />
            <div class="waveform-display">
                <sample-display
                    :sample="sample"
                    ref="waveformDisplay"
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
                    class="waveform-display__range"
                    :style="rangeStyle"
                ></div>
            </div>
            <hr class="divider" />
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
                <button
                    type="button"
                    class="transport-controls__button"
                    :class="{ active: loopPlayback && !isBusy }"
                    :title="$t('loop')"
                    :disabled="isBusy"
                    @click="loopPlayback = !loopPlayback"
                >
                    <i class="icon-loop" :class="{ active: loopPlayback && !isBusy }"></i>
                </button>
            </div>
            <div class="range-controls">
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
                <div class="toggle-control">
                    <label v-t="'repitch'"></label>
                    <toggle-button
                        v-model="sample.repitch"
                        sync
                    />
                </div>
                <!-- <span>{{ $t( "totalDuration", { duration: meta.duration }) }}</span> -->
            </div>
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

<script>
import { mapGetters, mapMutations } from "vuex";
import AudioEncoder from "audio-encoder";
import FileLoader from "@/components/file-loader/file-loader";
import ManualURLs from "@/definitions/manual-urls";
import SampleDisplay from "@/components/sample-display/sample-display";
import SampleRecorder from "@/components/sample-recorder/sample-recorder";
import SelectBox from "@/components/forms/select-box";
import { ToggleButton } from "vue-js-toggle-button";
import { getAudioContext } from "@/services/audio-service";
import { loadSample } from "@/services/audio/sample-loader";
import { createPitchAnalyser, detectPitch, getPitchByFrequency } from "@/services/audio/pitch"
import { sliceBuffer } from "@/utils/sample-util";

import messages from "./messages.json";

const rangeToPosition = ( rangeValue, length ) => length * ( rangeValue / 100 );

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
        loopPlayback   : false,
        encodeProgress : 0,
        isBusy         : false,
        // playback range (in percentile range)
        sampleStart : 0,
        sampleEnd   : 100
    }),
    computed: {
        ...mapGetters([
            "currentSample",
            "samples",
        ]),
        availableSamples() {
            return this.samples.map(({ name }) => ({ label: name, value: name }));
        },
        selectedSample: {
            get() {
                return this.currentSample?.name;
            },
            set( name ) {
                this.setCurrentSample( this.samples.find( sample => sample.name === name ));
            }
        },
        hasAltRange() {
            return this.sampleStart !== 0 || this.sampleEnd !== 100;
        },
        rangeStyle() {
            return {
                left  : `${this.sampleStart}%`,
                right : `${this.sampleEnd}%`,
                width : `${this.sampleEnd - this.sampleStart}%`
            };
        },
        canTrim() {
            return this.sample?.buffer?.sampleRate === 44100; // TODO only 44.1 kHz supported.
        },
        meta() {
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
            handler( value, oldValue ) {
                if ( !oldValue || !value || value.name !== oldValue.name ) {
                    this.sample = value ? { ...value } : null;
                    this.stopPlayback();

                    if ( !value ) {
                        return;
                    }
                    // convert ranges to percentile (for range controls)
                    const ratio = 100 / value.buffer.duration;
                    this.sampleStart = value.rangeStart * ratio;
                    this.sampleEnd   = value.rangeEnd * ratio;
                }
            }
        },
        loopPlayback( value ) {
            if ( this.playbackNode ) {
                this.playbackNode.loop = value;
            }
        },
        sampleStart( value ) {
            if ( value > this.sampleEnd ) {
                this.sampleEnd = Math.min( 100, value + 1 );
            }
            this.invalidateRange();
        },
        sampleEnd( value ) {
            if ( value < this.sampleStart ) {
                this.sampleStart = Math.max( 0, value - 1 );
            }
            this.invalidateRange();
        },
    },
    created() {
        if ( !this.sample && this.samples.length ) {
             this.setCurrentSample( this.samples[ 0 ]);
        }
    },
    beforeDestroy() {
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
            "updateSample",
        ]),
        openHelp() {
            window.open( ManualURLs.SAMPLE_EDITOR_HELP, "_blank" );
        },
        deleteSample() {
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
        startPlayback( muted = false ) {
            if ( this.playbackNode ) {
                this.stopPlayback();
            }
            this.playbackNode = getAudioContext().createBufferSource();
            this.playbackNode.buffer = this.sliceBufferForRange();
            this.playbackNode.addEventListener( "ended", event => {
                this.isPlaying = this.playbackNode && event.target !== this.playbackNode;
            });
            this.playbackNode.loop = this.loopPlayback;
            if ( !muted ) {
                this.playbackNode.connect( getAudioContext().destination );
            }
            this.playbackNode.start();
            this.isPlaying = true;
        },
        stopPlayback() {
            this.playbackNode?.disconnect();
            this.playbackNode?.stop();
            this.playbackNode = null;
            this.isPlaying = false;
        },
        /* saving sample, after performing pitch analysis */
        commitChanges() {
            this.isBusy = true;
            this.stopPlayback();
            const wasLooping = this.loopPlayback;

            this.openDialog({
                title       : this.$t( "pleaseWait" ),
                message     : this.$t( "analysingPitch" ),
                hideActions : true,
            });
            this.setBlindActive( true );

            this.loopPlayback = true;
            this.pitches = [];
            this.startPlayback( true );

            this.pitchAnalyser  = createPitchAnalyser( this.playbackNode, getAudioContext() );
            this.pitchFn        = this.detectCurrentPitch.bind( this );
            this.detectCurrentPitch();

            setTimeout(() => {
                this.stopPlayback();
                this.loopPlayback = wasLooping;

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

                const sample = {
                    ...this.sample,
                    pitch : { frequency, note, octave, cents },
                    rangeStart : ( this.sampleStart / 100 ) * this.sample.buffer.duration,
                    rangeEnd   : ( this.sampleEnd / 100 ) * this.sample.buffer.duration
                };
                this.updateSample( sample );
                this.cacheSample( sample );
                this.closeDialog();
                this.showNotification({
                    message : this.$t( "savedDominantPitch", { note, octave } )
                });
                this.isBusy = false;
            }, 2000 );
        },
        detectCurrentPitch() {
            const pitch = detectPitch( this.pitchAnalyser, getAudioContext() );
            if ( pitch ) {
                this.pitches.push( pitch );
            }
            this.pitchRaf = window.requestAnimationFrame( this.pitchFn );
        },
        /* range handling */
        handleDragStart( event ) {
            const offsetX = event.type.startsWith( "touch" ) ? event.touches[ 0 ].pageX : event.offsetX;
            this.isDragging = true;

            const waveformBounds = this.$refs.waveformDisplay.$el.getBoundingClientRect();

            this.dragWidth    = waveformBounds.width;
            this.dragRatio    = this.dragWidth / 100;
            this.startOffsetX = offsetX;
            this.dragSS       = this.sampleStart;
            this.dragSE       = this.sampleEnd;
        },
        handleDragEnd() {
            this.isDragging = false;
        },
        handleDragMove( event ) {
            if ( !this.isDragging ) {
                return;
            }
            const offsetX = event.type.startsWith( "touch" ) ? event.touches[ 0 ].pageX : event.offsetX;
            const delta = offsetX - this.startOffsetX;

            this.sampleStart = Math.max( 0, Math.min( 100, this.dragSS + ( delta / this.dragRatio ) ));
            this.sampleEnd   = Math.max( 0, Math.min( 100, this.dragSE + ( delta / this.dragRatio ) ));
        },
        /* other */
        sliceBufferForRange() {
            return sliceBuffer(
                getAudioContext(), this.sample.buffer,
                rangeToPosition( this.sampleStart, this.sample.buffer.duration ),
                rangeToPosition( this.sampleEnd,   this.sample.buffer.duration )
            )
        },
        trimSample() {
            this.isBusy = true;
            this.openDialog({
                title       : this.$t( "pleaseWait" ),
                message     : this.$t( "trimmingSample" ),
                hideActions : true,
            });
            let buffer = this.sliceBufferForRange();
            AudioEncoder( buffer, 192, progress => {
                this.encodeProgress = progress;
            }, async blob => {
                // we generate the buffer again as the encoded file might
                // have slightly different sample lengths (otherwise rangeEnd
                // will not be 100 % upon opening this saved sample once more)
                buffer = await loadSample( blob, getAudioContext() );
                const sample = {
                    ...this.sample,
                    source     : blob,
                    buffer,
                    rangeStart : 0,
                    rangeEnd   : buffer.duration,
                    rate       : buffer.sampleRate,
                    length     : buffer.duration
                };
                this.updateSample( sample );
                this.sampleStart = 0;
                this.sampleEnd   = 100;
                this.sample = sample;

                this.closeDialog();
                this.isBusy = false;
            });
        },
        invalidateRange() {
            if ( this.isPlaying ) {
                this.startPlayback();
            }
        },
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";
@import "@/styles/forms";
@import "@/styles/transporter";

$width: 720px;

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
            padding: $spacing-small $spacing-medium;
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
    padding: $spacing-small $spacing-medium;
    @include toolFont();

    span {
        margin-right: $spacing-medium;
    }
}

.sample-select {
    width: 180px;
}

.transport-controls {
    display: inline-block;
    padding: $spacing-xsmall 0 0 $spacing-medium;

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
    display: inline-block;
    margin: 0 $spacing-small;
    vertical-align: middle;

    .range-control {
        @include toolFont();
        display: inline;
        margin-right: $spacing-small;

        label, input {
            vertical-align: middle;
            width: auto;
            display: inline;
        }
    }
}

.toggle-control {
    @include toolFont();
    display: inline;

    label {
        margin-right: $spacing-small;
    }
}

.progress {
    @include toolFont();
}

.waveform-display {
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
