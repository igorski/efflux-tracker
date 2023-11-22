/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2023 - https://www.igorski.nl
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
import { mapState, mapMutations } from "vuex";
import { type PairableParam } from "@/services/midi-service";
import { type EffluxState } from "@/store";

export default {
    data: () => ({
        linking : false,
        paired  : false,
    }),
    computed: {
        ...mapState({
            selectedInstrument : ( state: EffluxState ) => state.editor.selectedInstrument,
            midiAssignMode     : ( state: EffluxState ) => state.midi.midiAssignMode,
            pairingProps       : ( state: EffluxState ) => state.midi.pairingProps,
            pairings           : ( state: EffluxState ) => state.midi.pairings,
        }),
        linkable(): boolean {
            return !this.paired && ( this.linking || this.midiAssignMode );
        },
    },
    watch: {
        pairingProps( value: Partial<PairableParam> ): void {
            if ( !value ) {
                this.linking = false;
                this.checkPairing();
            }
        },
        selectedInstrument(): void {
            this.checkPairing();
        },
    },
    created(): void {
        this.checkPairing();
    },
    methods: {
        ...mapMutations([
            "setPairingProps",
            "unpairControlChange",
        ]),
        checkPairing(): void {
            this.paired = Object.values([ ...this.pairings ])
                              .some(([, { paramId, instrumentIndex }]) => paramId === this.paramId && instrumentIndex === this.selectedInstrument );
        },
        setAsPairable(): void {
            this.setPairingProps({
                paramId         : this.paramId,
                instrumentIndex : this.selectedInstrument,
                optData         : this.optData,
            });
            this.linking = true;
        },
        unlink(): void {
            const pair = Object.values([ ...this.pairings ])
                              .find(([, { paramId, instrumentIndex }]) => paramId === this.paramId && instrumentIndex === this.selectedInstrument );

            if ( pair ) {
                this.unpairControlChange( pair[ 0 ] );
                this.checkPairing();
            }
        },
    },
};
