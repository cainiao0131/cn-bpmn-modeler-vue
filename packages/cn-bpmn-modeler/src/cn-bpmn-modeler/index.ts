import { type App, type Plugin } from 'vue';
import CnBpmnModeler from './cn-bpmn-modeler.vue';

CnBpmnModeler.install = (app: App) => {
  app.component('CnBpmnModeler', CnBpmnModeler);
  return app;
};

export default CnBpmnModeler as typeof CnBpmnModeler & Plugin;
