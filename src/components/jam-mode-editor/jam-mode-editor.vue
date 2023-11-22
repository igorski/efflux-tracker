/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2023 - https://www.igorski.nl
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
    <section class="jam-mode-editor">
        <jam-channel-editor
            v-for="channel in channelEntries"
            :key="`ch_${channel.index}`"
            :channel="channel"
        />
    </section>
</template>

<script lang="ts">
import { mapState, mapGetters, mapMutations } from "vuex";
import JamChannelEditor from "./components/jam-channel-editor/jam-channel-editor.vue";
import muteChannel from "@/model/actions/channel-mute";
import soloChannel from "@/model/actions/channel-solo";
import { enqueueState } from "@/model/factories/history-state-factory";
import { type JamChannel } from "@/model/types/jam";
import KeyboardService from "@/services/keyboard-service";

// assuming we will always have 8 channels in a jam session!
const NUMBER_KEYS = [ 49, 50, 51, 52, 53, 54, 55, 56 ];

export default {
    components: {
        JamChannelEditor,
    },
    computed: {
        ...mapState({
            modal  : state => state.modal,
            dialog : state => state.dialog,
        }),
        ...mapGetters([
            "activeSong",
        ]),
        channelEntries(): JamChannel[] {
            const amountOfPatterns = this.activeSong.patterns.length;
            const channels: JamChannel[] = new Array( this.activeSong.patterns[ 0 ].channels.length );

            this.activeSong.patterns.forEach(( pattern, patternIndex ) => {
                pattern.channels.forEach(( channel, channelIndex ) => {
                    const jamChannel = channels[ channelIndex ] ?? {
                        index: channelIndex,
                        patterns: new Array( amountOfPatterns ),
                    };
                    jamChannel.patterns[ patternIndex ] = channel;

                    channels[ channelIndex ] = jamChannel;
                });
            });
            return channels;
        },
    },
    watch: {
        // upon closing of modals and dialogs we want to register our custom keyboard listener again
        modal( value ): void {
            if ( value === null ) {
                this.attachKeyboardListener();
            }
        },
        dialog( value ): void {
            if ( value === null ) {
                this.attachKeyboardListener();
            }
        },
    },
    created(): void {
        this.keyboardListener = this.handleKey.bind( this );
        this.attachKeyboardListener();

        if ( this.$store.state.windowSize.height > 900 ) {
            this.$store.commit( "setShowNoteEntry", true );
        }
    },
    beforeDestroy(): void {
        KeyboardService.setListener( null );
    },
    methods: {
        ...mapMutations([
            "setJamChannelLock",
            "setJamChannelPosition",
            "setSelectedInstrument",
        ]),
        attachKeyboardListener(): void {
            KeyboardService.setListener( this.keyboardListener );
        },
        handleKey( type: string, keyCode: number, event: KeyboardEvent ): boolean {
            if ( type !== "up" || !event.altKey ) {
                return false;
            }

            // no need to watch these, just grab when needed
            const { jam } = this.$store.state.sequencer;
            const { selectedInstrument } = this.$store.state.editor;

            if ( NUMBER_KEYS.includes( keyCode )) {
                const num = NUMBER_KEYS.indexOf( keyCode );
                if ( event.ctrlKey ) {
                    this.setJamChannelPosition({
                        instrumentIndex: selectedInstrument,
                        patternIndex: Math.max( 0, Math.min( this.activeSong.patterns.length - 1, num )),
                    });
                } else if ( event.shiftKey ) {
                    for ( let i = 0, l = this.activeSong.patterns[ 0 ].channels.length; i < l; ++i ) {
                        const patternIndex = Math.max( 0, jam[ i ].nextPatternIndex - 1 );
                        this.setJamChannelPosition({ instrumentIndex: i, patternIndex: num });
                    }
                } else {
                    this.setSelectedInstrument( num );
                }
                return true;
            }
            const maxPattern = this.activeSong.patterns.length - 1;
            switch ( keyCode ) {
                default:
                    break;
                case 189: // -
                    if ( event.shiftKey ) {
                        for ( let i = 0, l = this.activeSong.patterns[ 0 ].channels.length; i < l; ++i ) {
                            const patternIndex = Math.max( 0, jam[ i ].nextPatternIndex - 1 );
                            this.setJamChannelPosition({ instrumentIndex: i, patternIndex });
                        }
                        return true;
                    }
                    this.setJamChannelPosition({
                        instrumentIndex: selectedInstrument,
                        patternIndex: Math.max( 0, jam[ selectedInstrument ].nextPatternIndex - 1 )
                    });
                    return true;
                case 187: // +
                    if ( event.shiftKey ) {
                        for ( let i = 0, l = this.activeSong.patterns[ 0 ].channels.length; i < l; ++i ) {
                            const patternIndex = Math.min( maxPattern, jam[ i ].nextPatternIndex + 1 );
                            this.setJamChannelPosition({ instrumentIndex: i, patternIndex });
                        }
                        return true;
                    }
                    this.setJamChannelPosition({
                        instrumentIndex: selectedInstrument,
                        patternIndex: Math.min( maxPattern, jam[ selectedInstrument ].nextPatternIndex + 1 )
                    });
                    return true;
                case 76: // L
                    this.setJamChannelLock({ instrumentIndex: selectedInstrument, locked: !jam[ selectedInstrument ].locked });
                    return true;
                case 77: // M
                    enqueueState( `param_${selectedInstrument}_muted`,
                        muteChannel( this.$store, selectedInstrument, !this.activeSong.instruments[ selectedInstrument ].muted )
                    );
                    return true;
                case 83: // S
                    enqueueState( `param_${selectedInstrument}_solod`,
                        soloChannel( this.$store, selectedInstrument, !this.activeSong.instruments[ selectedInstrument ].solo )
                    );
                    return true;
            }
            return false;
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";

.jam-mode-editor {
    overflow-y: auto;
    background-color: $color-form-background;

    @include mobile() {
        padding-left: ($spacing-large + $spacing-medium); /* to make up for fixed position pattern editor */
    }
}
</style>