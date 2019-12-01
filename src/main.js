import Vue from 'vue';
import Efflux from './efflux-application';

Vue.config.productionTip = false;

new Vue({
    render: h => h(Efflux)
}).$mount('#app');
