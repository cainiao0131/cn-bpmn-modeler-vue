import type { App } from 'vue';
import routerPlugin from './router';
import cnBpmnModelerPlugin from './cn-bpmn-modeler';
import piniaPlugin from './pinia';

export default {
  install: (app: App) => {
    app.use(routerPlugin).use(cnBpmnModelerPlugin).use(piniaPlugin);
  },
};
