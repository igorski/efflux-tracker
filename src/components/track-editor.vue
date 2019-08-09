/**
* The MIT License (MIT)
*
* Igor Zinken 2019 - https://www.igorski.nl
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
    <section id="trackEditor"
             ref="container"
             :class="{ fixed: isFixed }"
    >
        <ul class="controls">
            <li class="addNote" @click="handleNoteAddClick"></li>
            <li class="addOff" @click="handleNoteOffClick"></li>
            <li class="removeNote" @click="handleNoteDeleteClick"></li>
            <li class="moduleParams" @click="handleModuleParamsClick"></li>
            <li class="moduleGlide" @click="handleModuleGlideClick"></li>
        </ul>
    </section>
</template>

<script>
import { mapState, mapMutations } from 'vuex';
import HistoryStates from '../definitions/history-states';
import ModalWindows from '../definitions/modal-windows';
import EventFactory from '../model/factory/event-factory';
import HistoryStateFactory from '../model/factory/history-state-factory';
import EventUtil from '../utils/event-util';

import { DOM } from 'zjslib';

export default {
    data: () => ({
        controlOffsetY: 0,
        lastWindowScrollY: 0,
        isFixed: false
    }),
    computed: {
        ...mapState([
            'windowSize',
            'windowScrollOffset',
        ]),
        ...mapState({
            activeSong: state => state.song.activeSong,
            activeStep: state => state.editor.activeStep,
            activePattern: state => state.sequencer.activePattern,
            activeInstrument: state => state.editor.activeInstrument,
            eventList: state => state.editor.eventList,
        })
    },
    watch: {
        windowSize() {
            this.controlOffsetY = 0; // flush cache
        },
        windowScrollOffset(scrollY) {
            // ensure the controlContainer is always visible regardless of scroll offset (for phones)
            // threshold defines when to offset the containers top, the last number defines the fixed header height
            if ( scrollY !== this.lastWindowScrollY ) {
                const threshold = ( this.controlOffsetY = this.controlOffsetY || DOM.getElementCoordinates( this.$refs.container, true ).y - 46 );

                this.isFixed = scrollY > threshold;
                this.lastWindowScrollY = scrollY;
            }
        }
    },
    methods: {
        ...mapMutations([
            'addEventAtPosition',
            'openModal',
            'saveState',
        ]),
        handleNoteAddClick() {
            this.openModal(ModalWindows.NOTE_ENTRY_EDITOR);
        },
        handleNoteOffClick(){
            const offEvent = EventFactory.createAudioEvent();
            offEvent.action = 2; // noteOff;
            this.addEventAtPosition({ event: offEvent, store: this.$store });
        },
        handleNoteDeleteClick() {
            this.saveState(HistoryStateFactory.getAction(HistoryStates.DELETE_EVENT, { store: this.$store }));
        },
        handleModuleParamsClick() {
            this.openModal(ModalWindows.MODULE_PARAM_EDITOR);
        },
        handleModuleGlideClick() {
            EventUtil.glideParameterAutomations(
                this.activeSong, this.activeStep, this.activePattern,
                this.activeInstrument, this.eventList, this.$store,
            );
        },
    }
};
</script>

<style lang="scss" scoped>
    @import '@/styles/_variables.scss';

    #trackEditor
    {
      background-color: #000;
      vertical-align: top;
      position: relative;
      min-width: 40px;

      .controls {

        li {

          width: 40px;
          height: 40px;
          margin: 0 0 1px;
          background-color: #b6b6b6;
          background-repeat: no-repeat;
          background-position: 50%;
          background-size: 50%;
          cursor: pointer;

          &.addNote {
            background-image: url('../assets/images/icon-note-add.png');
          }
          &.addOff {
            background-image: url('../assets/images/icon-note-mute.png');
          }
          &.removeNote {
            background-image: url('../assets/images/icon-note-delete.png');
          }
          &.moduleParams {
            background-image: url('../assets/images/icon-module-params.png');
          }
          &.moduleGlide {
            background-image: url('../assets/images/icon-module-glide.png');
          }

          &:hover {
            background-color: $color-1;
          }
        }
      }

      &.fixed {
        .controls {
          position: fixed;
          top: $menu-height;
        }
      }
    }

    /* mobile view */

    @media screen and ( max-width: $mobile-width )
    {
      #trackEditor {
        position: fixed; /* keep pattern editor in static position */
        left: 0;
        height: 100%;
        z-index: 10;
      }
    }
</style>
 