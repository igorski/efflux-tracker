import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        menuOpened: false
    },
    getters: {

    },
    mutations: {
        setMenuOpened(state, value) {
            state.menuOpened = !!value;
        }
    },
    actions: {

    }
});
