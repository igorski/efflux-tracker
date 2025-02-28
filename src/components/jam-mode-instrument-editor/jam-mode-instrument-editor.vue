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
    <div class="jam-container">
        <instrument-editor
            class="jam-instrument-editor"
            maximized
            @close="handleClose()"
        >
            <hr class="jam-divider" />
            <note-entry-editor class="jam-note-editor" />
        </instrument-editor>
    </div>
</template>

<script lang="ts">
import InstrumentEditor from "@/components/instrument-editor/instrument-editor.vue";
import NoteEntryEditor from "@/components/note-entry-editor/note-entry-editor.vue";

export default {
    emits: [ "close" ],
    components: {
        InstrumentEditor,
        NoteEntryEditor,
    },
    methods: {
        handleClose(): void {
            this.$emit( "close" );
        },
    }
};
</script>

<style lang="scss" scoped>
@use "@/styles/_mixins";
@use "@/styles/_variables";

.jam-container {
    position: relative;
    height: 100%;
}

.jam-divider {
    @include mixins.divider();

    & {
        margin-top: 0 !important;
    }
}

.jam-note-editor {
    position: relative;
    left: 0;
    transform: none;
    border: none;
    width: auto;

    @include mixins.mobile() {
        height: 90px;
    }
}
</style>
