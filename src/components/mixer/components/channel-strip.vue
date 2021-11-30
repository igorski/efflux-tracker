/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2021 - https://www.igorski.nl
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the 'Software'), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
<template>
    <div class="channel-strip">
        <h3>{{ title }}</h3>
        <h4 class="preset-name">{{ name }}</h4>
        <div class="wrapper input range volume-wrapper">
            <label v-t="'volumeTitle'"
                   for="instrumentVolume"
                   class="volume-title"
            ></label>
            <input v-model.number="volume"
                   type="range"
                   id="instrumentVolume"
                   min="0" max="1" step="0.01" value="1"
                   class="range"
            />
            <meter v-if="supportsAnalyzer"
                   class="meter"
                   min="-100" max="10" low="-100" high="-5" optimum="0" :value="output"
            ></meter>
        </div>
        <div class="toggles">
            <button class="toggle"
                    :class="{ active: instrument.muted }"
                    @click="toggleMute"
            >M</button>
            <button class="toggle"
                    :class="{ active: instrument.solo }"
                    @click="toggleSolo"
            >S</button>
        </div>
        <div v-if="supportsPanning"
             class="wrapper input range panning-wrapper"
        >
            <label v-t="'panTitle'"
                   for="instrumentPanning"
            ></label>
            <input v-model="panning"
                   type="range"
                   id="instrumentPanning"
                   min="-1" max="1" step=".01" value="0"
                   class="range"
            />
        </div>
    </div>
</template>

<script>
import { mapState, mapMutations } from 'vuex';
import AudioService from '@/services/audio-service';
import { supports } from '@/services/audio/webaudio-helper';

