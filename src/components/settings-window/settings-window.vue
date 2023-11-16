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
    <div class="settings">
        <div class="header">
            <h2 v-t="'title'"></h2>
            <button
                type="button"
                class="close-button"
                @click="$emit('close')"
            >x</button>
        </div>
        <hr class="divider" />
        <section>
            <fieldset>
                <legend v-t="'generalSettings'"></legend>
                <div class="wrapper toggle">
                    <label v-t="'showHelpPanel'" class="label"></label>
                    <toggle-button
                        v-model="displayHelpPanel"
                        sync
                    />
                </div>
                <div class="wrapper toggle">
                    <label v-t="'showWelcomeOnStartup'" class="label"></label>
                    <toggle-button
                        v-model="showHelpOnStartup"
                        sync
                    />
                </div>
            </fieldset>
            <fieldset>
                <legend v-t="'sequencerSettings'"></legend>
                <div class="wrapper select">
                    <label v-t="'parameterInputFormat'" class="label"></label>
                    <select-box
                        v-model="paramFormatType"
                        :options="paramFormatOptions"
                        class="param-select"
                    />
                </div>
                <div class="wrapper toggle">
                    <label v-t="'followPlayback'" class="label"></label>
                    <toggle-button
                        v-model="trackFollow"
                        sync
                    />
                </div>
                <div class="wrapper toggle">
                    <label v-t="'usePatternOrders'" class="label"></label>
                    <toggle-button
                        v-model="usePatternOrders"
                        :disabled="!canUseOrders"
                        sync
                    />
                </div>
            </fieldset>
        </section>
        <section id="midiSetup" v-if="hasMidiSupport">
            <fieldset>
                <legend v-t="'midiSetup'"></legend>
                <div class="pane">
                    <button
                        v-if="!midiConnected"
                        v-t="'midiConnectToAPI'"
                        type="button"
                        @click="connectMidiDevices"
                    ></button>
                    <button
                        v-else
                        v-t="'manageMidiPresets'"
                        type="button"
                        @click="openMIDIPresetManager"
                    ></button>
                    <div class="wrapper select">
                        <label v-t="'deviceSelectLabel'" class="padded-label"></label>
                        <select-box
                            v-model="portNumber"
                            :options="midiDeviceOptions"
                            :disabled="!midiConnected"
                            class="param-select"
                        />
                    </div>
                </div>
                <div class="pane">
                    <p
                        v-t="'midiDescription'"
                        class="description"
                    ></p>
                </div>
            </fieldset>
        </section>
    </div>
</template>

<script lang="ts">
import { mapState, mapGetters, mapMutations } from "vuex";
import { zMIDI } from "zmidi";
import { ToggleButton } from "vue-js-toggle-button";
import SelectBox from "@/components/forms/select-box.vue";
import ModalWindows from "@/definitions/modal-windows";
import MIDIService from "@/services/midi-service";
import PubSubMessages from "@/services/pubsub/messages";
import { PROPERTIES } from "@/store/modules/settings-module";

