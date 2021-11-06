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
        <div class="header">
            <h2 v-t="'sampleEditor'"></h2>
            <button
                class="close-button"
                @click="$emit( 'close' )"
            >x</button>
            <div class="actions">
                <select-box
                    v-model="selectedSample"
                    :options="availableSamples"
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
                <canvas
                    ref="waveformDisplay"
                    class="waveform-display__canvas"
                    @mousedown="handleDragStart"
                    @mouseup="handleDragEnd"
                    @mouseout="handleDragEnd"
                    @mousemove="handleDragMove"
                ></canvas>
                <div
                    class="waveform-display__range"
                    :style="rangeStyle"
                >
                    <div class="waveform-display__range--background"></div>
                </div>
            </div>
            <hr class="divider" />
            <div class="transport-controls">
                <button
                    type="button"
                    class="transport-controls__button"
                    :class="{ active: isPlaying }"
                    :title="$t( isPlaying ? 'stop' : 'play')"
                    @click="isPlaying ? stopPlayback() : startPlayback()"
                >
                    <i :class="[ isPlaying ? 'icon-stop' : 'icon-play' ]"></i>
                </button>
                <button
                    type="button"
                    class="transport-controls__button"
                    :class="{ active: loopPlayback }"
                    :title="$t('loop')"
                    @click="loopPlayback = !loopPlayback"
                >
                    <i class="icon-loop" :class="{ active: loopPlayback }"></i>
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
                    />
                </div>
                <span>{{ $t( "totalDuration", { duration: meta.duration }) }}</span>
            </div>
        </template>
        <hr class="divider section-divider" />
        <div class="footer">
            <file-loader file-types="audio" />
        </div>
    </div>
</template>

<script>
import { mapGetters, mapMutations } from "vuex";
import FileLoader from "@/components/file-loader/file-loader";
import SelectBox from "@/components/forms/select-box";
import { getAudioContext } from "@/services/audio-service";
import { bufferToWaveForm, sliceBuffer } from "@/utils/sample-util";

import messages from "./messages.json";

const rangeToPosition = ( rangeValue, length ) => length * ( rangeValue / 100 );

