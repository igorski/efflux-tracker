/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2023 - https://www.igorski.nl
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
    <div
        class="jam-mode-channel-entry"
        :class="{
            'jam-mode-channel-entry--selected': isSelected,
        }"
        @click="setSelectedInstrument( instrumentIndex )"
    >
        <h3 class="jam-mode-channel-entry__title">{{ instrumentName }}</h3>
        <!-- as we don't render silent waveforms, we can hard code the oscillator-index -->
        <!-- 512 x 200 is default waveform size -->
        <waveform-display
            :instrument-index="instrumentIndex"
            :oscillator-index="0"
            :editable="false"
            :render-waveform-on-silence="false"
            :width="275"
            :height="107"
            class="waveform-display"
        />
        <piano-roll-lite
            class="piano-roll-display"
            :channel="channel"
            :pattern-index="playingPatternIndex"
        />
        <div class="jam-mode-channel-entry__patterns">
            <div
                v-for="(pattern, index) in channel.patterns"
                :key="`p_${index}`"
                role="button"
                class="jam-mode-channel-entry__patterns-button"
                :class="{
                    'jam-mode-channel-entry__patterns-button--playing': index === playingPatternIndex,
                    'jam-mode-channel-entry__patterns-button--queued' : index === nextPatternIndex && nextPatternIndex !== playingPatternIndex
                }"
                @click="handlePatternClick( index )"
            >
                {{ index + 1 }}
            </div>
        </div>
        <button
            :title="$t('editInstrument')"
            type="button"
            class="jam-mode-channel-entry__button"
            @click.stop="openInstrumentEditor()"
        ><img src="@/assets/icons/icon-pencil.svg" :alt="$t('editInstrument')" /></button>
    </div>
</template>

<script lang="ts">
import { mapState, mapGetters, mapMutations } from "vuex";
import WaveformDisplay from "@/components/waveform-display/waveform-display.vue";
import ModalWindows from "@/definitions/modal-windows";
import { type Instrument } from "@/model/types/instrument";
import PianoRollLite from "../piano-roll-lite/piano-roll-lite.vue";
import { getInstrumentName } from "@/utils/string-util";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        PianoRollLite,
        WaveformDisplay,
    },
    props: {
        channel: {
            type: Object, /* type JamChannel */
            required: true,
        },
    },
    computed: {
        ...mapState({
            jam                : state => state.sequencer.jam,
            selectedInstrument : state => state.editor.selectedInstrument,
        }),
        ...mapGetters([
            "activeSong",
        ]),
        playingPatternIndex(): number {
            return this.jam[ this.instrumentIndex ].playingPatternIndex;
        },
        nextPatternIndex(): number {
            return this.jam[ this.instrumentIndex ].nextPatternIndex;
        },
        instrumentIndex(): number {
            return this.channel.index;
        },
        instrument(): Instrument {
            return this.activeSong.instruments[ this.instrumentIndex ];
        },
        instrumentName(): string {
            return getInstrumentName( this.instrument );
        },
        isSelected(): boolean {
            return this.selectedInstrument === this.instrumentIndex;
        },
    },
    methods: {
        ...mapMutations([
            "openModal",
            "invalidateChannelCache",
            "setJamPattern",
            "setSelectedInstrument",
        ]),
        openInstrumentEditor(): void {
            this.setSelectedInstrument( this.instrumentIndex );
            this.openModal( ModalWindows.INSTRUMENT_EDITOR );
        },
        handlePatternClick( index: number ): void {
            console.info(this.instrumentIndex + " clicked on:" + index);
            this.setJamPattern({ instrumentIndex: this.instrumentIndex, patternIndex: index });
            this.invalidateChannelCache({ song: this.activeSong });
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/_variables";
@import "@/styles/_mixins";
@import "@/styles/animation";
@import "@/styles/forms";
@import "@/styles/typography";

$button-width: 32px;
$button-height: 26px;

.jam-mode-channel-entry {
    position: relative;
    display: inline-block;
    border: 2px solid #666;
    border-radius: $spacing-small;
    padding: 0 $spacing-medium $spacing-small;
    box-sizing: border-box;
    background-color: #53565c;

    &--selected {
        border-color: $color-1;
    }
    
    &__title {
        @include toolFont();
    }

    &__patterns {
        display: flex;
        flex-direction: row;

        &-button {
            cursor: pointer;
            position: relative;
            width: $button-width;
            box-sizing: border-box;
            text-align: center;
            margin: 0 $spacing-xxsmall 0 0;
            padding: $spacing-xxsmall 0;
            border: 1px solid $color-border;
            border-radius: 3px;
            @include toolFont();

            &:hover {
                background-color: $color-2;
                color: #000;
            }

            &--queued {
                @include animationBlink( .5s );
                background-color: $color-4;
                color: #000;
            }

            &--playing {
                background-color: $color-5;
                color: #000;
            }
        }
    }

    &__button {
        position: absolute;
        top: $spacing-xsmall + $spacing-xxsmall;
        right: $spacing-xsmall;
        padding: $spacing-xsmall $spacing-small;
        background-color: $color-1;
    }
}

.waveform-display {
    margin-bottom: -$spacing-small;
}

.piano-roll-display {
    margin-bottom: $spacing-medium;
}
</style>