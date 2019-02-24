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
    <header id="header"
            :class="{ expanded: menuOpened }"
    >
        <application-menu />
        <section id="transportSection"></section>
    </header>
</template>

<script>
import { mapState } from 'vuex';
import ApplicationMenu from './applicationMenu';

export default {
    components: {
        ApplicationMenu
    },
    computed: {
      ...mapState([
        'menuOpened'
      ])
    }
};
</script>

<style lang="scss">
    @import "../styles/_variables.scss";

    #header {
      box-shadow: 0 0 5px rgba(0,0,0,.5);
      background-image: linear-gradient(to bottom,#282828 35%,#383838 90%);
      background-repeat: repeat-x;
      padding: .25em 0;
      width: 100%;
      position: fixed;
      top: 0;
      z-index: 200;
      border-bottom: 3px solid #53565d;
      @include boxSize;

      h1 {
        color: #FFF;
        display: inline;
        margin: 0;
        padding: .25em .5em 0 .5em;
        font-size: 110%;
      }

      ul {
        display: inline;
        list-style-type: none;
        padding: 0 0 0 .75em;
        margin: 0;
        @include boxSize;

        li {
          display: inline-block;
          padding: 0 .5em 0 0;
          margin: 0;
          font-family: Montserrat, Helvetica, Verdana;
          cursor: pointer;

          ul {
            list-style: none;
          }

          &#fullscreenBtn {
            float: right;
            margin-right: 1.5em;
          }
        }
      }
    }

    /* tablet / desktop (everything larger than a phone) */

    @media screen and ( min-width: $mobile-width ) {
      #header ul li {
        &:hover, &:focus {
          a {
            color: $color-1;
          }
          ul {
            display: block;
            z-index: 2;
          }
        }

        ul {
          display: none;
          position: absolute;
          box-shadow: 0 0 5px rgba(0,0,0,.5);
          padding: .5em;
          background-image: linear-gradient(to bottom,#282828 35%,#383838 90%);
          background-repeat: repeat-x;
          @include boxSize;

          li {
            display: block;
            color: #b6b6b6;
            padding: .25em .5em;

            &:hover {
              color: #FFF;
            }
          }
        }
      }
    }

    /* mobile view */

    @media screen and ( max-width: $mobile-width ) {
      #header {
        height: 50px;

        &.expanded {
          height: 100%;
        }

        h1 {
          display: none;
        }

        ul {
          display: block;
          width: 100%;

          padding: 0;

          li {
            display: block;
            width: 100%;

            a {
              width: 100%;
            }
          }
        }
      }
    }
</style>
