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
<template>
    <div>
        <div
            ref="canvasContainer"
            class="waveform-container"
        ><!-- x --></div>
        <button
            v-if="isSampler && editable"
            v-t="'editSample'"
            type="button"
            class="waveform-container__action-button"
            @click="openSampleEditor()"
        ></button>
    </div>
</template>

<script lang="ts">
import { Canvas, type IRenderer, type Point } from "zcanvas";
import { mapState, mapGetters, mapMutations } from "vuex";
import Config from "@/config";
import WaveformRenderer from "@/components/instrument-editor/components/waveform-renderer";
import SampleDisplay from "@/components/sample-display/sample-display.vue";
import OscillatorTypes from "@/definitions/oscillator-types";
import ModalWindows from "@/definitions/modal-windows";
import { enqueueState } from "@/model/factories/history-state-factory";
import InstrumentFactory from "@/model/factories/instrument-factory";
import SampleFactory from "@/model/factories/sample-factory";
import { type InstrumentOscillator, type Instrument } from "@/model/types/instrument";
import { type Sample } from "@/model/types/sample";
import AudioService, { applyModules, getAnalysers } from "@/services/audio-service";
import { supportsAnalysis } from "@/services/audio/analyser";
import PubSubService from "@/services/pubsub-service";
import Messages from "@/services/pubsub/messages";
import { easeIn } from "@/utils/easing";

// see colors.scss
const INSTRUMENT_COLORS = [
    "#b25050", "#b28050", "#a9b250", "#60b250", "#50b292", "#5071b2", "#8850b2", "#FF813D"
];

