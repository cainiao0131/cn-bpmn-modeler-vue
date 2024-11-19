import BpmnModeler from 'bpmn-js/lib/Modeler';
import { SaveXMLResult } from 'bpmn-js/lib/BaseViewer';
import { ElementProperties, EmitType } from './types';

export function useUpdateXmlOfModeler(
  emit: EmitType,
  updateProperties: (element?: ElementProperties, properties?: ElementProperties) => void,
  bpmnModeler: Ref<typeof BpmnModeler>,
  errorMessage: Ref<string>,
  processId: Ref<string>,
  bpmnRoot: Ref<ElementProperties | undefined>,
  processName: Ref<string>,
) {
  // 插入 XML
  const updateXmlOfModeler = (newVal?: string, success?: () => void) => {
    if (newVal) {
      const bpmnModeler_ = bpmnModeler.value;
      if (bpmnModeler_) {
        bpmnModeler_
          .importXML(newVal)
          .then(() => {
            errorMessage.value = '';
            // 如果不设置 setTimeout，无法设置成功，nextTick 也不行
            setTimeout(() => {
              // 如果配置了流程 ID 这重新设置一下 ID
              if (processId.value) {
                updateProperties(bpmnRoot.value, { id: processId.value, name: processName.value });
              }
              // 根据当前窗口居中
              const canvas = bpmnModeler_.get('canvas') as { zoom: (a: string, b: string) => void };
              canvas.zoom('fit-viewport', 'auto');
            }, 1);
            if (success) {
              success();
            }
          })
          .catch((err: { message: string }) => {
            emit('update:bpmn-xml', '');
            errorMessage.value = err.message || '打开图表失败';
            console.error('updateXmlOfModeler() >>> err =', err);
          });
      }
    } else {
      // 不能用 bpmnModeler.value.clear()，因为 clear() 方法清除图表后，xml 仍然不是空
      emit('update:bpmn-xml', '');
    }
  };

  /**
   * 更新 Xml，只有 Xml 有变化时才插入。
   * 因为插入会导致图像闪烁以及失去焦点，尽量避免不必要的插入。
   */
  const updateXmlOfModelerIfDifferent = (newValue: string, success?: () => void) => {
    bpmnModeler.value
      .saveXML({ format: true })
      .then((saveXMLResult: SaveXMLResult) => {
        if (newValue != saveXMLResult.xml) {
          updateXmlOfModeler(newValue, success);
        }
      })
      .catch(() => {
        updateXmlOfModeler(newValue, success);
      });
  };
  return { updateXmlOfModelerIfDifferent };
}
