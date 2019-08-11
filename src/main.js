// eslint-disable-next-line no-unused-vars
import dspjs from 'script-loader!dspjs'; // non CommonJS/ES6 module, provides "DFT" on window, see audio-helper

import Vue from 'vue';
import Efflux from './efflux-application';

Vue.config.productionTip = false;

new Vue({
    render: h => h(Efflux)
}).$mount('#app');
