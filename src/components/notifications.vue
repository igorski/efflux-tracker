/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2019-2023 - https://www.igorski.nl
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
    <div id="notifications">
        <div
            v-for="( notification, index ) in queue"
            :key="`notification_${index}`"
            class="notification-window"
            :class="{ active: notification.visible, destroyed: notification.destroyed }"
            @click="closeNotification( notification )"
        >
            <h3 class="notification-window__title">{{ notification.title }}</h3>
            <p class="notification-window__message">{{ notification.message }}</p>
        </div>
    </div>
</template>

<script lang="ts">
import { mapState, mapMutations } from "vuex";
import { type INotification } from "@/store";

type NotificationVO = INotification & {
    visible: boolean;
    destroyed: boolean;
};

export default {
    data: () => ({
        queue: []
    }),
    computed: {
        ...mapState([
            "notifications",
        ]),
    },
    watch: {
        notifications: {
            immediate: true,
            handler( value: INotification[] = []): void {
                if ( !value.length ) {
                    return;
                }
                value.forEach( notification => {
                    // create Value Object for the message
                    const notificationVO = { ...notification, visible: true, destroyed: false };
                    this.queue.push( notificationVO );

                    // auto close after a short delay
                    window.setTimeout( this.closeNotification.bind( this, notificationVO ), 5000 );
                });
                this.clearNotifications();
            }
        }
    },
    methods: {
        ...mapMutations([
            "clearNotifications",
        ]),
        closeNotification( notificationVO: NotificationVO ): void {
            if ( !notificationVO.visible ) {
                return;
            }
            // trigger 1 sec close animation (see css)
            notificationVO.visible = false;
            this.$forceUpdate();

            window.setTimeout( this.removeNotification.bind( this, notificationVO ), 1000 );
        },
        removeNotification( notificationVO: NotificationVO ): void {
            notificationVO.destroyed = true;
            // only clear queue once all notifications have been destroyed
            // (v-for does not guarantee order so clearing when there are multiple notifications
            // causes weird jumps in remaining notification windows)
            if ( !this.queue.find( notificationVO => !notificationVO.destroyed )) {
                this.queue = [];
            }
        },
    }
};
</script>

<style lang="scss" scoped>
@use "@/styles/_colors";
@use "@/styles/_mixins";
@use "@/styles/_variables";
@use "@/styles/typography";

#notifications {
    position: fixed;
    z-index: variables.$z-notifications;
    top: 45px;
    right: 0;
    width: 33%;
    max-width: 300px;

    .notification-window {
        @include mixins.boxSize();
        display: block;
        position: relative;
        padding: variables.$spacing-small (variables.$spacing-small + variables.$spacing-medium);
        margin-bottom: variables.$spacing-small;
        right: -500px;
        background-color: colors.$color-editor-background;
        border: 3px solid #28292d;
        color: #FFF;
        transition: 1.0s ease-in-out;
        cursor: pointer;
        box-shadow: 0 0 0 rgba(0,255,255,0);

        &.destroyed {
            display: none;
        }

        &.active {
            right: variables.$spacing-medium;
            box-shadow: 0 0 variables.$spacing-small rgba(0,255,255,.35);
        }

        &__title {
            @include typography.toolFont();
            color: #FFF;
            margin: 0;
        }

        &__message {
            color: #b6b6b6;
            margin: variables.$spacing-xsmall 0;
        }
    }
}

@media screen and ( min-width: variables.$app-width ) {
    .notification-window {
        border-radius: variables.$spacing-small;
    }
}

@include mixins.mobile() {
    #notifications {
        width: 100%;
        max-width: 100%;
        left: 0;
        right: auto;

        .notification-window {
            width: 100%;
            left: 0;
            right: auto;
            top: -500px;
            padding: variables.$spacing-medium;
            margin: 0;

            &.active {
                top: 0;
            }
        }
    }
}
</style>
