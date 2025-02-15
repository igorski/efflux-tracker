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
                @click="close()"
            >x</button>
        </div>
        <hr class="divider" />
        <ul class="midi-preset-list">
            <template v-if="presets.length > 0">
                <li
                    v-for="preset in presets"
                    :key="`preset_${preset.id}_${preset.title}`"
                    @click="openPreset( preset )"
                >
                    <span class="title">{{ preset.title }}</span>
                    <span class="device">{{ preset.deviceName }}</span>
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
                @keyup.enter="savePreset()"
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
    emits: [ "close" ],
    i18n: { messages },
    data: () => ({
        newPresetName: "",
        presets: [],
    }),
    computed: {
        ...mapGetters([
            "connectedDevice",
            "pairings",
        ]),
        hasPairings(): boolean {
            return this.pairings.size > 0;
        },
    },
    async created(): Promise<void> {
        await this.loadPresets();
    },
    methods: {
        ...mapMutations([
            "openDialog",
            "pairFromPreset",
            "showNotification",
            "suspendKeyboardService",
        ]),
        ...mapActions([
            "deletePairing",
            "loadPairings",
            "savePairing",
        ]),
        handleFocusIn() {
            this.suspendKeyboardService( true );
        },
        handleFocusOut() {
            this.suspendKeyboardService( false );
        },
        openPreset( preset: MIDIPairingPreset ): void {
            this.pairFromPreset( preset );
            if ( this.connectedDevice?.id !== preset.deviceId ) {
                this.openDialog({ message: this.$t( "appliedPresetIncompatibleDevice", { device: preset.deviceName })});
            }
            this.showNotification({ message: this.$t( "appliedPreset", { preset: preset.title }) });
            this.close();
        },
        async savePreset(): Promise<void> {
            const success = await this.savePairing( this.newPresetName );
            if ( success ) {
                this.loadPresets();
                this.showNotification({ message: this.$t( "savedPreset", { preset: this.newPresetName }) }); 
            }
        },
        requestDelete( preset: MIDIPairingPreset ): void {
            this.openDialog({
                type: "confirm",
                message: this.$t( "confirmPresetDelete", { preset: preset.title }),
                confirm: async (): Promise<void> => {
                    await this.deletePairing( preset );
                    this.loadPresets();
                    this.showNotification({ message: this.$t( "deletedStoredPreset", { preset: preset.title }) });
                }
            });
        },
        async loadPresets(): Promise<void> {
            this.presets = await this.loadPairings();
        },
        close(): void {
            this.$emit( "close" );
        },
    },
};
</script>

<style lang="scss" scoped>
@use "sass:math";

@use "@/styles/_colors";
@use "@/styles/_mixins";
@use "@/styles/_variables";
@use "@/styles/forms";
@use "@/styles/typography";

$width: 750px;
$height: 500px;
$headerFooterHeight: 104px;

.midi-preset-manager {
    @include mixins.editorComponent();
    @include mixins.overlay();
    @include mixins.noSelect();
    overflow-x: hidden;
    overflow-y: auto;
    padding: 0;

    .header,
    .footer {
        padding: variables.$spacing-small variables.$spacing-large 0;
    }

    .footer {
        display: flex;
        gap: variables.$spacing-small;
    }

    .divider {
        width: calc(100% + #{variables.$spacing-large * 2});
        margin-left: -( variables.$spacing-large );
        margin-bottom: 0;
    }

    @include mixins.componentIdeal( $width, $height ) {
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

    @include mixins.componentFallback( $width, $height ) {
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        border-radius: 0;
        z-index: variables.$z-window;

        .midi-preset-list {
            height: calc(100% - #{$headerFooterHeight});
        }
    }
}

.midi-preset-list {
    @include mixins.list();
    width: 100%;
    overflow-y: auto;

    li {
        @include typography.titleFont();
        @include mixins.boxSize();
        cursor: pointer;
        display: flex;
        align-items: center;
        width: 100%;
        padding: variables.$spacing-small variables.$spacing-large;
        background-color: colors.$color-pattern-even;

        .title, .device, .action-button {
            display: inline-block;
        }

        .title,
        .device {
            flex: 1;
            @include mixins.noEvents();
            @include mixins.truncate();
        }

        .action-button {
            width: #{variables.$spacing-large + variables.$spacing-xsmall};
            padding: variables.$spacing-xsmall;
            @include mixins.ghostButton();

            &:hover {
                filter: brightness(0) invert(1) !important;
            }
        }

        @include mixins.mobile() {
            .title {
                width: 95%;
            }
            .device {
                display: none;
            }
        }

        &:nth-child(even) {
            background-color: colors.$color-pattern-odd;
            /*color: #FFF;*/
        }

        &:hover {
            background-color: colors.$color-5;
            color: #000;

            .action-button {
                filter: brightness(0);
            }
        }
    }
}
</style>