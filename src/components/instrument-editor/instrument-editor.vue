/**
* The MIT License (MIT)
*
* Igor Zinken 2019-2021 - https://www.igorski.nl
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
    <div class="instrument-editor">
        <div class="header">
            <button
                class="help-button"
                @click="openHelp"
            >?</button>
            <button
                class="close-button"
                @click="$emit('close')"
            >x</button>
            <div class="actions">
                <button
                    v-if="hasMidiSupport"
                    v-t="midiConnected ? 'assignMidiControl' : 'connectMidi'"
                    type="button"
                    @click="midiConnected ? setMidiAssignMode( !midiAssignMode ) : openSettingsPanel()"
                />
                <!-- selector that switches between available instruments -->
                <select-box
                    v-model="instrument"
                    :options="instrumentOptions"
                />
            </div>
        </div>
        <!-- instrument preset list -->
        <section class="instrument-presets">
            <h2 v-t="'presets'" class="preset-title"></h2>
            <select-box
                v-model="currentPreset"
                :options="presetOptions"
                class="preset-selector"
            />
        </section>
        <hr class="divider" />
        <!-- oscillator editor -->
        <div class="instrument-editor-wrapper">
            <ul class="oscillator-tabs tab-list">
                <li v-for="(oscillator, idx) in oscillatorAmount"
                    :key="`oscillator_${idx}`"
                    :class="{ active: selectedOscillatorIndex === idx }"
                    @click="setSelectedOscillatorIndex(idx)"
                >
                    {{ $t('oscillator', { index: idx + 1 }) }}
                </li>
            </ul>
            <div>
                <oscillator-editor
                    :instrument-ref="instrumentRef"
                    :instrument-id="selectedInstrument"
                    :oscillator-index="selectedOscillatorIndex"
                    @invalidate="invalidatePreset"
                />
                <!-- modules -->
                <module-editor
                    :instrument-ref="instrumentRef"
                    :instrument-id="selectedInstrument"
                    @invalidate="invalidatePreset"
                    class="module-editor"
                />
            </div>
        </div>
        <hr class="divider" />
        <!-- current preset -->
        <div class="current-preset">
            <input v-model="presetName"
                   class="preset-name-input"
                   type="text"
                   :placeholder="$t('presetName')"
                   @focus="handleFocusIn"
                   @blur="handleFocusOut"
                   @keyup.enter="savePreset"
            />
            <button v-t="'savePreset'"
                    type="button"
                    @click="savePreset"
            ></button>
        </div>
    </div>
</template>

<script>
import { mapState, mapGetters, mapMutations, mapActions } from "vuex";
import Config            from "@/config";
import ManualURLs        from "@/definitions/manual-urls";
import ModalWindows      from "@/definitions/modal-windows";
import AudioService      from "@/services/audio-service";
import PubSubMessages    from "@/services/pubsub/messages";
import InstrumentFactory from "@/model/factory/instrument-factory";
import { clone }         from "@/utils/object-util";
import SelectBox         from "@/components/forms/select-box";
import OscillatorEditor  from "./components/oscillator-editor/oscillator-editor";
import ModuleEditor      from "./components/module-editor/module-editor";
import messages          from "./messages.json";

let EMPTY_PRESET_VALUE;

export default {
    i18n: { messages },
    components: {
        OscillatorEditor,
        ModuleEditor,
        SelectBox,
    },
    data: () => ({
        oscillatorAmount: Config.OSCILLATOR_AMOUNT,
        currentPreset: null,
        presetName: '',
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
            "hasMidiSupport"
        ]),
        instrument: {
            get() {
                return this.selectedInstrument.toString();
            },
            set( value ) {
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
        instrumentRef() {
            return this.activeSong.instruments[this.selectedInstrument];
        },
        presets() {
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
        instrumentOptions() {
            const out = [];
            for ( let i = 0; i < Config.INSTRUMENT_AMOUNT; ++i ) {
                out.push({ label: this.$t( "instrument", { index: i + 1 }), value: i.toString() });
            }
            return out;
        },
        presetOptions() {
            return this.presets.map(({ presetName }) => ({ label: presetName, value: presetName }));
        },
    },
    watch: {
        async currentPreset(selectedPresetName) {
            if (selectedPresetName !== EMPTY_PRESET_VALUE &&
                this.instrumentRef.presetName !== selectedPresetName) {
                let instrumentPreset;
                try {
                    instrumentPreset = await this.loadInstrument(this.getInstrumentByPresetName(selectedPresetName));
                } catch (e) {
                    return;
                }
                const newInstrument = InstrumentFactory.loadPreset(
                    instrumentPreset, this.selectedInstrument, this.instrumentRef.name
                );
                this.replaceInstrument({ instrumentIndex: this.selectedInstrument, instrument: newInstrument });
                this.presetName = selectedPresetName;
                this.setSelectedOscillatorIndex(0);
                AudioService.cacheAllOscillators(this.selectedInstrument, newInstrument);
                AudioService.applyModules(this.activeSong);
            }
        },
    },
    created() {
        EMPTY_PRESET_VALUE = this.$t('defaultPresetName');
        this.instrument = this.selectedInstrument; // last active instrument in editor will be opened
        this.publishMessage(PubSubMessages.INSTRUMENT_EDITOR_OPENED);
    },
    methods: {
        ...mapMutations([
            "setSelectedInstrument",
            "setSelectedOscillatorIndex",
            "suspendKeyboardService",
            "showError",
            "showNotification",
            "updateInstrument",
            "replaceInstrument",
            "setMidiAssignMode",
            "setPresetName",
            "publishMessage",
            "openModal",
        ]),
        ...mapActions([
            "loadInstrument",
            "saveInstrument",
        ]),
        openHelp() {
            window.open( ManualURLs.INSTRUMENT_EDITOR_HELP, "_blank" );
        },
        openSettingsPanel() {
            this.openModal( ModalWindows.SETTINGS_WINDOW );
        },
        invalidatePreset() {
            if (this.instrumentRef.presetName && !this.instrumentRef.presetName.includes('*')) {
                this.presetName = `${this.instrumentRef.presetName}*`;
            }
        },
        savePreset() {
            let newPresetName = this.presetName || '';
            if (newPresetName.trim().length === 0) {
                this.showError(this.$t('errorNoName'));
            }
            else {
                newPresetName = newPresetName.replace('*', '');
                this.setPresetName({ instrument: this.instrumentRef, presetName: newPresetName });
                if (this.saveInstrument( clone( this.instrumentRef ) )) {
                    this.showNotification({ message: this.$t('instrumentSaved', { name: newPresetName }) });
                }
            }
        },
        /**
         * when typing, we want to suspend the KeyboardController
         * so it doesn't broadcast the typing to its listeners
         */
        handleFocusIn() {
            this.suspendKeyboardService(true);
        },
        /**
         * on focus out, restore the KeyboardControllers broadcasting
         */
        handleFocusOut() {
            this.suspendKeyboardService(false);
        },
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";
@import "@/styles/tabs";
@import "@/styles/forms";

