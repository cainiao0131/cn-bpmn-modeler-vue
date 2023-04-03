import type { App } from 'vue';
import routerPlugin from './router';
import { CnBpmnModeler } from 'cn-bpmn-modeler-vue';
import piniaPlugin from './pinia';

export default {
  install: (app: App) => {
    app.use(routerPlugin).use(CnBpmnModeler).use(piniaPlugin);
  },
};
