import Vue from 'vue';
import Efflux from './Efflux.vue';

Vue.config.productionTip = false;

new Vue({
    render: h => h(Efflux)
}).$mount('#app');