.instrument-editor {
    @include editorComponent();
    @include overlay();
    position: absolute;
    top: 0;
    margin-top: 0;
    @include verticalScrollOnMobile();

    /* ideal size and above (tablet/desktop) */

    @media screen and ( min-width: $ideal-instrument-editor-width )  {
        left: 50%;
        width: $ideal-instrument-editor-width;
        margin-left: -$ideal-instrument-editor-width / 2;
    }

    @media screen and ( min-height: $ideal-instrument-editor-height ) {
        top: 50%;
        margin-top: -$ideal-instrument-editor-height / 2;
        height: $ideal-instrument-editor-height;
    }
}

.preset-title {
    padding: 0 $spacing-medium 0;
    color: #FFF;
    @include toolFont();
}

.actions {
    position: absolute;
    top: $action-button-top;
    right: #{$spacing-xlarge * 2 - $spacing-xxsmall};
}

.instrument-presets {
    @include boxSize();
    padding-left: $spacing-medium;

    @include mobile() {
        border-top: 1px dashed #666;
        padding-top: $spacing-medium;
        margin-top: $spacing-xlarge;
    }
}

.module-editor {
    @media screen and ( min-width: $ideal-instrument-editor-width ) {
        margin-top: -$spacing-small;
        padding: 0 $spacing-medium;
    }
}

.instrument-editor-wrapper {
    padding: 0 $spacing-medium;
}

.current-preset {
    margin: $spacing-small 0 0 $spacing-medium;

    input {
        width: 100%;
        @include large() {
            width: 253px;
        }
    }

    @include mobile() {
        button {
            margin-top: $spacing-small;
            width: 100%;
        }
    }
}

.preset-selector {
    width: 204px;
}
</style>