export default {
    props: {
        instrumentIndex: {
            type: Number,
            required: true,
        },
        analyser: {
            type: AnalyserNode,
            required: false,
        },
    },
    data: vm => ({
        title: `# ${vm.instrumentIndex + 1}`,
        supportsPanning: supports('panning'),
        output: -100,
        renderCycle: 0,
    }),
    computed: {
        ...mapState({
            activeSong: state => state.song.activeSong,
        }),
        instrument() {
            return this.activeSong.instruments[ this.instrumentIndex ];
        },
        name() {
            const { name, presetName } = this.instrument;
            if ( !name.startsWith( "Instrument ")) {
                // instrument has a non-default name set
                return name;
            }
            // instrument has preset, use its name
            return ( presetName || name || "" ).replace( "FACTORY ", "" );
        },
        volume: {
            get() {
                return this.instrument.volume;
            },
            set( value ) {
                // adjusting volume always deactivates the muted state
                this.updateInstrument({ instrumentIndex: this.instrumentIndex, prop: 'muted', value: false });
                this.updateInstrument({ instrumentIndex: this.instrumentIndex, prop: 'volume', value });
                AudioService.adjustInstrumentVolume( this.instrumentIndex, value );
            }
        },
        panning: {
            get() {
                return this.instrument.panning;
            },
            set( value ) {
                this.updateInstrument({ instrumentIndex: this.instrumentIndex, prop: 'panning', value });
                AudioService.adjustInstrumentPanning( this.instrumentIndex, value );
            }
        },
        supportsAnalyzer() {
            // at time of writing Safari does not provide getFloatTimeDomainData()
            return !!this.analyser && typeof this.analyser.getFloatTimeDomainData === 'function';
        },
    },
    created() {
        if ( !this.supportsAnalyzer ) {
            return;
        }

        // if an AnalyserNode is provided, start the render loop to update the meter

        this.analyser.fftSize = 2048;
        const sampleBuffer    = new Float32Array( this.analyser.fftSize );

        const renderLoop = () => {
            this.analyser.getFloatTimeDomainData( sampleBuffer );

            // Compute average power over the interval.
            let sumOfSquares = 0;
            for ( let i = 0; i < sampleBuffer.length; i++ ) {
                sumOfSquares += sampleBuffer[ i ] ** 2;
            }
            const avgPowerDecibels = 10 * Math.log10( sumOfSquares / sampleBuffer.length );

            this.output      = isFinite( avgPowerDecibels ) ? avgPowerDecibels : -100;
            this.renderCycle = requestAnimationFrame( renderLoop );
        };
        renderLoop();
    },
    destroyed() {
        cancelAnimationFrame( this.renderCycle );
    },
    methods: {
        ...mapMutations([
            'updateInstrument',
        ]),
        hasSolo() {
            // whether one or more of the other channels in the songs instrument list has solo enabled
            return this.activeSong.instruments.find(( instrument, index ) => index !== this.instrumentIndex && instrument.solo );
        },
        toggleMute() {
            const current = !!this.instrument.muted;
            const value   = !current;

            let targetVolume = value ? 0 : this.instrument.volume;
            this.updateInstrument({ instrumentIndex: this.instrumentIndex, prop: 'muted', value });

            if ( value ) {
                // activating mute always unsolos instrument
                if ( this.instrument.solo ) {
                    this.toggleSolo();
                }
            } else if ( this.hasSolo() ) {
                targetVolume = 0;
            }
            AudioService.adjustInstrumentVolume( this.instrumentIndex, targetVolume );
        },
        toggleSolo() {
            const current = !!this.instrument.solo;
            const value   = !current;
            this.updateInstrument({ instrumentIndex: this.instrumentIndex, prop: 'solo', value });

            let hasSolo = this.hasSolo();

            if ( value ) {
                if ( this.instrument.muted ) {
                    this.toggleMute(); // activating solo always unmutes instrument
                } else {
                    // as multiple channels can enable solo, force volume on for this channel
                    AudioService.adjustInstrumentVolume( this.instrumentIndex, this.instrument.volume );
                }
            } else if ( hasSolo ) {
                AudioService.adjustInstrumentVolume( this.instrumentIndex, 0 );
            }

            hasSolo = value || hasSolo; // in case no other instrument has solo but this instrument just activated the state
            this.activeSong.instruments.forEach(( instrument, index ) => {
                if ( index !== this.instrumentIndex ) {
                    AudioService.adjustInstrumentVolume( index, hasSolo && !instrument.solo ? 0 : instrument.volume );
                }
            });
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";
@import "@/styles/forms";

$width: 80px;

.channel-strip {
    width: $width;
    display: inline-block;
    padding: 0 0 $spacing-large $spacing-medium;
    border-right: 1px solid #666;
    position: relative;
}

.preset-name {
    @include truncate();
    margin-left: -$spacing-medium;
    font-size: 75%;
    text-align: center;
    height: 1.5em;
    background-color: $color-2;
    padding: 5px;
    color: #000;
}

.range {
    width: 125px;
    height: 25px;
}

.meter {
    position: relative;
    transform-origin: 0;
    top: -$spacing-small;
    margin: 0 $spacing-small 0;
    width: 105px;
    height: $spacing-medium;

    // hot signals display as red, otherwise green

    &:-moz-meter-sub-optimum::-moz-meter-bar {
        background: green;
    }
    &::-webkit-meter-suboptimum-value {
        background: green;
    }

    &:-moz-meter-optimum::-moz-meter-bar {
        background: red;
    }
    &::-webkit-meter-optimum-value {
        background: red;
    }
}

.volume-title {
    margin-left: $spacing-small;
}

.volume-wrapper {
    transform: rotate(-90deg);
    transform-origin: 0;
    margin: 130px 0 0 8px;
}

.panning-wrapper {
    width: 70px;
    margin-top: $spacing-medium;
}

.toggle {
    display: inline;
    font-size: 80%;
    padding: $spacing-xsmall $spacing-small;
    margin: 0 0 0 $spacing-small;

    &.active {
        background-color: $color-2;
    }
}
</style>