import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        SelectBox,
        ToggleButton,
    },
    computed: {
        ...mapState({
            midiPortNumber : state => state.midi.midiPortNumber,
            midiDeviceList : state => state.midi.midiDeviceList,
            midiConnected  : state => state.midi.midiConnected,
        }),
        ...mapGetters([
            "activeSong",
            "displayHelp",
            "displayWelcome",
            "followPlayback",
            "midiMessageHandler",
            "paramFormat",
            "hasMidiSupport",
            "useOrders",
        ]),
        canUseOrders(): boolean {
            return this.activeSong.patterns.length === this.activeSong.order.length;
        },
        displayHelpPanel: {
            get(): boolean {
                return this.displayHelp;
            },
            set( value: boolean ): void {
                this.saveSetting({ name: PROPERTIES.DISPLAY_HELP, value });
            }
        },
        paramFormatType: {
            get(): boolean {
                return this.paramFormat;
            },
            set( value: boolean ): void {
                this.saveSetting({ name: PROPERTIES.INPUT_FORMAT, value });
            }
        },
        trackFollow: {
            get(): boolean {
                return this.followPlayback;
            },
            set( value: boolean ): void {
                this.saveSetting({ name: PROPERTIES.FOLLOW_PLAYBACK, value });
            }
        },
        showHelpOnStartup: {
            get(): boolean {
                return this.displayWelcome;
            },
            set( value: boolean ): void {
                this.saveSetting({ name: PROPERTIES.DISPLAY_WELCOME, value });
            }
        },
        usePatternOrders: {
            get(): boolean {
                return this.useOrders;
            },
            set( value: boolean ): void {
                this.saveSetting({ name: PROPERTIES.USE_ORDERS, value });
            },
        },
        portNumber: {
            get(): string {
                return this.midiPortNumber.toString();
            },
            set( value: string ): void {
                this.setMidiPortNumber( parseFloat( value ));
            }
        },
        paramFormatOptions(): { label: string, value: string }[] {
            return [
                { label: this.$t( "hex" ), value: "hex" },
                { label: this.$t( "pct" ), value: "pct" }
            ];
        },
        midiDeviceOptions(): { label: string, value: string }[] {
            if ( !this.midiDeviceList.length ) {
                return [{ label: this.$t( "connectDevice" ), value: "-1" }];
            }
            return this.midiDeviceList.map(({ title, port }) => ({
                label: title,
                value: port.toString()
            }));
        },
    },
    watch: {
        portNumber( value: number ): void {
            // first clean up all old listeners
            let amountOfPorts = zMIDI.getInChannels().length;

            while ( amountOfPorts-- ) {
                zMIDI.removeMessageListener( amountOfPorts );
            }
            // add listener and bind root store to MIDI event handler
            zMIDI.addMessageListener( value, MIDIService.handleMIDIMessage );

            const device = zMIDI.getInChannels()[ value ];
            this.showNotification({ message:
                this.$t( "midiEnabled", { device: `${device.manufacturer} ${device.name}` })
            });
        },
    },
    destroyed(): void {
        if ( this.changeListener ) {
            zMIDI.removeChangeListener( this.changeListener );
        }
    },
    methods: {
        ...mapMutations([
            "saveSetting",
            "showNotification",
            "createMidiDeviceList",
            "setMidiPortNumber",
            "openModal",
            "publishMessage",
        ]),
        connectMidiDevices(): void {
            zMIDI.connect()
                 .then( this.handleMIDIconnectSuccess )
                 .catch( this.handleMIDIconnectFailure );
        },
        handleMIDIconnectSuccess( inputs: WebMidi.MIDIInput[] ): void {
            // add status change listener to handle device connection events
            if ( !this.changeListener ) {
                this.changeListener = this.handleMIDIconnectSuccess.bind( this );
                zMIDI.addChangeListener( this.changeListener );
            }
            this.createMidiDeviceList( inputs );
            if ( inputs.length === 0 ) {
                this.showNotification({ message: this.$t( "noMidiDevices" )});
                return;
            }
            this.publishMessage( PubSubMessages.MIDI_CONNECTED );

            // when there is no selected port yet, auto select first device
            // as soon as one becomes available
            if ( this.midiPortNumber === -1 && this.midiDeviceList.length > 0 ) {
                this.setMidiPortNumber( this.midiDeviceList[ 0 ].port );
            }
        },
        handleMIDIconnectFailure(): void {
            this.showNotification({ title: this.$t( "error" ), message: this.$t( "midiFailure" ) });
        },
        openMIDIPresetManager(): void {
            this.openModal( ModalWindows.MIDI_PRESET_MANAGER );
        },
    }
};
</script>

<style lang="scss" scoped>
@use "sass:math";

@import "@/styles/_mixins";
@import "@/styles/forms";

$width: 550px;
$height: 575px;

.settings {
    @include editorComponent();
    @include overlay();
    padding: $spacing-small $spacing-large;

    .divider {
        width: calc(100% + #{$spacing-large * 2});
        margin-left: -$spacing-large;
        margin-bottom: $spacing-medium;
    }

    .label {
        min-width: 225px;
        display: inline-block;
    }

    @include componentIdeal( $width, $height ) {
        width: $width;
        height: $height;
        top: 50%;
        left: 50%;
        margin-left: math.div( -$width, 2 );
        margin-top: math.div( -$height, 2 );

        .pane {
            display: inline-block;
            vertical-align: top;
            width: 50%;

            .description {
                margin-top: 0;
            }
        }
    }

    @include componentFallback( $width, $height ) {
        @include verticalScrollOnMobile();
    }
}

#midiSetup {
    .wrapper {
        label, select {
            display: block;
        }
        select {
            width: 100%;
            overflow:hidden;
            white-space:nowrap;
            text-overflow:ellipsis;
        }
        select option {
            width: inherit;
            text-overflow:ellipsis;
            overflow:hidden;
        }
    }
}

.param-select {
    width: 200px;
}

.wrapper.toggle {
    margin: $spacing-small 0;
}
</style>
