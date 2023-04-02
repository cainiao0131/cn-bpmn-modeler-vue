import BpmnModeler from 'bpmn-js/lib/Modeler';

export function useImportToModeler(
  bpmnModeler: Ref<typeof BpmnModeler>,
  errorMessage: Ref<string>,
  emitModelerXml: (a?: unknown, b?: unknown) => void,
) {
  /**
   * 将 XML 字符串导入 Modeler，如果导入成功则执行 success
   */
  const importXmlToModeler = (newVal?: string, success?: () => void) => {
    if (newVal) {
      bpmnModeler.value
        .importXML(newVal)
        .then(() => {
          errorMessage.value = '';
          if (success) {
            success();
          }
        })
        .catch((err: { message: string }) => {
          errorMessage.value = err.message || '插入 XML 失败';
          console.error('importXmlToModeler() >>> newVal =', newVal);
          console.error('importXmlToModeler() >>> err =', err);
        });
    } else {
      // TODO 清空，暂时没找到 API
    }
  };

  /**
   * 更新数据，只有在有变化时才插入。
   * 因为插入会导致图像闪烁以及失去焦点，尽量避免不必要的插入。
   */
  const importIfDifferent = (newValue: string, success?: () => void) => {
    bpmnModeler.value
      .saveXML({ format: true })
      .then(({ xml }: { xml: string }) => {
        if (newValue != xml) {
          importXmlToModeler(newValue, success);
        }
      })
      .catch(() => {
        importXmlToModeler(newValue, success);
      });
  };

  /**
   * 更新 Modeler 成功后更新 bpmnXml
   * importXML 不会触发 commandStack.changed 回调，因此无法通过 change 事件弹出
   * 弹出的目的是为了更新 v-model 的 bpmnXml
   * 1）Modeler 的 change 事件回调中，需要更新 bpmnXml，但不需要更新 Modeler，调用：emitModelerXml
   * 2）Watch bpmnXml 与 onMounted 中，根据 bpmnXml 的新值更新 Modeler，不需要更新 bpmnXml，调用：importIfDifferent
   * 3）导入文件或新建，在更新 Modeler 成功后更新 bpmnXml，调用：importAndEmitIfDifferent
   */
  const importAndEmitIfDifferent = (newValue: string) => {
    importIfDifferent(newValue, () => {
      emitModelerXml();
    });
  };

  // 将文件转换为字符串后导入 BPMN modeler
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
  return { importIfDifferent, importAndEmitIfDifferent, importXMLFile };
}
