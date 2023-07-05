import Vue from "vue";
import Efflux from "./efflux-application.vue";

Vue.config.productionTip = false;

new Vue({
    render: h => h( Efflux )
}).$mount( "#app" );