export default {
    i18n: { messages },
    components: {
        FileLoader,
        SelectBox,
    },
    data: () => ({
        sample         : null,
        playbackNode   : null,
        isPlaying      : false,
        loopPlayback   : false,
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
        rangeStyle() {
            return {
                left  : `${this.sampleStart}%`,
                right : `${this.sampleEnd}%`,
                width : `${this.sampleEnd - this.sampleStart}%`
            };
        },
        meta() {
            return {
                totalDuration: this.sample.buffer.duration.toFixed( 2 ),
                sampleRate: this.sample.buffer.sampleRate,
                amountOfChannels: this.sample.buffer.numberOfChannels,
                duration: ((( this.sampleEnd - this.sampleStart ) / 100 ) * this.sample.duration ).toFixed( 2 )
            };
        },
    },
    watch: {
        currentSample: {
            immediate: true,
            async handler( value, oldValue ) {
                if ( !oldValue || value.name !== oldValue.name ) {
                    if ( this.sample ) {
                        this.commitChanges();
                    }
                    this.sample = value;
                    this.stopPlayback();

                    if ( !value ) {
                        return;
                    }

                    // convert ranges to percentile (for range controls)
                    const ratio = 100 / value.buffer.duration;
                    this.sampleStart = value.rangeStart * ratio;
                    this.sampleEnd   = value.rangeEnd   * ratio;

                    await this.$nextTick();
                    this.drawWaveForm( value.buffer );
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
    beforeDestroy() {
        this.commitChanges();
        this.stopPlayback();
    },
    methods: {
        ...mapMutations([
            "updateSample",
            "setCurrentSample",
        ]),
        drawWaveForm( buffer ) {
            const canvas = this.$refs.waveformDisplay;
            const ctx    = canvas.getContext( "2d" );
            ctx.imageSmoothingEnabled = false;

            const { width, height } = canvas;

            ctx.clearRect( 0, 0, width, height );
            ctx.drawImage( bufferToWaveForm( buffer, 720, 200 ), 0, 0, width, height );
        },
        /* sample auditioning */
        startPlayback() {
            if ( this.playbackNode ) {
                this.stopPlayback();
            }
            this.playbackNode         = getAudioContext().createBufferSource();
            this.playbackNode.buffer  = sliceBuffer(
                getAudioContext(), this.sample.buffer,
                rangeToPosition( this.sampleStart, this.sample.buffer.duration ),
                rangeToPosition( this.sampleEnd,   this.sample.buffer.duration )
            );
            this.playbackNode.addEventListener( "ended", event => {
                this.isPlaying = this.playbackNode && event.target !== this.playbackNode;
            });
            this.playbackNode.loop = this.loopPlayback;
            this.playbackNode.connect( getAudioContext().destination );
            this.playbackNode.start();
            this.isPlaying = true;
        },
        stopPlayback() {
            this.playbackNode?.disconnect();
            this.playbackNode?.stop();
            this.playbackNode = null;
            this.isPlaying = false;
        },
        /* range handling */
        handleDragStart({ offsetX }) {
            this.isDragging = true;

            const waveformBounds = this.$refs.waveformDisplay.getBoundingClientRect();

            this.dragWidth    = waveformBounds.width;
            this.dragRatio    = this.dragWidth / 100;
            this.startOffsetX = offsetX;
            this.dragSS       = this.sampleStart;
            this.dragSE       = this.sampleEnd;
        },
        handleDragEnd() {
            this.isDragging = false;
        },
        handleDragMove({ offsetX }) {
            if ( !this.isDragging ) {
                return;
            }
            const delta = offsetX - this.startOffsetX;

            this.sampleStart = Math.max( 0, Math.min( 100, this.dragSS + ( delta / this.dragRatio ) ));
            this.sampleEnd   = Math.max( 0, Math.min( 100, this.dragSE + ( delta / this.dragRatio ) ));
        },
        invalidateRange() {
            if ( this.isPlaying ) {
                this.startPlayback();
            }
        },
        commitChanges() {
            this.updateSample({
                ...this.sample,
                rangeStart : ( this.sampleStart / 100 ) * this.sample.buffer.duration,
                rangeEnd   : ( this.sampleEnd / 100 ) * this.sample.buffer.duration
            });
        }
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";
@import "@/styles/forms";
@import "@/styles/transporter";

$width: 720px;
$height: 430px;

.sample-editor {
    @include editorComponent();
    @include overlay();
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);

    @include componentIdeal( $width, $height ) {
        width: $width;
        height: $height;
    }

    @include componentFallback( $width, $height ) {
        width: 100%;
        height: 100%;
        @include verticalScrollOnMobile();
    }

    .header h2 {
        padding: 0 $spacing-medium;
    }

    .actions {
        position: absolute;
        top: $action-button-top;
        right: #{$spacing-xlarge + $spacing-medium};
    }

    .section-divider {
        margin-top: $spacing-small;
    }

    .footer {
        padding: $spacing-small $spacing-medium;
    }
}

.sample-meta {
    padding: $spacing-small $spacing-medium;
    @include toolFont();

    span {
        margin: 0 $spacing-small;
    }
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
    @include toolFont();
    vertical-align: middle;

    .range-control {
        display: inline;
        margin-right: $spacing-small;

        label, input {
            vertical-align: middle;
            width: auto;
            display: inline;
        }
    }
}

.waveform-display {
    position: relative;
    width: 100%;

    &__canvas {
        width: 100%;
        height: 200px;
        cursor: grab;
        background-color: $color-2;
    }

    &__range {
        @include noEvents();
        position: absolute;
        top: 0;
        height: 100%;
        border-left: 2px solid $color-1;
        border-right: 2px solid $color-1;

        &--background {
            width: 100%;
            height: 100%;
            background-color: $color-2;
            mix-blend-mode: difference;
        }
    }
}
</style>
