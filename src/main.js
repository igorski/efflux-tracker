import dspjs from 'script-loader!dspjs'; // non CommonJS/ES6 module, provides "DFT" on window, see AudioUtil

import Vue from 'vue';
import Efflux from './Efflux.vue';

Vue.config.productionTip = false;

new Vue({
    render: h => h(Efflux)
}).$mount('#app');
