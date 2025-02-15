/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2019-2025 - https://www.igorski.nl
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
    <div
        class="instrument-editor"
        :class="{ 'instrument-editor--maximized': maximized }"
    >
        <div class="instrument-header">
            <!-- instrument preset list -->
            <section class="instrument-presets">
                <h2 v-t="'presets'" class="preset-title"></h2>
                <select-box
                    v-model="currentPreset"
                    :options="presetOptions"
                    class="preset-selector"
                />
            </section>
            <!-- header UI -->
            <section class="header">
                <div class="actions">
                    <button
                        v-if="hasMidiSupport"
                        v-t="midiConnected ? ( midiAssignMode ? 'doneAssigning' : 'assignMidiControl' ) : 'connectMidi'"
                        type="button"
                        @click="midiConnected ? setMidiAssignMode( !midiAssignMode ) : openSettingsPanel()"
                    />
                    <!-- selector that switches between available instruments -->
                    <select-box
                        v-model="instrument"
                        :options="instrumentOptions"
                        class="instrument-selector"
                    />
                </div>
                <button
                    type="button"
                    class="help-button"
                    @click="openHelp"
                >?</button>
                <button
                    type="button"
                    class="close-button"
                    @click="$emit('close')"
                >x</button>
            </section>
        </div>
        <hr class="divider" />
        <div class="instrument-modules">
            <!-- oscillator editor -->
            <ul class="oscillator-tabs tab-list">
                <li v-for="(oscillator, idx) in oscillatorAmount"
                    :key="`oscillator_${idx}`"
                    :class="{ active: selectedOscillatorIndex === idx }"
                    @click="setSelectedOscillatorIndex( idx )"
                >
                    {{ $t('oscillator', { index: idx + 1 }) }}
                </li>
            </ul>
            <div>
                <oscillator-editor
                    :instrument-index="selectedInstrument"
                    :oscillator-index="selectedOscillatorIndex"
                    @invalidate="invalidatePreset()"
                />
                <div class="module-wrapper">
                    <!-- modules -->
                    <module-editor
                        :instrument-ref="instrumentRef"
                        :instrument-index="selectedInstrument"
                        :tabbed="!maximized"
                        @invalidate="invalidatePreset()"
                        class="module-editor-container"
                        :class="{ 'module-editor-container--maximized': maximized }"
                    />
                </div>
            </div>
        </div>
        <!-- optional slot content goes here (see jam-mode-instrument-editor.vue) -->
        <slot></slot>
        <hr class="divider divider--small" />
        <div class="instrument-footer">
            <input
                v-model="presetName"
                class="instrument-name-input"
                type="text"
                :placeholder="$t('instrumentName')"
                @focus="handleFocusIn()"
                @blur="handleFocusOut()"
                @keyup.enter="handleInputBlur( $event )"
            />
            <button
                v-t="'savePreset'"
                type="button"
                @click="savePreset()"
                class="instrument-preset-save"
            ></button>
        </div>
    </div>
</template>

<script lang="ts">
import { mapState, mapGetters, mapMutations, mapActions } from "vuex";
import Config            from "@/config";
import Actions           from "@/definitions/actions";
import ManualURLs        from "@/definitions/manual-urls";
import ModalWindows      from "@/definitions/modal-windows";
import PubSubMessages    from "@/services/pubsub/messages";
import createAction      from "@/model/factories/action-factory";
import InstrumentFactory from "@/model/factories/instrument-factory";
import type { Instrument } from "@/model/types/instrument";
import { clone }         from "@/utils/object-util";
import SelectBox         from "@/components/forms/select-box.vue";
import OscillatorEditor  from "./components/oscillator-editor/oscillator-editor.vue";
import ModuleEditor      from "./components/module-editor/module-editor.vue";
import messages          from "./messages.json";

let EMPTY_PRESET_VALUE;

