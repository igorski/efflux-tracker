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
        class="jam-channel-editor"
        :class="{
            'jam-channel-editor--selected': isSelected,
        }"
        @click="setSelectedInstrument( instrumentIndex )"
    >
        <div class="jam-channel-editor__header">
            <h3 class="jam-channel-editor__header-title">{{ instrumentName }}</h3>
            <div class="jam-channel-editor__header-actions">
                <button
                    :title="$t('mute')"
                    type="button"
                    class="jam-channel-editor__header-ghost-button"
                    :class="{
                        'jam-channel-editor__header-ghost-button--highlight': instrument.muted
                    }"
                    @click.stop="toggleMute()"
                >M</button>
                <button
                    :title="$t('solo')"
                    type="button"
                    class="jam-channel-editor__header-ghost-button"
                    :class="{
                        'jam-channel-editor__header-ghost-button--highlight': instrument.solo
                    }"
                    @click.stop="toggleSolo()"
                >S</button>
                <button
                    :title="$t( jamProps.locked ? 'unlockPattern' : 'lockPattern')"
                    type="button"
                    class="jam-channel-editor__header-icon-button"
                    @click.stop="togglePatternLock()"
                ><img v-if="jamProps.locked" src="@/assets/icons/icon-locked.svg" :alt="$t('unlockPattern')" />
                <img v-else src="@/assets/icons/icon-unlocked.svg" :alt="$t('lockPattern')" /></button>
                <button
                    :title="$t('editInstrument')"
                    type="button"
                    class="jam-channel-editor__header-button"
                    @click.stop="openInstrumentEditor()"
                ><img src="@/assets/icons/icon-pencil.svg" :alt="$t('editInstrument')" /></button>
            </div>
        </div>
        <!-- as we don't render silent waveforms, we can hard code the oscillator-index -->
        <!-- 512 x 200 is default waveform size -->
        <waveform-display
            :instrument-index="instrumentIndex"
            :oscillator-index="0"
            :editable="false"
            :show-oscilloscope="applicationFocused"
            :render-waveform-on-silence="false"
            :width="275"
            :height="107"
            class="waveform-display"
        />
        <piano-roll-lite
            class="piano-roll-display"
            :channel="channel"
            :pattern-index="activePatternIndex"
        />
        <div class="jam-channel-editor__patterns">
            <div
                v-for="(pattern, index) in channel.patterns"
                :key="`p_${index}`"
                role="button"
                class="jam-channel-editor__patterns-button"
                :class="{
                    'jam-channel-editor__patterns-button--playing'  : index === activePatternIndex,
                    'jam-channel-editor__patterns-button--queued'   : index === nextPatternIndex && nextPatternIndex !== activePatternIndex,
                    'jam-channel-editor__patterns-button--disabled' : jamProps.locked,
                }"
                @click.stop="handlePatternClick( index )"
            >
                {{ index + 1 }}
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { mapState, mapGetters, mapMutations } from "vuex";
import WaveformDisplay from "@/components/waveform-display/waveform-display.vue";
import ModalWindows from "@/definitions/modal-windows";
import muteChannel from "@/model/actions/channel-mute";
import soloChannel from "@/model/actions/channel-solo";
import { enqueueState } from "@/model/factories/history-state-factory";
import { type Instrument } from "@/model/types/instrument";
import { type JamChannelSequencerProps } from "@/model/types/jam";
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
            jam : state => state.sequencer.jam,
            selectedInstrument : state => state.editor.selectedInstrument,
            applicationFocused: state => state.applicationFocused,
        }),
        ...mapGetters([
            "activeSong",
        ]),
        jamProps(): JamChannelSequencerProps {
            return this.jam[ this.instrumentIndex ];
        },
        activePatternIndex(): number {
            return this.jamProps.activePatternIndex;
        },
        nextPatternIndex(): number {
            return this.jamProps.nextPatternIndex;
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
            "setJamChannelLock",
            "setJamChannelPosition",
            "setSelectedInstrument",
        ]),
        toggleMute(): void {
            enqueueState( `param_${this.instrumentIndex}_muted`,
                muteChannel( this.$store, this.instrumentIndex, !this.instrument.muted )
            );
        },
        toggleSolo(): void {
            enqueueState( `param_${this.instrumentIndex}_solo`,
                soloChannel( this.$store, this.instrumentIndex, !this.instrument.solo )
            );
        },
        togglePatternLock(): void {
            this.setJamChannelLock({ instrumentIndex: this.instrumentIndex, locked: !this.jamProps.locked });
        },
        openInstrumentEditor(): void {
            this.setSelectedInstrument( this.instrumentIndex );
            this.openModal( ModalWindows.JAM_MODE_INSTRUMENT_EDITOR );
        },
        handlePatternClick( index: number ): void {
            this.setJamChannelPosition({ instrumentIndex: this.instrumentIndex, patternIndex: index });
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

.jam-channel-editor {
    position: relative;
    display: inline-block;
    border: 2px solid $color-form-background; // color matches editor background
    padding: 0 $spacing-medium $spacing-small;
    box-sizing: border-box;
    background-color: #53565c;

    @include large() {
        width: $jam-channel-editor-width;
    }

    @include mobile() {
        width: 100%;
    }

    &--selected {
        background-color: #b6b6b6;
        color: $color-form-background;
    }

    &__header {
        display: flex;
        justify-content: space-between;
        align-items: center;

        &-title {
            @include toolFont();
            @include truncate();
            flex: 1;
        }

        &-actions {
            display: flex;
            align-items: center;
        }

        &-icon-button {
            padding: $spacing-xsmall $spacing-small;
            background: transparent;
            margin-right: 0;
        }

        &-ghost-button {
            padding: 0;
            margin: 0;
            width: 24px;
            height: 24px;
            background: transparent;
            border-radius: 50%;

            &--highlight {
                background-color: $color-4;
            }
        }

        &-button {
            padding: $spacing-xsmall $spacing-small;
            background-color: $color-1;
            margin-right: 0;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
        }
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
                background-color: $color-5 !important;
                color: #000 !important;
            }

            &--disabled {
                @include noEvents();
                background-color: #666;
                color: #333;
            }
        }
    }
}

.waveform-display {
    margin-bottom: -$spacing-small;
}

.piano-roll-display {
    margin-bottom: $spacing-medium;
}
</style>