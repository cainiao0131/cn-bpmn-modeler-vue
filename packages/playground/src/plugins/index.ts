import type { App } from 'vue';
import router from './router';
import bpmnJs from './bpmn-js';
import pinia from './pinia';

export default {
  install: (app: App) => {
    app.use(router).use(bpmnJs).use(pinia);
  },
};