export default {
    emits: [ "invalidate" ],
    components: {
        SampleDisplay,
    },
    props: {
        enabled: {
            type: Boolean,
            default: true,
        },
        editable: {
            type: Boolean,
            default: true,
        },
        instrumentIndex: {
            type: Number,
            required: true,
        },
        showOscilloscope: {
            type: Boolean,
            default: true,
        },
        /**
         * should become optional (we should be able to specify whether this display is editable and
         * if not, this shouldn't matter except for displaying of the default waveform purposes)
         */
        oscillatorIndex: {
            type: Number,
            required: true,
        },
        width: {
            type: Number,
            default: Config.WAVE_TABLE_SIZE,
        },
        height: {
            type: Number,
            default: 200,
        },
        renderWaveformOnSilence: {
            type: Boolean,
            default: true,
        },
        optimizeRenderer: {
            type: Boolean,
            default: false,
        },
    },
    computed: {
        ...mapState({
            modal: state => state.modal,
        }),
        ...mapState([
            "windowSize",
        ]),
        ...mapGetters([
            "activeSong",
            "samples",
        ]),
        instrumentRef(): Instrument {
            return this.activeSong.instruments[ this.instrumentIndex ];
        },
        oscillator(): InstrumentOscillator {
            return this.instrumentRef.oscillators[ this.oscillatorIndex ];
        },
        isSampler(): boolean {
            return this.oscillator.waveform === OscillatorTypes.SAMPLE;
        },
        selectedSample(): Sample {
            const sample = this.samples.find(({ name }) => name === this.oscillator.sample );
            if ( !sample ) {
                return null;
            }
            return {
                ...sample,
                buffer: SampleFactory.getBuffer( sample, AudioService.getAudioContext() )
            };
        },
        instrumentColor(): string {
            return INSTRUMENT_COLORS[ this.instrumentIndex ];
        },
    },
    data: () => ({
        performAnalysis: false,
    }),
    watch: {
        modal( value: ModalWindows ): void {
            if ( !value && this.performAnalysis ) {
                this.connectAnalyser();
            }
        },
        windowSize: {
            immediate: true,
            handler({ width, height }): void {
                if ( this.canvas ) {
                    this.resizeWaveRenderer( width, height );
                }
            },
        },
        enabled: {
            immediate: true,
            handler( value: boolean ): void {
                if ( this.canvas ) {
                    this.canvas.setBackgroundColor( value ? "#000" : "#333" );
                    this.wfRenderer.setEnabled( value );
                }
            }
        },
        "oscillator.waveform"(): void {
            this.renderContent();
        },
        "oscillator.sample"(): void {
            this.renderContent();
        },
        oscillatorIndex(): void {
            this.renderContent();
        },
        instrumentRef(): void {
            this.wfRenderer.setColor( this.instrumentColor );
            this.handleAnalysis();
            this.renderContent();
        },
        performAnalysis( value: boolean ): void {
            if ( value ) {
                this.connectAnalyser();
            } else {
                this.disconnectAnalyser();
            }
        },
        showOscilloscope(): void {
            return this.handleAnalysis();
        },
    },
    mounted(): void {
        this.canvas = new Canvas({
            width: this.width,
            height: this.height,
            autoSize: false,
            optimize: this.optimizeRenderer ? "auto" : "none",
            backgroundColor: "#000",
            fps: 60
        });
        this.canvas.insertInPage( this.$refs.canvasContainer );
        this.canvas.getElement().className = "waveform-canvas";

        this.wfRenderer = new WaveformRenderer(
            this.canvas.getWidth(),
            this.canvas.getHeight(),
            this.handleWaveformUpdate,
            this.oscillator.enabled,
            this.instrumentColor
        );
        this.wfRenderer.setEditable( this.editable );
        this.canvas.addChild( this.wfRenderer );
        this.resizeWaveRenderer();
        this.renderContent();

        // we can only perform analysis once the audioContext is unlocked
        if ( AudioService.initialized ) {
            this.handleAnalysis();
        } else {
            this.token = PubSubService.subscribe( Messages.AUDIO_CONTEXT_READY, this.handleAnalysis.bind( this ));
        }
    },
    beforeUnmount(): void {
        if ( this.performAnalysis ) {
            this.disconnectAnalyser();
        }
        if ( this.token ) {
            PubSubService.unsubscribe( this.token );
        }
        this.canvas.dispose();
    },
    methods: {
        ...mapMutations([
            "openModal",
            "setCurrentSample",
        ]),
        resizeWaveRenderer( width = window.innerWidth ) {
            const ideal       = this.width; // equal to the length of the wave table
            const targetWidth = ( width < ideal ) ? width * 0.9: ideal;

            if ( this.canvas.getWidth() !== targetWidth ) {
                this.canvas.setDimensions( targetWidth, 200 );
                this.wfRenderer._bounds.width = targetWidth;
            }
            this.renderContent();
        },
        // invoked when drawing inside the waveform renderer
        handleWaveformUpdate( table: number[] ): void {
            // destructuring is important here as provided table is a reference which can still be updated
            const orgTable    = this.oscillator.table ? [ ...this.oscillator.table ] : 0;
            const value       = [ ...table ];
            const orgWaveform = this.oscillator.waveform;

            const store = this.$store;
            const { oscillatorIndex, instrumentIndex } = this;

            const commit = (): void => {
                const oscillator = store.getters.activeSong.instruments[ instrumentIndex ].oscillators[ oscillatorIndex ];
                store.commit( "updateOscillator", { instrumentIndex, oscillatorIndex, prop: "table", value });
                AudioService.updateOscillator( "waveform", instrumentIndex, oscillatorIndex, oscillator );
            };
            commit();

            // when drawing, force the oscillator type to transition to custom
            // and activate the oscillator (to make changes instantly audible)

            if ( this.oscillator.waveform !== OscillatorTypes.CUSTOM ) {
                store.commit( "updateOscillator", { instrumentIndex, oscillatorIndex, prop: "waveform", value: OscillatorTypes.CUSTOM });
            } else if ( !this.oscillator.enabled ) {
                store.commit( "updateOscillator", { instrumentIndex, oscillatorIndex, prop: "enabled", value: true });
            }
            this.$emit( "invalidate" );
            const component = this;

            enqueueState( `wtable_${instrumentIndex}_${oscillatorIndex}`, {
                undo(): void {
                    const oscillator = store.getters.activeSong.instruments[ instrumentIndex ].oscillators[ oscillatorIndex ];
                    store.commit( "updateOscillator", { instrumentIndex, oscillatorIndex, prop: "table", value: orgTable });
                    store.commit( "updateOscillator", { instrumentIndex, oscillatorIndex, prop: "waveform", value: orgWaveform });
                    AudioService.updateOscillator( "waveform", instrumentIndex, oscillatorIndex, oscillator );
                    !component._destroyed && component.renderContent();
                },
                redo: (): void => {
                    commit();
                    !component._destroyed && component.renderContent();
                }
            }, 5000 ); // longer timeout as a lot of events can fire while drawing the waveform
        },
        handleAnalysis(): void {
            this.performAnalysis = this.showOscilloscope && supportsAnalysis( getAnalysers()[ this.instrumentIndex ] );
        },
        openSampleEditor(): void {
            const name = this.oscillator.sample;
            if ( name ) {
                this.setCurrentSample( this.samples.find( sample => sample.name === name ));
            }
            this.openModal( ModalWindows.SAMPLE_EDITOR );
        },
        // render the current oscillators waveform into the waveform renderer
        // (is a zCanvas sprite and not part of the Vue component render cycle)
        renderContent(): void {
            if ( this.isSampler ) {
                this.wfRenderer.setSample( this.selectedSample?.buffer );
            } else if ( this.oscillator.waveform !== OscillatorTypes.CUSTOM ) {
                this.wfRenderer.generateAndSetTable( this.oscillator.waveform );
            } else {
                // we also clone the table here (as switching between instruments can update the ref)
                this.wfRenderer.setTable( [ ...InstrumentFactory.getTableForOscillator( this.oscillator ) ]);
            }
        },
        // on audio output, render the current instruments audio
        // as an oscilloscope into the waveform display
        renderOscilloscope(): void {
            const width  = this.canvas.getWidth();
            const height = this.canvas.getHeight();
            this.canvas.setAnimatable( true );

            const { frequencyBinCount } = getAnalysers()[ 0 ];
            const sampleBuffer = new Uint8Array( frequencyBinCount );
            const bufferSize = sampleBuffer.length;
            const sampleSize = width * ( 1 / frequencyBinCount );

            const HALF_HEIGHT   = height / 2;
            const CEIL          = 128;
            const FADE_IN_DELAY = 20;
            const FADE_IN_TIME  = 60;
            let fadeDelay       = FADE_IN_DELAY;
            let fadeSamples     = FADE_IN_TIME;

            const { wfRenderer }  = this;
            const points: Point[] = new Array( bufferSize );
            // pool the Points to prevent garbage collector hit
            for ( let i = 0; i < points.length; ++i ) {
                points[ i ] = { x: 0, y: 0 };
            }
            const lastPoint = points[ points.length - 1 ];

            wfRenderer.setExternalDraw(( renderer: IRenderer ) => {
                // when drawing inside the waveform editor, always render the shape
                if ( wfRenderer.isDragging ) {
                    renderer.setAlpha( 1 );
                    fadeDelay   = FADE_IN_DELAY;
                    fadeSamples = FADE_IN_TIME;
                    return false;
                }
                getAnalysers()[ this.instrumentIndex ].getByteTimeDomainData( sampleBuffer );

                const hasSignal = sampleBuffer.some( value => value !== CEIL );
           
                if ( hasSignal ) {
                    fadeSamples = 0;
                    fadeDelay   = 0;
                    renderer.setAlpha( 1 );
                    
                    points[ 0 ].y = ( sampleBuffer[ 0 ] / CEIL ) * HALF_HEIGHT;

                    for ( let x = 0, i = 1; i < bufferSize; ++i, x += sampleSize ) {
                        const v = sampleBuffer[ i ] / CEIL;
                        const point = points[ i ];

                        point.x = x;
                        point.y = v * HALF_HEIGHT;
                    }
                    lastPoint.x = width;
                    lastPoint.y = HALF_HEIGHT;

                    renderer.drawPath( points, "transparent", wfRenderer.strokeProps );

                    return true;
                } else {
                    if ( ++fadeDelay >= FADE_IN_DELAY ) {
                        if ( fadeSamples < FADE_IN_TIME ) {
                            ++fadeSamples;
                            renderer.setAlpha( easeIn( fadeSamples, FADE_IN_TIME ));
                        }
                    } else {
                        renderer.setAlpha( 0 );
                    }
                }
                return !this.renderWaveformOnSilence;
            });
        },
        connectAnalyser(): void {
            // connect the AnalyserNodes to the all instrument channels
            applyModules( this.activeSong, true );
            this.renderOscilloscope();
        },
        disconnectAnalyser(): void {
            applyModules( this.activeSong, false );
        },
    },
};
</script>

<style lang="scss">
@import "@/styles/_variables";
// global because zCanvas injection is outside of component scope
.waveform-canvas {
    border-radius: $spacing-small;
}
</style>

<style lang="scss" scoped>
@import "@/styles/_variables";
@import "@/styles/forms";

.waveform-container {
    position: relative;
    margin: $spacing-xsmall 0 $spacing-medium;

    &__action-button {
        position: absolute;
        right: $spacing-small;
        bottom: $spacing-medium;
    }
}
</style>