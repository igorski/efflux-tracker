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
    <div class="sample-recorder">
        <div class="header">
            <h2 v-t="'recordInput'"></h2>
            <button
                type="button"
                class="close-button"
                @click="close()"
            >x</button>
        </div>
        <hr class="divider" />
        <div class="ui">
            <div class="animation">
                <svg class="progress" width="200" height="200" viewPort="0 0 100 100">
                    <circle
                        class="progress__outline"
                        r="90" cx="100" cy="100" fill="transparent" stroke-dasharray="565.48" stroke-dashoffset="0"
                    ></circle>
                    <circle
                        class="progress__outline progress__outline--bar"
                        r="90" cx="100" cy="100" fill="transparent" stroke-dasharray="565.48" :stroke-dashoffset="pct"
                    ></circle>
                </svg>
                <button
                    type="button"
                    v-t="isRecording ? 'stop' : 'start'"
                    @click="isRecording ? stopRecording() : startRecording()"
                ></button>
            </div>
            <select-box
                v-model="selectedInput"
                class="input-select"
                :options="availableInputs"
                :disabled="!inputs.length"
            />
            <meter
                v-if="performAnalysis"
                :value="output"
                class="meter"
                min="-100"
                max="10"
                low="-100"
                high="-5"
                optimum="0"
            ></meter>
        </div>
    </div>
</template>

<script>
import { mapState, mapMutations } from "vuex";
import { MediaRecorder, register } from "extendable-media-recorder";
import { connect } from "extendable-media-recorder-wav-encoder";
import SampleFactory from "@/model/factories/sample-factory";
import AudioService from "@/services/audio-service";
import { createAnalyser, supportsAnalysis, getAmplitude } from "@/services/audio/analyser";
import { loadSample } from "@/services/audio/sample-loader";
import SelectBox from "@/components/forms/select-box";
import TimeUtil from "@/utils/time-util";

import messages from "./messages.json";

const C = Math.PI * 180; // 180 == twice the circle R attribute value
const MAX_DURATION = 10000;

export default {
    i18n: { messages },
    components: {
        SelectBox,
    },
    data: () => ({
        inputs: [],
        selectedInput: "0",
        pct: C,
        isRecording: false,
        output: -100,
        performAnalysis: false,
    }),
    computed: {
        ...mapState([
            "mediaConnected",
        ]),
        availableInputs() {
            return this.inputs
                .map(( input, index ) => ({ label: input.label || this.$t( "input" ), value : index.toString() }));
        },
    },
    async created() {
        try {
            // by requesting getUserMedia we trigger permission window
            await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            // once we have permission, we immediately request the available audio inputs
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.inputs = devices.filter(({ kind }) => kind === "audioinput" );
        } catch {
            this.handleError();
        }
    },
    methods: {
        ...mapMutations([
            "addSample",
            "openDialog",
            "setCurrentSample",
            "setMediaConnected",
        ]),
        async startRecording() {
            try {
                if ( !this.mediaConnected ) {
                    await register( await connect());
                    this.setMediaConnected( true );
                }

                // 1. connect input device

                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: { deviceId : this.inputs[ parseFloat( this.selectedInput )].deviceId }
                });

                // 2. prepare analyser to monitor input

                const audioContext = AudioService.getAudioContext();

                this.analyser = createAnalyser( audioContext.createMediaStreamSource( stream ), audioContext );
                this.performAnalysis = supportsAnalysis( this.analyser );
                if ( this.performAnalysis ) {
                    const sampleBuffer = new Float32Array( this.analyser.fftSize );
                    const renderLoop = () => {
                        this.output      = getAmplitude( this.analyser, sampleBuffer );
                        this.renderCycle = requestAnimationFrame( renderLoop );
                    };
                    renderLoop();
                }

                // 3. prepare media recorder to capture input

                const chunks = [];
                const mediaRecorder = new MediaRecorder( stream, { mimeType: "audio/wav" });
                mediaRecorder.addEventListener( "dataavailable", ({ data }) => {
                    if ( data.size > 0 ) {
                        chunks.push( data );
                    }
                });

                mediaRecorder.addEventListener( "stop", async () => {
                    const blob = new Blob( chunks );
                    const buffer = await loadSample( blob, audioContext );
                    const sample = SampleFactory.create( blob, buffer, TimeUtil.timestampToDate() );

                    this.addSample( sample );
                    this.setCurrentSample( sample );
                    this.close();
                });

                // 4. add recording progress listener

                const start = window.performance.now();
                const end   = start + MAX_DURATION;

                const handleProgress = now => {
                    const elapsed = ( now - start ) / MAX_DURATION;
                    this.pct = (( 1 - elapsed ) / 1 ) * C;

                    if ( !this.isRecording || now >= end ) {
                        mediaRecorder.stop();
                        stream.getTracks().forEach( track => track.stop());
                    } else {
                        window.requestAnimationFrame( handleProgress );
                    }
                };

                // 5. start recording input

                this.isRecording = true;
                mediaRecorder.start();
                handleProgress();
            } catch {
                this.handleError();
            }
        },
        stopRecording() {
            this.isRecording = false;
            if ( this.performAnalysis ) {
                cancelAnimationFrame( this.renderCycle );
                this.analyser.disconnect();
            }
        },
        handleError() {
            this.openDialog({ type: "error", message: this.$t( "errorNoDeviceAccess" ) });
            this.close();
        },
        close() {
            this.$emit( "close" );
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";
@import "@/styles/forms";

.sample-recorder {
    @include editorComponent();
    @include overlay();
    @include noSelect();
    @include boxSize();

    $width: 300px;
    $height: 325px;

    @include componentIdeal( $width, $height ) {
        width: $width;
        height: $height;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }

    @include componentFallback( $width, $height ) {
        width: 100%;
        height: 100%;
    }
}

.meter {
    position: absolute;
    transform: rotate(-90deg);
    transform-origin: 0;
    bottom: $spacing-medium;
    right: -#{$spacing-medium + $spacing-large};
    @include meter();
}

.header {
    padding: 0 $spacing-medium;
}

.ui {
    text-align: center;
}

.animation {
    position: relative;

    button {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }
}

.input-select {
    width: 200px;
    margin: $spacing-medium 0 0;
}

.progress__outline {
    transition: stroke-dashoffset 0.1s linear;
    stroke: #666;
    stroke-width: 1em;
    transform: rotate(90deg);
    transform-origin: center;

    &--bar {
        stroke: $color-2;
    }
}
</style>
