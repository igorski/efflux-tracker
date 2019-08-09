/**
* The MIT License (MIT)
*
* Igor Zinken 2016-2019 - https://www.igorski.nl
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
    <div id="settings">
        <div class="header">
            <h2>Settings</h2>
            <button class="close-button"
                    @click="$emit('close')"
            >x</button>
        </div>
        <section id="generalSetup">
            <fieldset>
                <legend>General settings</legend>
                <div class="wrapper select">
                    <label for="parameterInputFormat">Parameter input format</label>
                    <select id="parameterInputFormat"
                            v-model="paramFormat"
                            @change="handleParameterInputFormatChange">
                        <option value="hex">Hexadecimal (00 to FF)</option>
                        <option value="pct">Percentage (0 to 100)</option>
                    </select>
                </div>
                <div class="wrapper checkbox">
                    <label for="trackFollow">Follow playback</label>
                    <select id="trackFollow"
                            v-model="trackFollow"
                            @change="handleTrackFollowChange">
                        <option :value="true">on</option>
                        <option :value="false" selected>off</option>
                    </select>
                </div>
                <div class="wrapper checkbox">
                    <label for="helpPanel">Show help panel</label>
                    <select id="helpPanel"
                            v-model="displayHelpPanel"
                            @change="handleHelpPanelChange">
                        <option :value="true">on</option>
                        <option :value="false" selected>off</option>
                    </select>
                </div>
            </fieldset>
        </section>
        <section id="midiSetup" v-if="hasMIDIsupport">
            <fieldset>
                <legend>MIDI setup</legend>
                <button @click="handleMIDIConnect">Connect to MIDI API</button>
                <div class="wrapper select">
                    <label for="midiDevices">Select a MIDI input device:</label>
                    <select id="midiDevices"
                            v-model="portNumber"
                            @change="handleMIDIDeviceSelect">
                        <template v-if="midiDeviceList.length">
                            <option v-for="(device, index) in midiDeviceList"
                                    :key="`device_${index}`"
                                    :value="device.value"
                            >{{ device.title }}</option>
                        </template>
                        <option v-else value="-1">Connect to MIDI API first.</option>
                    </select>
                </div>
                <p>
                    Note: you can record incoming MIDI notes straight into the patterns by clicking
                    the record button in the transport controls. You can also record live during playback, but
                    keep in mind that the notes will be quantized to the step resolution of the current pattern.
                </p>
            </fieldset>
        </section>
    </div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex';
import MIDIService from '../services/midi-service';
import PubSubMessages from '../services/pubsub/messages';
import { zMIDI } from 'zmidi';

export default {
    data: () => ({
        paramFormat: 'hex',
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
            'getCopy',
            'getSetting',
            'midiMessageHandler',
        ]),
        hasMIDIsupport() {
            return zMIDI.isSupported();
        },
        portNumber: {
            get() {
                return this.midiPortNumber;
            },
            set(value) {
                this.setMIDIPortNumber(value);
            }
        },
    },
    mounted() {
        // load settings from the model

        let setting = this.getSetting( this.settings.INPUT_FORMAT );
        if ( setting !== null )
            this.paramFormat = setting;

        setting = this.getSetting( this.settings.FOLLOW_PLAYBACK );
        if ( setting !== null )
            this.trackFollow = setting;

        setting = this.getSetting( this.settings.DISPLAY_HELP );
        if ( setting !== null )
            this.displayHelpPanel = setting;

        this.portNumber = this.midiPortNumber;
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
        handleMIDIConnect() {
            zMIDI.connect(this.handleMIDIconnectSuccess, this.handleMIDIconnectFailure);
        },
        handleMIDIconnectSuccess() {
            if (zMIDI.getInChannels().length === 0) {
                return this.handleMIDIconnectFailure();
            }
            this.showAvailableMIDIDevices(zMIDI.getInChannels());
            this.publishMessage(PubSubMessages.MIDI_CONNECTED);
            this.showNotification({ message: this.getCopy('MIDI_CONNECTED') });
        },
        handleMIDIconnectFailure() {
            this.showNotification({ title: this.getCopy('ERROR'), message: this.getCopy('MIDI_FAILURE') });
        },
        handleMIDIDeviceSelect() {
            // first clean up all old listeners
            let amountOfPorts = zMIDI.getInChannels().length;

            while ( amountOfPorts-- )
                zMIDI.removeMessageListener(amountOfPorts);

            // add listener and bind root store to MIDI event handler
            zMIDI.addMessageListener(this.portNumber, MIDIService.handleMIDIMessage);

            const device = zMIDI.getInChannels()[ this.portNumber ];
            this.showNotification({ message:
                this.getCopy( 'MIDI_ENABLED', `${device.manufacturer} ${device.name}` )
            });
        },
        showAvailableMIDIDevices(inputs) {
            this.createMIDIDeviceList(inputs);

            // auto select first device if there is only one available
            if (this.midiDeviceList.length === 1 ) {
                this.portNumber = this.midiDeviceList[0].value;
                this.handleMIDIDeviceSelect();
            }
        }
    }
};
</script>

<style lang="scss">
    @import '@/styles/_variables.scss';
    @import '@/styles/_layout.scss';

    #settings
    {
      @include EditorComponent();
      @include Overlay();

      label {
        min-width: 150px;
        display: inline-block;
      }
    }
    
    #midiSetup
    {
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
    
    $settingsWidth: 500px;
    $settingsHeight: 500px;
    
    @media screen and ( min-width: $settingsWidth) and ( min-height: $settingsHeight )
    {
      #settings {
        width: $settingsWidth;
        height: $settingsHeight;
        top: 50%;
        left: 50%;
        margin-left: -( $settingsWidth / 2 );
        margin-top: -( $settingsHeight / 2 );
      }
    }

</style>
 