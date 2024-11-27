import type { App } from 'vue';
import routerPlugin from './router';
import CnBpmnModeler, { CnBpmnModelerImperative } from 'cn-bpmn-modeler-vue';
import piniaPlugin from './pinia';
import axios from './axios';

export default {
  install: (app: App) => {
    app.use(routerPlugin).use(CnBpmnModeler).use(CnBpmnModelerImperative).use(piniaPlugin).use(axios);
  },
};
