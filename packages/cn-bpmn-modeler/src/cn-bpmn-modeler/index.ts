import { App } from 'vue';
import CnBpmnModeler from './cn-bpmn-modeler.vue';

export interface CnBpmnModelerPlugin {
  /**
   * 被 `app.use(cnBpmnModelerPlugin)` 自动调用，不应该被用户手动调用
   *
   * @internal
   * @param app - 使用流程图的应用
   */
  install(app: App): void;
}

export interface ProcessModelOptions {
  name: string;
}

export function createCnBpmnModeler(options?: ProcessModelOptions): CnBpmnModelerPlugin {
  console.log('options =', options);
  const processModel: CnBpmnModelerPlugin = {
    install(app: App) {
      app.component('CnBpmnModeler', CnBpmnModeler);
    },
  };
  return processModel;
}