export default {
    i18n: { messages },
    components: {
        OscillatorEditor,
        ModuleEditor,
        SelectBox,
    },
    props: {
        maximized: {
            type: Boolean,
            default: false,
        },
    },
    data: () => ({
        oscillatorAmount: Config.OSCILLATOR_AMOUNT,
        currentPreset: null,
    }),
    computed: {
        ...mapState({
            activeSong              : state => state.song.activeSong,
            selectedInstrument      : state => state.editor.selectedInstrument,
            selectedOscillatorIndex : state => state.editor.selectedOscillatorIndex,
            instruments             : state => state.instrument.instruments,
            midiConnected           : state => state.midi.midiConnected,
            midiAssignMode          : state => state.midi.midiAssignMode,
        }),
        ...mapGetters([
            "getInstrumentByPresetName",
            "hasMidiSupport",
        ]),
        instrument: {
            get(): string {
                return this.selectedInstrument.toString();
            },
            set( value: string ): void {
                this.setSelectedInstrument( parseFloat( value )); // allows live keyboard/MIDI playing to use new instrument
                const instrumentPresetName = this.instrumentRef.presetName;
                if ( this.presets.find(({ presetName }) => presetName === instrumentPresetName )) {
                    this.currentPreset = instrumentPresetName;
                } else {
                    this.currentPreset = EMPTY_PRESET_VALUE;
                }
                this.presetName = instrumentPresetName;
            },
        },
        instrumentRef(): Instrument {
            return this.activeSong.instruments[ this.selectedInstrument ];
        },
        presetName: {
            get(): string {
                return this.instrumentRef?.presetName;
            },
            set( presetName: string ): void {
                this.setPresetName({ instrument: this.instrumentRef, presetName });
            },
        },
        presets(): Instrument[] {
            const out = [
                ...this.instruments,
                { presetName: this.$t( "defaultPresetName" ) }
            ];
            return out.sort(( a, b ) => {
                if( a.presetName < b.presetName ) return -1;
                if( a.presetName > b.presetName ) return 1;
                return 0;
            });
        },
        instrumentOptions(): { label: string, value: string }[] {
            const out = [];
            for ( let i = 0; i < Config.INSTRUMENT_AMOUNT; ++i ) {
                out.push({ label: this.$t( "instrument", { index: i + 1 }), value: i.toString() });
            }
            return out;
        },
        presetOptions(): { label: string, value: string }[] {
            return this.presets
                .map(({ presetName }) => ({ label: presetName, value: presetName }))
                .sort(( a, b ) => a.label.toLowerCase().localeCompare( b.label.toLowerCase()));
        },
    },
    watch: {
        async currentPreset( selectedPresetName ): Promise<void> {
            if ( selectedPresetName === EMPTY_PRESET_VALUE || this.instrumentRef.presetName === selectedPresetName ) {
                return;
            }
            let instrumentPreset;
            try {
                instrumentPreset = await this.loadInstrumentFromLS( this.getInstrumentByPresetName( selectedPresetName ));
            } catch {
                return;
            }
            const newInstrument = InstrumentFactory.loadPreset(
                instrumentPreset, this.selectedInstrument, this.instrumentRef.name
            );
            createAction( Actions.REPLACE_INSTRUMENT, {
                store: this.$store,
                instrument: newInstrument,
            });
        },
    },
    created(): void {
        EMPTY_PRESET_VALUE = this.$t('defaultPresetName');
        this.instrument = this.selectedInstrument; // last active instrument in editor will be opened
        this.publishMessage( PubSubMessages.INSTRUMENT_EDITOR_OPENED );
    },
    unmounted(): void {
        this.setMidiAssignMode( false );
    },
    methods: {
        ...mapMutations([
            "setSelectedInstrument",
            "setSelectedOscillatorIndex",
            "suspendKeyboardService",
            "showError",
            "showNotification",
            "setMidiAssignMode",
            "setPresetName",
            "publishMessage",
            "openModal",
        ]),
        ...mapActions([
            "loadInstrumentFromLS",
            "saveInstrumentIntoLS",
        ]),
        openHelp(): void {
            window.open( ManualURLs.INSTRUMENT_EDITOR, "_blank" );
        },
        openSettingsPanel(): void {
            this.openModal( ModalWindows.SETTINGS_WINDOW );
        },
        invalidatePreset(): void {
            if ( this.presetName && !this.presetName.includes( "*" )) {
                this.setPresetName({ instrument: this.instrumentRef, presetName: `${this.presetName}*` });
            }
        },
        savePreset(): void {
            let newPresetName = this.presetName || "";
            if ( newPresetName.trim().length === 0 ) {
                this.showError( this.$t( "errorNoName" ));
            }
            else {
                newPresetName = newPresetName.replace( "*", "" );
                this.setPresetName({ instrument: this.instrumentRef, presetName: newPresetName });
                if ( this.saveInstrumentIntoLS( clone( this.instrumentRef ) )) {
                    this.showNotification({ message: this.$t( "instrumentSaved", { name: newPresetName }) });
                }
            }
        },
        /**
         * when typing, we want to suspend the KeyboardController
         * so it doesn't broadcast the typing to its listeners
         */
        handleFocusIn(): void {
            this.suspendKeyboardService( true );
        },
        /**
         * on focus out, restore the KeyboardControllers broadcasting
         */
        handleFocusOut(): void {
            this.suspendKeyboardService( false );
        },
        handleInputBlur( event: Event ): void {
            event.target?.blur?.();
        },
    }
};
</script>

