/**
* The MIT License (MIT)
*
* Igor Zinken 2016-2021 - https://www.igorski.nl
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
            <button class="close-button"
                    @click="$emit('close')"
            >x</button>
        </div>
        <hr class="divider" />
        <section>
            <fieldset>
                <legend v-t="'generalSettings'"></legend>
                <div class="wrapper toggle">
                    <label v-t="'showHelpPanel'"></label>
                    <toggle-button
                        v-model="displayHelpPanel"
                        @change="handleHelpPanelChange"
                        sync
                    />
                </div>
                <div class="wrapper toggle">
                    <label v-t="'showHelpStartup'"></label>
                    <toggle-button
                        v-model="showHelpOnStartup"
                        sync
                    />
                </div>
            </fieldset>
            <fieldset>
                <legend v-t="'sequencerSettings'"></legend>
                <div class="wrapper select">
                    <label v-t="'parameterInputFormat'"></label>
                    <select-box
                        v-model="paramFormat"
                        :options="paramFormatOptions"
                        @input="handleParameterInputFormatChange"
                        class="param-select"
                    />
                </div>
                <div class="wrapper toggle">
                    <label v-t="'followPlayback'"></label>
                    <toggle-button
                        v-model="trackFollow"
                        @change="handleTrackFollowChange"
                        sync
                    />
                </div>
            </fieldset>
        </section>
        <section id="midiSetup" v-if="hasMIDIsupport">
            <fieldset>
                <legend v-t="'midiSetup'"></legend>
                <div class="pane">
                    <button
                        v-t="'midiConnectToAPI'"
                        @click="connectMidiDevices"
                    ></button>
                    <div class="wrapper select">
                        <label v-t="'deviceSelectLabel'" class="padded-label"></label>
                        <select-box
                            v-model="portNumber"
                            :options="midiDeviceOptions"
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

<script>
import { mapState, mapGetters, mapMutations } from "vuex";
import { zMIDI } from "zmidi";
import { ToggleButton } from "vue-js-toggle-button";
import SelectBox from "@/components/forms/select-box";
import MIDIService from "@/services/midi-service";
import PubSubMessages from "@/services/pubsub/messages";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        SelectBox,
        ToggleButton,
    },
    data: () => ({
        paramFormat: "hex",
        trackFollow: false,
        displayHelpPanel: true,
    }),
    computed: {
        ...mapState({
            midiPortNumber: state => state.midi.midiPortNumber,
            midiDeviceList: state => state.midi.midiDeviceList,
            settings: state => state.settings.PROPERTIES,
        }),
        ...mapGetters([
            "displayWelcome",
            "getSetting",
            "midiMessageHandler",
        ]),
        hasMIDIsupport() {
            return zMIDI.isSupported();
        },
        showHelpOnStartup: {
            get() {
                return this.displayWelcome;
            },
            set( value ) {
                this.saveSetting(
                    { name: this.settings.DISPLAY_WELCOME, value }
                );
            }
        },
        portNumber: {
            get() {
                return this.midiPortNumber.toString();
            },
            set( value ) {
                this.setMIDIPortNumber( parseFloat( value ));
            }
        },
        paramFormatOptions() {
            return [
                { label: this.$t( "hex" ), value: "hex" },
                { label: this.$t( "pct" ), value: "pct" }
            ];
        },
        midiDeviceOptions() {
            if ( !this.midiDeviceList.length ) {
                return [{ label: this.$t( "connectMidiFirst" ), value: "-1" }];
            }
            return this.midiDeviceList.map(({ title, value }) => ({
                label: title,
                value: value.toString()
            }));
        },
    },
    watch: {
        portNumber( value ) {
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
    mounted() {
        // load settings from the model
        let setting = this.getSetting( this.settings.INPUT_FORMAT );
        if ( setting !== null ) {
            this.paramFormat = setting;
        }
        setting = this.getSetting( this.settings.FOLLOW_PLAYBACK );
        if ( setting !== null ) {
            this.trackFollow = setting;
        }
        setting = this.getSetting( this.settings.DISPLAY_HELP );
        if ( setting !== null ) {
            this.displayHelpPanel = setting;
        }
    },
    destroyed() {
        if ( this.changeListener ) {
            zMIDI.removeChangeListener?.( this.changeListener );
        }
    },
    methods: {
        ...mapMutations([
            'saveSetting',
            'showNotification',
            'createMIDIDeviceList',
            'setMIDIPortNumber',
            'publishMessage',
        ]),
        handleParameterInputFormatChange() {
            this.saveSetting(
                { name: this.settings.INPUT_FORMAT, value: this.paramFormat }
            );
        },
        handleTrackFollowChange() {
            this.saveSetting(
                { name: this.settings.FOLLOW_PLAYBACK, value: this.trackFollow }
            );
        },
        handleHelpPanelChange() {
            this.saveSetting(
                { name: this.settings.DISPLAY_HELP, value: this.displayHelpPanel }
            );
        },
        connectMidiDevices() {
            zMIDI.connect()
                 .then( this.handleMIDIconnectSuccess )
                 .catch( this.handleMIDIconnectFailure );
        },
        handleMIDIconnectSuccess( inputs ) {
            // add status change listener to handle device connection events
            if ( !this.changeListener ) {
                this.changeListener = this.handleMIDIconnectSuccess.bind( this );
                zMIDI.addChangeListener( this.changeListener );
            }
            this.createMIDIDeviceList( inputs );
            if ( inputs.length === 0 ) {
                this.showNotification({ message: this.$t( "noMidiDevices" )});
                return;
            }
            this.publishMessage( PubSubMessages.MIDI_CONNECTED );

            // auto select first device if there is only one available
            if ( this.midiDeviceList.length === 1 ) {
                this.portNumber = this.midiDeviceList[ 0 ].value;
            }
        },
        handleMIDIconnectFailure() {
            this.showNotification({ title: this.$t( "error" ), message: this.$t( "midiFailure" ) });
        },
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";
@import "@/styles/forms";

$width: 550px;
$height: 550px;

.settings {
    @include editorComponent();
    @include overlay();
    padding: $spacing-small $spacing-large;

    .divider {
        width: calc(100% + #{$spacing-large * 2});
        margin-left: -$spacing-large;
        margin-bottom: $spacing-medium;
    }

    label {
        min-width: 150px;
        display: inline-block;
    }

    @media screen and ( min-width: $width) and ( min-height: $height ) {
        width: $width;
        height: $height;
        top: 50%;
        left: 50%;
        margin-left: -( $width / 2 );
        margin-top: -( $height / 2 );

        .pane {
            display: inline-block;
            vertical-align: top;
            width: 50%;

            .description {
                margin-top: 0;
            }
        }
    }

    @media screen and ( max-width: $width ), ( max-height: $height ) {
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
