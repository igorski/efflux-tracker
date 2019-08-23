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
    <div class="settings">
        <div class="header">
            <h2 v-t="'title'"></h2>
            <button class="close-button"
                    @click="$emit('close')"
            >x</button>
        </div>
        <section id="generalSetup">
            <fieldset>
                <legend v-t="'generalSettings'"></legend>
                <div class="wrapper select">
                    <label v-t="'parameterInputFormat'" for="parameterInputFormat"></label>
                    <select id="parameterInputFormat"
                            v-model="paramFormat"
                            @change="handleParameterInputFormatChange">
                        <option v-t="'hex" value="hex"></option>
                        <option v-t="'pct" value="pct"></option>
                    </select>
                </div>
                <div class="wrapper checkbox">
                    <label v-t="'followPlayback'" for="trackFollow"></label>
                    <select id="trackFollow"
                            v-model="trackFollow"
                            @change="handleTrackFollowChange">
                        <option v-t="'on'" :value="true"></option>
                        <option v-t="'off'" :value="false"></option>
                    </select>
                </div>
                <div class="wrapper checkbox">
                    <label for="helpPanel">Show help panel</label>
                    <select id="helpPanel"
                            v-model="displayHelpPanel"
                            @change="handleHelpPanelChange">
                        <option :value="true">on</option>
                        <option :value="false">off</option>
                    </select>
                </div>
            </fieldset>
        </section>
        <section id="midiSetup" v-if="hasMIDIsupport">
            <fieldset>
                <legend v-t="'midiSetup'"></legend>
                <button v-t="'midiConnectToAPI'" @click="handleMIDIConnect"></button>
                <div class="wrapper select">
                    <label v-t="'deviceSelectLabel'" for="midiDevices"></label>
                    <select id="midiDevices"
                            v-model="portNumber"
                            @change="handleMIDIDeviceSelect">
                        <template v-if="midiDeviceList.length">
                            <option v-for="(device, index) in midiDeviceList"
                                    :key="`device_${index}`"
                                    :value="device.value"
                            >{{ device.title }}</option>
                        </template>
                        <option v-else
                                v-t="'connectMidiFirst'"
                                value="-1"></option>
                    </select>
                </div>
                <p v-t="'midiDescription'"></p>
            </fieldset>
        </section>
    </div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex';
import { zMIDI } from 'zmidi';
import MIDIService from '@/services/midi-service';
import PubSubMessages from '@/services/pubsub/messages';
import messages from './messages.json';

export default {
    i18n: { messages },
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
            this.showNotification({ message: this.$t('midiConnected') });
        },
        handleMIDIconnectFailure() {
            this.showNotification({ title: this.$t('error'), message: this.$t('midiFailure') });
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
                this.$t('midiEnabled', { device: `${device.manufacturer} ${device.name}` })
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
    
    $width: 500px;
    $height: 500px;

    .settings {
      @include editorComponent();
      @include overlay();
      padding: $spacing-small $spacing-large;

      h2 {
          padding-left: 0;
      }

      label {
        min-width: 150px;
        display: inline-block;
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
    
    @media screen and ( min-width: $width) and ( min-height: $height ) {
      .settings {
        width: $width;
        height: $height;
        top: 50%;
        left: 50%;
        margin-left: -( $width / 2 );
        margin-top: -( $height / 2 );
      }
    }

    @media screen and ( max-width: $width ), ( max-height: $height ) {
        .settings {
            @include verticalScrollOnMobile();
        }
    }
</style>
 