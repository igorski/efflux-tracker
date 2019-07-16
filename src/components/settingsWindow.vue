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
            <button class="close-button" @click="$emit('close')">x</button>
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
                        <option value="true">on</option>
                        <option value="false" selected>off</option>
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
                        <option>Connect to MIDI API first.</option>
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
import { zMIDI } from 'zmidi';

export default {
    data: () => ({
        paramFormat: 'hex',
        trackFollow: false,
    }),
    computed: {
        ...mapState({
            midiPortNumber: state => state.midi.midiPortNumber,
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
                this.setMidiPortNumber(value);
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
    },
    methods: {
        ...mapMutations([
            'saveSetting',
            'showNotification',
            'setPortNumber',
        ]),
        handleParameterInputFormatChange( aEvent ) {
            this.saveSetting(
                { name: this.settings.INPUT_FORMAT, value: this.paramFormat }
            );
            // TODO:    Pubsub.publish( Messages.REFRESH_PATTERN_VIEW );
        },
        handleTrackFollowChange( aEvent ) {
            this.saveSetting(
                { name: this.settings.FOLLOW_PLAYBACK, value: this.trackFollow }
            );
        },
        handleMIDIConnect( aEvent ) {
            zMIDI.connect(this.handleMIDIconnectSuccess, this.handleMIDIconnectFailure);
        },
        handleMIDIconnectSuccess() {
            if ( zMIDI.getInChannels().length === 0 ) {
                return this.handleMIDIconnectFailure();
            }
            this.showNotification({ message: this.getCopy('MIDI_CONNECTED') });
        },
        handleMIDIconnectFailure() {
            this.showNotification({ title: this.getCopy('ERROR'), message: this.getCopy('MIDI_FAILURE') });
        },
        handleMIDIDeviceSelect() {
            // first clean up all old listeners
            let amountOfPorts = zMIDI.getInChannels().length;

            while ( amountOfPorts-- )
                zMIDI.removeMessageListener( amountOfPorts );

            zMIDI.addMessageListener( this.portNumber, this.midiMessageHandler );

            const device = zMIDI.getInChannels()[ this.portNumber ];
            this.showNotification({ message:
                this.getCopy( "MIDI_ENABLED", `${device.manufacturer} ${device.name}` )
            });
        },
        showAvailableMIDIDevices( aInputs ) {
            let options = [], option, input;
        
            for ( let i = 0, l = aInputs.length; i < l; ++i )
            {
                input  = aInputs[ i ];
                option = {
                    title : input.manufacturer + " " + input.name,
                    value : i
                };
               options.push( option );
            }
            Form.setOptions( deviceSelect, options );
        
            if ( options.length === 1 )
                Pubsub.publish( Messages.MIDI_ADD_LISTENER_TO_DEVICE, 0 );
        }
    }
};
</script>

<style lang="scss">
    @import '@/styles/_variables.scss';

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
 