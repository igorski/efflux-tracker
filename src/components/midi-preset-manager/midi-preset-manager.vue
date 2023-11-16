/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2023 - https://www.igorski.nl
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
    <div class="midi-preset-manager">
        <div class="header">
            <h2 v-t="'midiPresetManager'"></h2>
            <button
                type="button"
                class="close-button"
                @click="$emit('close')"
            >x</button>
        </div>
        <hr class="divider" />
        <ul class="midi-preset-list">
            <template v-if="presets.length > 0">
                <li
                    v-for="preset in presets"
                    :key="`preset_${preset.id}`"
                    @click="openPreset( preset )"
                >
                    <span class="title">{{ preset.title }}</span>
                    <span class="device">{{ preset.device }}</span>
                    <button
                        type="button"
                        class="action-button"
                        :title="$t('deletePreset')"
                        @click.stop="requestDelete( preset )"
                    ><img src="@/assets/icons/icon-trashcan.svg" :alt="$t('deletePreset')" /></button>
                </li>
            </template>
            <li v-else>
                <p v-t="'noPresetsAvailable'"></p>
            </li>
        </ul>
        <hr class="divider divider--bottom" />
        <div class="footer">
            <input
                v-model="newPresetName"
                :placeholder="$t('newPresetName')"
                :disabled="!hasPairings"
                type="text"
                class="input-field full"
                @focus="handleFocusIn()"
                @blur="handleFocusOut()"
            />
            <button
                v-t="'savePreset'"
                type="button"
                class="button"
                :disabled="!hasPairings || newPresetName.length === 0"
                @click="savePreset()"
            ></button>
        </div>
    </div>
</template>

<script lang="ts">
import { mapGetters, mapMutations, mapActions } from "vuex";
import { type MIDIPairingPreset } from "@/store/modules/midi-module";
import messages from "./messages.json";

export default {
    i18n: { messages },
    data: () => ({
        newPresetName: "",
        presets: [],
    }),
    computed: {
        ...mapGetters([
            "hasPairings",
        ]),
        mappedPresets(): MIDIPairingPreset[] {
            return [];
        },
    },
    async created(): Promise<void> {
        this.presets = await this.loadPairings();
    },
    methods: {
        ...mapMutations([
            "openDialog",
            "pairFromPreset",
            "suspendKeyboardService",
        ]),
        ...mapActions([
            "deletePairing",
            "loadPairings",
            "savePairing",
        ]),
        requestDelete( preset: MIDIPairingPreset ): void {
            this.openDialog({
                type: "confirm",
                message: this.$t( "confirmPresetDelete", { preset: preset.title }),
                confirm: () => {
                    this.deletePairing( preset );
                }
            });
        },
         handleFocusIn() {
            this.suspendKeyboardService( true );
        },
        handleFocusOut() {
            this.suspendKeyboardService( false );
        },
        openPreset( preset: MIDIPairingPreset ): void {
            this.pairFromPreset( preset );
        },
        savePreset(): void {
            this.savePairing( this.newPresetName );
        },
    },
};
</script>

<style lang="scss" scoped>
@use "sass:math";

@import "@/styles/_mixins";
@import "@/styles/typography";

$width: 750px;
$height: 500px;
$headerFooterHeight: 104px;

.midi-preset-manager {
    @include editorComponent();
    @include overlay();
    @include noSelect();
    overflow-x: hidden;
    overflow-y: auto;
    padding: 0;

    .header,
    .footer {
        padding: $spacing-small $spacing-large 0;
    }

    .footer {
        display: flex;
        gap: $spacing-small;
    }

    .divider {
        width: calc(100% + #{$spacing-large * 2});
        margin-left: -$spacing-large;
        margin-bottom: 0;
    }

    @include componentIdeal( $width, $height ) {
        width: $width;
        height: $height;
        top: 50%;
        left: 50%;
        margin-left: math.div( -$width, 2 );
        margin-top: math.div( -$height, 2 );

        .midi-preset-list {
            height: calc(#{$height - $headerFooterHeight});
        }
    }

    @include componentFallback( $width, $height ) {
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        border-radius: 0;
        z-index: 2000;

        .midi-preset-list {
            height: calc(100% - #{$headerFooterHeight});
        }
    }
}

.midi-preset-list {
    @include list();
    width: 100%;
    overflow-y: auto;

    li {
        @include titleFont();
        @include boxSize();
        cursor: pointer;
        display: flex;
        align-items: center;
        width: 100%;
        padding: $spacing-small $spacing-large;
        background-color: $color-pattern-even;

        .title, .device, .action-button {
            display: inline-block;
        }

        .title {
            flex: 1;
            @include noEvents();
            @include truncate();
            vertical-align: middle;
        }

        .device {
            width: 15%;
        }

        .action-button {
            width: #{$spacing-large + $spacing-xsmall};
            @include ghostButton();

            &:hover {
                filter: brightness(0) invert(1) !important;
            }
        }

        @include mobile() {
            .title {
                width: 95%;
            }
            .device {
                display: none;
            }
        }

        &:nth-child(even) {
            background-color: $color-pattern-odd;
            /*color: #FFF;*/
        }

        &:hover {
            background-color: $color-5;
            color: #000;

            .action-button {
                filter: brightness(0);
            }
        }
    }
}
</style>