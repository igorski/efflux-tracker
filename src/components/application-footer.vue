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
<template functional>
    <div id="footer">
        <span>
            &copy; <a href="https://www.igorski.nl" rel="noopener" target="_blank">igorski.nl</a> 2016 - 2019
        </span>
    </div>
</template>

<script>
export default {

};
</script>

<style lang="scss" scoped>
    @import "../styles/_variables.scss";

    #footer {
      position: absolute;
      bottom: 0;
      background-image: linear-gradient(to bottom,#474747 0,#303030 100%);
      width: 100%;
      height: $footer-height;
      color: #EEE;
      font-family: Montserrat, Helvetica, Verdana;
    
      span {
        width: auto;
        margin: 0 auto;
        text-align: center;
        display: block;
        margin-top: 10px;
      }
    }
    
    // ideal app width and up
    
    @media screen and ( min-width: $app-width ) {
      #footer {
        span {
          width: $app-width;
        }
      }
    }
    
    // phones
    
    @media screen and ( max-width: $mobile-width ) {
      #footer {
        padding: 0 1em;
        z-index: 11;
        @include boxSize;
      }
    }

</style>
