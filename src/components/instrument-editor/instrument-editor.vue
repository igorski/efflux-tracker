/**
* The MIT License (MIT)
*
* Igor Zinken 2019 - https://www.igorski.nl
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
    <div id="instrumentEditor">
        <div class="header">
            <h2>Instrument editor</h2>
            <button class="help-button"
                    @click="openHelp">?</button>
            <button class="close-button"
                    @click="$emit('close')">x</button>

            <!-- selector that switches between available instruments -->
            <select id="instrumentSelect"
                    v-model.number="instrument"
            >
                <option v-for="(instrument, idx) in instrumentAmount"
                        :key="`instrument_${idx}`"
                        :value="idx"
                >Instrument {{ instrument }}</option>
            </select>
        </div>

        <!-- part 1 : oscillator editor -->
        <ul id="oscillatorTabs" class="tab-list">
            <li v-for="(oscillator, idx) in oscillatorAmount"
                :key="`oscillator_${idx}`"
                :class="{ active: activeOscillatorIndex === idx }"
                @click="setActiveOscillatorIndex(idx)"
            >
                Oscillator {{ idx + 1 }}
            </li>
        </ul>
        <div>
            <oscillator-editor
                :instrument-ref="instrumentRef"
                :instrument-id="activeInstrument"
                :oscillator-index="activeOscillatorIndex"
                @invalidate="invalidatePreset"
            />

            <!-- part 2: modules -->
            <module-editor
                :instrument-ref="instrumentRef"
                :instrument-id="activeInstrument"
                @invalidate="invalidatePreset"
            />
        </div>

        <section id="instrumentPresets">
            <h2>Presets</h2>
            <select v-model="currentPreset">
                <option v-for="(instrument, idx) in presets"
                        :key="`preset_${idx}`"
                        :value="instrument.presetName"
                >{{ instrument.presetName }}</option>
            </select>
            <div class="save">
                <input v-model="presetName"
                       type="text"
                       placeholder="preset name"
                       @focus="handleFocusIn"
                       @blur="handleFocusOut"
                       @keyup.enter="savePreset"
                />
                <button type="button"
                        @click="savePreset"
                >Save preset</button>
            </div>
        </section>
    </div>
</template>

<script>
import { mapState, mapGetters, mapMutations, mapActions } from 'vuex';
import Config from '../../config';
import ManualURLs from '../../definitions/manual-urls';
import AudioService from '../../services/audio-service';
import InstrumentFactory from '../../model/factory/instrument-factory';
import OscillatorEditor from './components/oscillator-editor';
import ModuleEditor from './components/module-editor';
import ObjectUtil from '../../utils/object-util';

let EMPTY_PRESET_VALUE;

export default {
    components: {
        OscillatorEditor,
        ModuleEditor,
    },
    data: () => ({
        instrumentAmount: Config.INSTRUMENT_AMOUNT,
        oscillatorAmount: Config.OSCILLATOR_AMOUNT,
        currentPreset: null,
    }),
    computed: {
        ...mapState({
            activeSong: state => state.song.activeSong,
            activeInstrument: state => state.editor.activeInstrument,
            activeOscillatorIndex: state => state.instrument.activeOscillatorIndex,
            instruments: state => state.instrument.instruments,
        }),
        ...mapGetters([
            'getCopy',
            'getInstrumentByPresetName',
        ]),
        instrument: {
            get() {
                return this.activeInstrument;
            },
            set(value) {
                this.setActiveInstrument(value); // allows live keyboard/MIDI playing to use new instrument
                const instrumentPresetName = this.instrumentRef.presetName;
                if (this.presets.find(({ presetName }) => presetName === instrumentPresetName)) {
                    this.currentPreset = instrumentPresetName;
                } else {
                    this.currentPreset = EMPTY_PRESET_VALUE;
                }
            },
        },
        instrumentRef() {
            return this.activeSong.instruments[this.activeInstrument];
        },
        presets() {
            const out = [
                ...this.instruments,
                { presetName: this.getCopy('INPUT_PRESET')}
            ];
            return out.sort(( a, b ) => {
                if( a.presetName < b.presetName ) return -1;
                if( a.presetName > b.presetName ) return 1;
                return 0;
            });
        },
        presetName: {
            get() {
                return this.instrumentRef.presetName;
            },
            set(value) {
                this.setPresetName({ instrument: this.instrumentRef, presetName: value });
            },
        },
    },
    watch: {
        currentPreset(selectedPresetName) {
            if (selectedPresetName !== EMPTY_PRESET_VALUE &&
                this.instrumentRef.presetName !== selectedPresetName) {
                const instrumentPreset = this.getInstrumentByPresetName(selectedPresetName);
                if (!instrumentPreset) {
                    return;
                }
                const newInstrument = InstrumentFactory.loadPreset(
                    instrumentPreset, this.activeInstrument, this.instrumentRef.name
                );
                this.replaceInstrument({ instrumentIndex: this.activeInstrument, instrument: newInstrument });
                this.presetName = selectedPresetName;
                this.setActiveOscillatorIndex(0);
                AudioService.cacheAllOscillators(this.activeInstrument, newInstrument);
                AudioService.applyModules(this.activeSong);
            }
        },
    },
    created() {
        EMPTY_PRESET_VALUE = this.getCopy('INPUT_PRESET');
        this.instrument = this.activeInstrument; // last active instrument in editor will be opened
    },
    methods: {
        ...mapMutations([
            'setActiveInstrument',
            'setActiveOscillatorIndex',
            'suspendKeyboardService',
            'showError',
            'showNotification',
            'updateInstrument',
            'replaceInstrument',
            'setPresetName',
        ]),
        ...mapActions([
            'saveInstrument',
        ]),
        openHelp() {
            window.open(ManualURLs.INSTRUMENT_EDITOR_HELP, '_blank');
        },
        invalidatePreset() {
            if (this.instrumentRef.presetName && !this.instrumentRef.presetName.includes('*')) {
                this.presetName = `${this.instrumentRef.presetName}*`;
            }
        },
        savePreset() {
            const newPresetName = this.presetName || '';
            if (newPresetName.trim().length === 0) {
                this.showError(this.getCopy('ERROR_NO_INS_NAME'));
            }
            else {
                this.presetName = newPresetName.replace('*', '');
                if (this.saveInstrument( ObjectUtil.clone( this.instrumentRef ) )) {
                    this.showNotification({ message: this.getCopy('INSTRUMENT_SAVED', newPresetName ) });
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

<style lang='scss' scoped>
    @import '@/styles/_layout.scss';

    #instrumentEditor {
      @include EditorComponent();
      @include Overlay();

      height: auto;
    }

    #instrumentSelect {
      position: absolute;
      top: 11px;
      right: 78px;
    }

    #instrumentPresets {
      display: inline-block;
      width: 100%;

      .save {
        float: right;
      }
    }

    /* ideal size and above (tablet/desktop) */

    @media screen and ( min-width: $idealInstrumentEditorWidth ) {
      #instrumentEditor {
        top: 50%;
        left: 50%;
        width: $idealInstrumentEditorWidth;
        margin-left: -$idealInstrumentEditorWidth / 2;
        margin-top: -$idealInstrumentEditorHeight / 2;
      }
    }

    /* mobile */

    @media screen and ( max-width: $idealInstrumentEditorWidth ) {
      #instrumentEditor {
        position: absolute;
      }

      #instrumentSelect {
        top: .25em;
      }

      #instrumentPresets {
        @include boxSize();
        padding: 0 1em;

        h2 {
          width: 100%;
        }
        select {
          display: block;
          width: 100%;
          margin: 0 auto;
        }
        .save {
          float: none;
          margin-top: .5em;
          input {
            width: auto;
          }
          button {
            float: right;
          }
        }
      }
    }
</style>
 