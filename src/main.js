import * as Vue from "vue";
import { createStore } from "vuex";
import { createI18n } from "vue-i18n";
import Efflux from "./efflux-application.vue";
import messages from "./messages.json";
import store from "./store";

// Create VueI18n instance with options
const i18n = createI18n({
    legacy: true, // Options API
    messages
});

const app = Vue.createApp( Efflux );
app.use( createStore( store ));
app.use( i18n );
app.mount( "#app" );
