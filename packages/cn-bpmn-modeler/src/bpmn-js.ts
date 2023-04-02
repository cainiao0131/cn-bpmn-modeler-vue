import { App } from 'vue';
import ProcessModeler from './cn-bpmn-modeler';
import ProcessEditor from './process-editor.vue';
import ProcessViewer from './process-viewer.vue';

export interface BpmnJs {
  /**
   * 被 `app.use(processModel)` 自动调用，不应该被用户手动调用
   *
   * @internal
   * @param app - 使用流程模型的应用
   */
  install(app: App): void;
}

export interface ProcessModelOptions {
  name: string;
}

export function createBpmnJs(options?: ProcessModelOptions): BpmnJs {
  const processModel: BpmnJs = {
    install(app: App) {
      console.log('options =', options);

      app.component('ProcessModeler', ProcessModeler);
      app.component('ProcessEditor', ProcessEditor);
      app.component('ProcessViewer', ProcessViewer);
    },
  };
  return processModel;
}
