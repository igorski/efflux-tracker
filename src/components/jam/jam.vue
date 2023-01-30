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
            @close="$emit('close')"
        >
            <hr class="divider jam-divider" />
            <note-entry-editor class="jam-note-editor" />
        </instrument-editor>
    </div>
</template>

<script lang="ts">
import InstrumentEditor from "@/components/instrument-editor/instrument-editor";
import NoteEntryEditor from "@/components/note-entry-editor/note-entry-editor";

export default {
    components: {
        InstrumentEditor,
        NoteEntryEditor,
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";
@import "@/styles/_variables";

.jam-container {
    position: relative;
    height: 100%;
}

.jam-instrument-editor {
    padding: $spacing-small 0;
    border: none;
    border-radius: 0;
}

.jam-divider {
    margin-top: 0;
}

.jam-note-editor {
    position: relative;
    left: 0;
    transform: none;
    border: none;
    width: auto;//calc(100% - 550px);
}
</style>
