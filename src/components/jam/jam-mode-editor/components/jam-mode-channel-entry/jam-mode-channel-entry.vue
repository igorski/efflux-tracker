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
        <!-- @todo pattern number -->
        <piano-roll
            v-if="showPianoRoll"
            :channel="channel"
            :pattern-index="0"
        />
        <!-- @todo what to do with oscillator indices at this level ?-->
        <waveform-display
            v-else
            :instrument-index="instrumentIndex"
            :oscillator-index="0"
            :editable="false"
        />
        <div class="jam-mode-channel-entry__patterns">
            <div
                v-for="(pattern, index) in channel.patterns"
                :key="`p_${index}`"
                class="jam-mode-channel-entry__patterns-button"
                role="button"
            >
                {{ index }}
            </div>
        </div>
        <button
            v-t="'editInstrument'"
            type="button"
            class="jam-mode-channel-entry__instrument"
            @click.stop="openInstrumentEditor()"
        ></button>
    </div>
</template>

<script lang="ts">
import { mapState, mapGetters, mapMutations } from "vuex";
import WaveformDisplay from "@/components/waveform-display/waveform-display.vue";
import ModalWindows from "@/definitions/modal-windows";
import { type Instrument } from "@/model/types/instrument";
import PianoRoll from "../piano-roll/piano-roll.vue";

import messages from "./messages.json";

enum JamChannelEntryMode {
    PIANO_ROLL = 0,
    WAVEFORM,
}

export default {
    i18n: { messages },
    components: {
        PianoRoll,
        WaveformDisplay,
    },
    props: {
        channel: {
            type: Object, /* type JamChannel */
            required: true,
        },
        mode: {
            type: Number, /* type JamChannelEntryMode */
            default: JamChannelEntryMode.WAVEFORM,
        },
    },
    computed: {
        ...mapState({
            selectedInstrument: state => state.editor.selectedInstrument,
        }),
        ...mapGetters([
            "activeSong",
        ]),
        instrumentIndex(): number {
            return this.channel.index;
        },
        instrument(): Instrument {
            return this.activeSong.instruments[ this.instrumentIndex ];
        },
        instrumentName(): string {
            const { name, presetName } = this.instrument;
            if ( !name.startsWith( "Instrument ")) {
                // instrument has a non-default name set
                return name;
            }
            // instrument has preset, use its name
            return ( presetName || name || "" ).replace( "FACTORY ", "" );
        },
        isSelected(): boolean {
            return this.selectedInstrument === this.instrumentIndex;
        },
        showPianoRoll(): boolean {
            return this.mode === JamChannelEntryMode.PIANO_ROLL;
        },
    },
    methods: {
        ...mapMutations([
            "openModal",
            "setSelectedInstrument",
        ]),
        openInstrumentEditor(): void {
            this.setSelectedInstrument( this.instrumentIndex );
            this.openModal( ModalWindows.INSTRUMENT_EDITOR );
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/_variables";
@import "@/styles/_mixins";
@import "@/styles/forms";

$button-width: 32px;
$button-height: 26px;

.jam-mode-channel-entry {
    display: inline-block;
    border-radius: $spacing-small;
    box-sizing: border-box;
    padding: $spacing-small $spacing-medium;
    border: 2px solid #666;

    &--selected {
        border-color: $color-1;
    }
}

.jam-mode-channel-entry__patterns {
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

        &--active {
            background-color: $color-1;
            color: #000;
        }
    }
}
</style>