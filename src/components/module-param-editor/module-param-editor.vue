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
    <div class="module-param-editor">
        <div class="header">
            <h2 v-t="'title'"></h2>
            <button type="button" class="help-button" @click="handleHelp">?</button>
            <button type="button" class="close-button" @click="handleClose">x</button>
        </div>
        <hr class="divider" />
        <ul id="moduleSelect">
            <ul class="event">
                <form-list-item
                    v-t="'volume'"
                    v-model="module"
                    :option-value="automationParam('volume')"
                />
                <template v-if="supportsPanning">
                    <form-list-item
                        v-t="'panLeft'"
                        v-model="module"
                        :option-value="automationParam('panLeft')"
                    />
                    <form-list-item
                        v-t="'panRight'"
                        v-model="module"
                        :option-value="automationParam('panRight')"
                    />
                </template>
                <form-list-item
                    v-t="'pitchUp'"
                    v-model="module"
                    :option-value="automationParam('pitchUp')"
                />
                <form-list-item
                    v-t="'pitchDown'"
                    v-model="module"
                    :option-value="automationParam('pitchDown')"
                />
            </ul>
            <ul class="filter">
                <form-list-item
                    v-t="'filterOnOff'"
                    v-model="module"
                    :option-value="automationParam('filterEnabled')"
                />
                <form-list-item
                    v-t="'filterFreq'"
                    v-model="module"
                    :option-value="automationParam('filterFreq')"
                />
                <form-list-item
                    v-t="'filterQ'"
                    v-model="module"
                    :option-value="automationParam('filterQ')"
                />
                <form-list-item
                    v-t="'filterLfoOnOff'"
                    v-model="module"
                    :option-value="automationParam('filterLFOEnabled')"
                />
                <form-list-item
                    v-t="'filterLfoSpeed'"
                    v-model="module"
                    :option-value="automationParam('filterLFOSpeed')"
                />
                <form-list-item
                    v-t="'filterLfoDepth'"
                    v-model="module"
                    :option-value="automationParam('filterLFODepth')"
                />
            </ul>
            <ul class="delay">
                <form-list-item
                    v-t="'delayOnOff'"
                    v-model="module"
                    :option-value="automationParam('delayEnabled')"
                />
                <form-list-item
                    v-t="'delayTime'"
                    v-model="module"
                    :option-value="automationParam('delayTime')"
                />
                <form-list-item
                    v-t="'delayFeedback'"
                    v-model="module"
                    :option-value="automationParam('delayFeedback')"
                />
                <form-list-item
                    v-t="'delayDry'"
                    v-model="module"
                    :option-value="automationParam('delayDry')"
                />
                <form-list-item
                    v-t="'delayCutoff'"
                    v-model="module"
                    :option-value="automationParam('delayCutoff')"
                />
                <form-list-item
                    v-t="'delayOffset'"
                    v-model="module"
                    :option-value="automationParam('delayOffset')"
                />
            </ul>
        </ul>
        <fieldset>
            <div class="wrapper input">
                <h2 v-t="'useGlide'"></h2>
                <toggle-button
                    v-model="glide"
                    sync
                />
            </div>
            <div class="wrapper input range">
                <label v-t="'parameterValue'" for="moduleValue"></label>
                <input
                    v-model.number="value"
                    type="range"
                    min="0" max="100" step="1"
                />
                <div id="moduleInputValue" v-html="valueText"></div>
            </div>
            <p v-t="'fastEditDescr'"></p>
            <button
                v-t="'ok'"
                type="button"
                class="confirm-button"
                @click="handleSubmit()"
            ></button>
        </fieldset>
    </div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from "vuex";
import ToggleButton from "@/components/third-party/vue-js-toggle-button/ToggleButton.vue";
import EventFactory from "@/model/factories/event-factory";
import KeyboardService from "@/services/keyboard-service";
import ModuleParamHandler from "@/services/keyboard/module-param-handler";
import ManualURLs from "@/definitions/manual-urls";
import { supports } from "@/services/audio/webaudio-helper";
import FormListItem from "../forms/form-list-item.vue";
import messages from "./messages.json";

