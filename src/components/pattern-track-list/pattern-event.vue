/**
* The MIT License (MIT)
*
* Igor Zinken 2016-2022 - https://www.igorski.nl
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
    <li
        :class="[ attrs.class, {
            active   : active,
            selected : selected,
            playing  : playing
        }]"
    >
        <template v-if="event.action">
            <template v-if="event.note">
                <!-- note on event -->
                <span
                    v-if="event.note"
                    class="note"
                    :class="{ active: selectedSlot === 0 }"
                >
                    {{ event.note }} - {{ event.octave }}
                </span>
                <span
                    class="instrument"
                    :class="{ active: selectedSlot === 1 }"
                >
                    {{ event.instrument + 1 }}
                </span>
            </template>
            <template v-else>
                <!-- note off event -->
                <span
                    class="full"
                    :class="{ active: selectedSlot === 0 }"
                >//// OFF ////</span>
            </template>
        </template>
        <template v-else>
            <!-- no note event -->
            <span
                class="note empty"
               :class="{ active: selectedSlot === 0 }"
            >----</span>
            <span
                class="instrument"
                :class="{ active: selectedSlot === 1 }"
            >-</span>
        </template>
        <!-- module parameter instruction -->
        <template v-if="event.mp">
            <span
                class="module-param"
                :class="{ active: selectedSlot === 2 }"
            >
                {{ formattedParam.param }}
            </span>
            <span
                class="module-value"
                :class="{ active: selectedSlot === 3 }"
            >
                {{ formattedParam.value }}
            </span>
        </template>
        <template v-else>
            <template v-if="!event.action">
                <span
                    class="module-param empty"
                    :class="{ active: selectedSlot === 2 }"
                >--</span>
                <span
                    class="module-value empty"
                    :class="{ active: selectedSlot === 3 }"
                >--</span>
            </template>
            <template v-else-if="event.note">
                <span
                    class="module-param empty"
                    :class="{ active: selectedSlot === 2 }"
                >--</span>
                <span
                    class="module-value empty"
                    :class="{ active: selectedSlot === 3 }"
                >--</span>
            </template>
        </template>
    </li>
</template>

<script>
export default {
    props: {
        event: {
            type: [ Object, Number ],
            default: 0,
        },
        active: {
            type: Boolean,
            default: false,
        },
        /* whether the event is selected */
        selected: {
            type: Boolean,
            default: false,
        },
        /* whether the event is currently playing back */
        playing: {
            type: Boolean,
            default: false,
        },
        /* whether one of the slots within the event entry is selected */
        selectedSlot: {
            type: Number,
            default: -1
        },
        /* values for representing optional module parameter changes */
        formattedParam: {
            type: Object,
            default: null
        }
    },
    setup( props, { attrs }) {
        return {
            attrs,
        };
    },
};
</script>
