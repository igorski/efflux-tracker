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
    <div id="notifications">
        <div v-for="notification in _notifications"
             :key="`notification_${notification.title}`"
             class="notificationWindow"
             :class="{ active: notification.active }"
             @click="closeNotification( notification )">
            <h3>{{ notification.title }}</h3>
            <p>{{ notification.content }}</p>
        </div>
    </div>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex';

export default {
    data: () => ({
        _notifications: []
    }),
    computed: {
        ...mapGetters([
            'notifications'
        ])
    },
    watch: {
        notifications( value ) {
            if ( value.length ) {
                value.forEach(notification => {
                    // create Value Object for the message
                    this._notifications.push({
                        visible: true,
                        ...notification
                    });
                    // auto close after a short delay
                    window.setTimeout( this.closeNotification.bind( this, notification ), 5000 );
                });
                this.clearNotifications();
            }
        },
    },
    methods: {
        ...mapMutations([
            'clearNotifications'
        ]),
        closeNotification( notification ) {
            if ( !notification.visible ) {
                return;
            }
            notification.visible = false;
            window.setTimeout(() => {
                this._notifications.splice( this._notifications.indexOf( notification ), 1 );
            }, 1000 );
        }
    }
};
</script>

<style lang="scss">
    @import '../styles/_variables.scss';

    #notifications
    {
      position: fixed;
      z-index: 1000;
      top: 45px;
      right: 0;
      width: 33%;
      max-width: 300px;

      .notificationWindow
      {
        display: block;
        position: relative;
        padding: .5em 1em;
        margin-bottom: .5em;
        right: -500px;
        background-color: #393b40;
        border: 3px solid #28292d;
        border-radius: 7px;
        color: #FFF;
        transition: 1.0s ease-in-out;
        cursor: pointer;
        box-shadow: 0 0 0 rgba(0,255,255,0);

        &.visible {
          right: 1em;
          box-shadow: 0 0 7px rgba(0,255,255,.35);
        }

        h3 {
          color: $color-1;
        }

        p {
          margin: .5em 0;
        }
      }
    }

    @media screen and ( max-width: $mobile-width )
    {
      #notifications {
        width: 100%;
        max-width: 100%;
        left: 0;
        right: auto;

        .notificationWindow {
          width: 100%;
          right: auto;
          top: -500px;
          padding: 1em 2em;

          &.visible {
            top: 0;
          }
        }
      }
    }
</style>
 