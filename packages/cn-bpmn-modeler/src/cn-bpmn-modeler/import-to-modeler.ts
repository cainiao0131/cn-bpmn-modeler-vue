import { EmitType } from '../types';
import BpmnModeler from 'bpmn-js/lib/Modeler';

export function useImportToModeler(
  bpmnModeler: Ref<typeof BpmnModeler>,
  errorMessage: Ref<string>,
  emitXmlOfModeler: (a?: unknown, b?: unknown) => void,
  emit: EmitType,
) {
  /**
   * 将 XML 字符串导入 Modeler，如果导入成功则执行 success
   */
  const updateXml = (newVal?: string, success?: () => void) => {
    if (newVal) {
      const bpmnModeler_ = bpmnModeler.value;
      if (bpmnModeler_) {
        bpmnModeler_
          .importXML(newVal)
          .then(() => {
            errorMessage.value = '';
            // 如果不设置 setTimeout，无法设置成功，nextTick 也不行
            setTimeout(() => {
              // 根据当前窗口居中
              const canvas = bpmnModeler_.get('canvas') as { zoom: (a: string, b: string) => void };
              canvas.zoom('fit-viewport', 'auto');
            }, 1);
            if (success) {
              success();
            }
          })
          .catch((err: { message: string }) => {
            errorMessage.value = err.message || '更新 XML 失败';
            console.error('updateXml() >>> newVal =', newVal);
            console.error('updateXml() >>> err =', err);
            emit('update:bpmn-xml', '');
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
  const updateXmlIfDifferent = (newValue: string, success?: () => void) => {
    bpmnModeler.value
      .saveXML({ format: true })
      .then(({ xml }: { xml: string }) => {
        if (newValue != xml) {
          updateXml(newValue, success);
        }
      })
      .catch(() => {
        updateXml(newValue, success);
      });
  };

  /**
   * TODO 应该用 v-model 的方式来动态根据元素属性进行更新
   * 更新 Modeler 成功后更新 bpmnXml。
   * importXML 不会触发 commandStack.changed 回调，因此无法通过 change 事件弹出。
   * 弹出的目的是为了更新 v-model 的 bpmnXml。
   * 1）Modeler 的 change 事件回调中，需要更新 bpmnXml，但不需要更新 Modeler，调用：emitModelerXml。
   * 2）Watch bpmnXml 与 onMounted 中，根据 bpmnXml 的新值更新 Modeler，不需要更新 bpmnXml，调用：importIfDifferent。
   * 3）导入文件或新建，在更新 Modeler 成功后更新 bpmnXml，调用：importAndEmitIfDifferent。
   */
  const importAndEmitIfDifferent = (newValue: string) => {
    updateXmlIfDifferent(newValue, () => {
      emitXmlOfModeler();
    });
  };

  // 将文件转换为字符串后导入 BPMN modeler
  // TODO 这里弹出事件更新 v-model 的 xml 就可以了，不应该主动调用 API
  const importXMLFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (progressEvent: ProgressEvent) => {
      const target = progressEvent.target;
      if (target) {
        importAndEmitIfDifferent(String((target as FileReader).result));
      }
    };
    reader.readAsText(file);
  };
  return { updateXmlIfDifferent, importAndEmitIfDifferent, importXMLFile };
}
