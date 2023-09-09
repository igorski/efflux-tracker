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
<template>
    <div class="timeline-editor">
        <div
            ref="canvasContainer"
            class="timeline-container"
        ></div>
    </div>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import { canvas } from "zcanvas";
import PatternRenderer from "./renderers/pattern-renderer";
import messages from "./messages.json";

export default {
    i18n: { messages },
    computed: {
        ...mapState({
            activeSong: state => state.song.activeSong,
            currentStep: state => state.sequencer.currentStep,
            selectedInstrument: state => state.editor.selectedInstrument,
            windowSize: state => state.windowSize,
        }),
        ...mapGetters([
            "activePattern",
        ]),
        patterns() {
            return this.activeSong.patterns;
        },
    },
    watch: {
        windowSize: {
            handler() {
                if ( this.canvas ) {
                    this.resizeCanvas();
                }
            },
        },
        patterns() {
            this.syncActors();
        },
    },
    mounted() {
        this._renderers = [];

        this.canvas = new canvas({ width: 100, height: 100 });
        this.canvas.setBackgroundColor( "blue" );
        this.canvas.insertInPage( this.$refs.canvasContainer );
        this.canvas.getElement().className = "timeline-container__canvas";

        this.syncActors();
        this.resizeCanvas();
    },
    beforeDestroy() {
        this.canvas.dispose();
    },
    methods: {
        resizeCanvas() {
            const { width, height } = this.$el.getBoundingClientRect();
            this.canvas.setDimensions( width, height );
            // TODO: implement zooming ?
            this._renderers.forEach( renderer => {
                renderer.setWidth( width );
                renderer.setHeight( height );
            });
        },
        syncActors() {
            while ( this._renderers.length ) {
                this._renderers[ 0 ].dispose();
                this._renderers.splice( 0, 1 );
            }
            this.patterns.forEach(( pattern, index ) => {
                const renderer = new PatternRenderer( pattern, index );
                this._renderers.push( renderer );
                this.canvas.addChild( renderer );
            });
        }
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";

.timeline-editor {
    height: 100%;
    overflow: hidden;
}
</style>