import {
    DELAY_ENABLED, DELAY_FEEDBACK, DELAY_DRY, DELAY_CUTOFF, DELAY_TIME, DELAY_OFFSET,
    FILTER_ENABLED, FILTER_FREQ, FILTER_Q, FILTER_LFO_ENABLED,
    FILTER_LFO_SPEED, FILTER_LFO_DEPTH,
    PAN_LEFT, PAN_RIGHT, PITCH_UP, PITCH_DOWN,
    VOLUME
} from "@/definitions/automatable-parameters";

const DEFAULT_MODULE = VOLUME;
let lastValueTypeAction = 0, lastValueChar = 0;

export default {
    emits: [ "close" ],
    i18n: { messages },
    components: {
        FormListItem,
        ToggleButton,
    },
    data: () => ({
        instrument: null,
        module: DEFAULT_MODULE,
        glide: false,
        value: 0,
        patternIndex: 0,
        channelIndex: 0,
        step: 0,
        supportsPanning: false,
    }),
    computed: {
        ...mapState({
            activeSong: state => state.song.activeSong,
            selectedInstrument: state => state.editor.selectedInstrument,
            selectedStep: state => state.editor.selectedStep,
        }),
        ...mapGetters([
            "activePatternIndex",
        ]),
        valueText() {
            const value = this.value.toFixed(2);
            return ( this.value < 10 ) ? `0${value}` : value;
        },
    },
    mounted() {
        const pattern = this.activeSong.patterns[ this.activePatternIndex ],
              channel = pattern.channels[ this.selectedInstrument ],
              event   = channel[ this.selectedStep ];

        this.instrument   = event?.instrument || this.selectedInstrument;
        this.module       = event?.mp?.module ?? DEFAULT_MODULE;
        this.glide        = event?.mp?.glide  ?? false;
        this.value        = event?.mp?.value  ?? 50;

        // we define these upfront as we assume that the position the sequencer had (when running) is
        // where we would like to add/edit a module parameter change event

        this.patternIndex = this.activePatternIndex;
        this.channelIndex = this.selectedInstrument; // always use channel index (event instrument might be associated w/ different channel lane)
        this.step         = this.selectedStep;

        KeyboardService.setBlockDefaults( false );
        KeyboardService.setListener( this.handleKey );

        this.supportsPanning = supports("panning");
    },
    beforeUnmount() {
        KeyboardService.reset();
    },
    methods: {
        ...mapMutations([
            "addEventAtPosition",
        ]),
        handleClose() {
            this.$emit("close");
        },
        automationParam(key) {
            switch (key) {
                default:
                    throw new Error(`Param ${key} is not a valid module automation`);
                case "volume": return VOLUME;
                case "panLeft": return PAN_LEFT;
                case "panRight": return PAN_RIGHT;
                case "pitchUp": return PITCH_UP;
                case "pitchDown": return PITCH_DOWN;
                case "filterEnabled": return FILTER_ENABLED;
                case "filterFreq": return FILTER_FREQ;
                case "filterQ": return FILTER_Q;
                case "filterLFOEnabled": return FILTER_LFO_ENABLED;
                case "filterLFOSpeed": return FILTER_LFO_SPEED;
                case "filterLFODepth": return FILTER_LFO_DEPTH;
                case "delayEnabled": return DELAY_ENABLED;
                case "delayTime": return DELAY_TIME;
                case "delayFeedback": return DELAY_FEEDBACK;
                case "delayDry": return DELAY_DRY;
                case "delayCutoff": return DELAY_CUTOFF;
                case "delayOffset": return DELAY_OFFSET;
            }
        },
        /**
         * invoked by KeyboardService
         */
        handleKey( type, keyCode/*, event*/ ) {
            if ( type !== "down" ) {
                return true; // always block
            }
            switch ( keyCode ) {
                // modules and parameters

                default:
                    this.module = ModuleParamHandler.selectModuleByKeyAction( keyCode, this.module ) || DEFAULT_MODULE;
                    break;

                case 27: // escape
                    this.handleClose();
                    break;

                case 13: // enter
                    this.handleSubmit();
                    break;

                case 71: // G
                    this.glide = !this.glide;
                    break;

                // module parameter value

                case 48: // 0 through 9
                case 49:
                case 50:
                case 51:
                case 52:
                case 53:
                case 54:
                case 55:
                case 56:
                case 57:

                    const now = Date.now();
                    const num = parseFloat( String.fromCharCode( keyCode ));
                    let value = num * 10;

                    // if this character was typed shortly after the previous one, combine
                    // their numerical values for more precise control

                    if ( now - lastValueTypeAction < 500 ) {
                        value = parseFloat( '' + lastValueChar + num );
                    }
                    this.value = value;
                    lastValueTypeAction = now;
                    lastValueChar = num;
                    break;
            }
            return true;
        },
        handleSubmit() {
            const pattern = this.activeSong.patterns[ this.patternIndex ],
                  channel = pattern.channels[ this.channelIndex ];

            let event        = channel[ this.step ];
            const isNewEvent = !event;

            if ( isNewEvent ) {
                event = EventFactory.create();
            }

            event.mp = {
                module: this.module,
                value: this.value,
                glide: this.glide
            };
            event.instrument = this.instrument;

            this.addEventAtPosition({
                event,
                store: this.$store,
                optData: {
                    patternIndex : this.patternIndex,
                    channelIndex : this.channelIndex,
                    step         : this.step,
                    newEvent     : isNewEvent
                }
            });
            this.handleClose();
        },
        handleHelp() {
            window.open( ManualURLs.PARAM_ENTRY, "_blank" );
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

$width: 450px;
$height: 485px;

.module-param-editor {
    @include mixins.editorComponent();
    @include mixins.overlay();
    @include mixins.noSelect();
    padding: variables.$spacing-small variables.$spacing-large;
    border-radius: variables.$spacing-small;
    box-shadow: 0 0 25px rgba(0,0,0,.5);

    .wrapper.range {
        label {
            display: inline;
        }
        input {
            width: 90%;
            display: inline;
            margin-left: variables.$spacing-medium;
        }
    }

    @include mixins.componentIdeal( $width, $height ) {
        top: 50%;
        left: 50%;
        width: $width;
        height: $height;
        margin-left: math.div( -$width, 2 );
        margin-top: math.div( -$height, 2 );

        .wrapper.range input {
            width: 55%;
        }
    }

    @include mixins.componentFallback( $width, $height ) {
        border-radius: 0;
        width: 100%;
        @include mixins.verticalScrollOnMobile();
    }

    .divider {
        width: calc(100% + #{variables.$spacing-large * 2});
        margin: variables.$spacing-medium 0 variables.$spacing-medium -#{variables.$spacing-large};
    }

    fieldset {
        border: none;
        padding: variables.$spacing-medium 0;
    }

    #instrument {
        width: 120px;
    }

    #moduleSelect {
        @include mixins.list();
        position: relative;

        ul {
            @include mixins.list();
            @include mixins.flex();
        }

        li {
            float: left;
            cursor: pointer;
            position: relative;
            background-color: colors.$color-2;
            vertical-align: top;
            color: #000;
            font-weight: bold;
            padding: variables.$spacing-small variables.$spacing-medium;
            border-right: 1px solid #000;
            border-bottom: 1px solid #000;
            flex-grow: 1;
            font-size: 80%;

            &.selected, &:hover {
                background-color: colors.$color-1;
            }

            &:after {
                position: absolute;
                bottom: variables.$spacing-small;
                left: variables.$spacing-small;
                pointer-events: none;
            }
        }
    }

    fieldset {

        h2 {
            padding-left: 0;
        }
    }

    #moduleInputValue {
        color: colors.$color-1;
        font-weight: bold;
        font-style: italic;
        display: inline;
        margin-left: variables.$spacing-medium;
    }

    .confirm-button {
        width: 100%;
        padding: variables.$spacing-medium variables.$spacing-large;
    }
}
</style>
