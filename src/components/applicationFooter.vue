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

    $footer-height: 45px;
    
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
