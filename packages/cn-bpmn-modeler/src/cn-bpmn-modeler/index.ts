import { type App, type Plugin } from 'vue';
import CnBpmnModeler from './cn-bpmn-modeler.vue';
import CnBpmnModelerImperative_ from './cn-bpmn-modeler-imperative.vue';

CnBpmnModeler.install = (app: App) => {
  app.component('CnBpmnModeler', CnBpmnModeler);
  return app;
};

CnBpmnModelerImperative_.install = (app: App) => {
  app.component('CnBpmnModelerImperative', CnBpmnModelerImperative_);
  return app;
};

export default CnBpmnModeler as typeof CnBpmnModeler & Plugin;
export const CnBpmnModelerImperative = CnBpmnModelerImperative_ as typeof CnBpmnModelerImperative_ & Plugin;