<style lang="scss" scoped>
@use "sass:math";

@use "@/styles/_mixins";
@use "@/styles/_variables";
@use "@/styles/tabs";
@use "@/styles/typography";
@use "@/styles/forms";

.instrument-editor {
    @include mixins.editorComponent();
    @include mixins.overlay();
    position: absolute;
    top: 0;
    margin-top: 0;
    padding: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    .divider {
        margin-top: variables.$spacing-small;

        &--small {
            margin-top: 0;
        }
    }

    @include mixins.large() {
        padding: variables.$spacing-small;
    }

    /* ideal size and above (tablet/desktop) */

    @media screen and ( min-width: variables.$ideal-instrument-editor-width ) {
        left: 50%;
        width: variables.$ideal-instrument-editor-width;
        margin-left: math.div( -( variables.$ideal-instrument-editor-width ), 2 );
    }

    @media screen and ( min-height: variables.$ideal-instrument-editor-height ) {
        top: 50%;
        height: variables.$ideal-instrument-editor-height;
        margin-top: math.div( -( variables.$ideal-instrument-editor-height ), 2 );
    }

    &--maximized {
        @media screen and ( min-width: variables.$ideal-maximized-instrument-editor-width ) {
            left: 50%;
            width: variables.$ideal-maximized-instrument-editor-width !important;
            margin-left: math.div( -( variables.$ideal-maximized-instrument-editor-width ), 2 );
        }

        @media screen and ( min-height: variables.$ideal-maximized-instrument-editor-height ) {
            top: 50%;
            height: variables.$ideal-maximized-instrument-editor-height;
            margin-top: math.div( -( variables.$ideal-maximized-instrument-editor-height ), 2 );
        }
    }

    /* mobile */

    @include mixins.mobile() {
        height: 100%;
        top: 0;
        margin: 0;
    }

    .header {
        width: auto;

        .close-button {
            right: 0;
        }

        .help-button {
            right: 40px;
        }

        .actions {
            right: 90px;
        }
    }
}

.instrument-header {
    @include mixins.large() {
        display: flex;
        justify-content: space-between;

        .header {
            display: flex;

            .help-button,
            .close-button,
            .actions {
                position: initial;
            }
            .actions {
                margin-right: variables.$spacing-small;
            }
        }
    }
}

.instrument-modules {
    position: relative;
    @include mixins.verticalScrollOnMobile();
    padding: 0 variables.$spacing-small variables.$spacing-small;

    @include mixins.mobile() {
        padding: 0 variables.$spacing-small variables.$spacing-small;
    }
}

.preset-title {
    padding: 0 variables.$spacing-medium 0;
    color: #FFF;
    @include typography.toolFont();
}

.actions {
    position: absolute;
    display: flex;
    align-items: center;
    top: variables.$action-button-top;
    right: #{variables.$spacing-xlarge * 2 - variables.$spacing-xxsmall};
}

.instrument-presets {
    @include mixins.boxSize();

    @include mixins.mobile() {
        border-top: 1px dashed #666;
        padding-top: variables.$spacing-small;
        margin-top: ( variables.$spacing-xlarge - variables.$spacing-small );
    }
}

.module-wrapper {
    @include mixins.large() {
        display: inline-flex;
        flex-direction: column;
        vertical-align: top;
        width: calc(100% - 550px);

        @include mixins.minWidthFallback( variables.$ideal-instrument-editor-width ) {
            @include mixins.boxSize();
            width: 100%;
            padding: 0 variables.$spacing-medium 0 0;
        }
    }
}

.module-editor-container {
    position: relative;

    @media screen and ( min-width: variables.$ideal-instrument-editor-width ) {
        margin-top: -( variables.$spacing-small );
        padding: 0 variables.$spacing-medium;
    }

    &--maximized {
        padding-top: variables.$spacing-medium;
    }
}

.instrument-footer {
    margin: variables.$spacing-small variables.$spacing-medium 0;
    display: flex;
    justify-content: space-between;

    input {
        width: 100%;
        @include mixins.large() {
            width: 253px;
        }
    }

    @include mixins.mobile() {
        margin-top: 0;

        button {
            margin: variables.$spacing-small 0;
            width: 100%;
        }

        input {
            margin: variables.$spacing-small variables.$spacing-small variables.$spacing-small 0;
        }
    }
}

.instrument-selector {
    width: 130px;
}

.preset-selector {
    width: 204px;
}
</style>
