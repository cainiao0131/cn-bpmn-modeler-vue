import BpmnModeler from 'bpmn-js/lib/Modeler';
import { debounce, getAttribute, guid, toArray, toStringArray } from './util/util';
import { onMounted, toRaw } from 'vue';
import { flowableExtensions } from './moddle-extensions/flowable';
import flowableControlsModule from './additional-modules/flowable';
import { ARRAY_KEYS, BpmnBusiness, BpmnElement, EmitType, InternalEvent, NAMESPACE, Root } from './types';

export function useInit(
  emit: EmitType,
  importXMLFile: (file: File) => void,
  emitXmlOfModeler: () => void,
  updateXmlIfDifferent: (newValue: string, success?: () => void) => void,
  canvasId: Ref<string>,
  keyboardBindTo: Ref<unknown>,
  dragFileRef: Ref<HTMLElement | undefined>,
  bpmnXml: Ref<string>,
  translator: Ref<(english: string, replacements: Record<string, string>) => string>,
  bpmnModeler: Ref<typeof BpmnModeler | undefined>,
  bpmnRoot: Ref<Root | undefined>,
  selectedElement: Ref<BpmnElement | undefined>,
  errorMessage: Ref<string>,
  options: Ref<Record<string, unknown>>,
  additionalModules: Ref<Array<unknown>>,
) {
  onMounted(() => {
    init();
  });

  const init = () => {
    // canvasId_ 不能以数字开头，否则 bpmn.js 会报错
    const canvasId_ = `_${guid()}`;
    canvasId.value = canvasId_;
    nextTick(() => {
      /**
         {
            translate: [
              'value',
              (english: string, replacements: Record<string, string>) => {
                return translator.value(english, replacements) || english;
              },
            ],
          },
        */
      const newAdditionalModules: Array<unknown> = [];
      const rawAdditionalModules = toRaw(additionalModules.value);
      rawAdditionalModules.forEach(additionalModule => {
        newAdditionalModules.push(additionalModule);
      });
      newAdditionalModules.push(flowableControlsModule);
      newAdditionalModules.push({
        translate: [
          'value',
          (english: string, replacements: Record<string, string>) => {
            return translator.value(english, replacements) || english;
          },
        ],
      });
      const rawModeler = new BpmnModeler(
        Object.assign(
          {
            container: `#${canvasId_}`,
            keyboard: {
              bindTo: keyboardBindTo.value,
            },
            additionalModules: newAdditionalModules,
            moddleExtensions: {
              flowable: flowableExtensions,
            },
          },
          toRaw(options.value),
        ),
      );
      bpmnModeler.value = rawModeler;
      emit('modeler-ready', rawModeler);

      // 检查浏览器的文件 API 是否可用
      if (!window.FileList || !window.FileReader) {
        errorMessage.value = '您使用的浏览器版本不支持拖入文件，请尝试使用 Chrome、Firefox 或版本 10 以上的 IE 浏览器';
      } else if (dragFileRef.value) {
        // 注册拖入文件时的回调
        dragFileRef.value.addEventListener(
          'dragover',
          (dragEvent: DragEvent) => {
            dragEvent.stopPropagation();
            dragEvent.preventDefault();
            // 显式地展示这是复制
            const dataTransfer = dragEvent.dataTransfer;
            if (dataTransfer) {
              dataTransfer.dropEffect = 'copy';
            }
          },
          false,
        );
        dragFileRef.value.addEventListener(
          'drop',
          (dragEvent: DragEvent) => {
            dragEvent.stopPropagation();
            dragEvent.preventDefault();
            const dataTransfer = dragEvent.dataTransfer;
            if (dataTransfer) {
              const files = dataTransfer.files;
              if (files.length > 0) {
                importXMLFile(files[0]);
              }
            }
          },
          false,
        );
      }

      /**
       * change 事件，每次变化都将新的数据弹出。
       * change 事件回调的参数中没有 XML 值，需要调用 emitXmlOfModeler 获取。
       */
      rawModeler.on('commandStack.changed', debounce(emitXmlOfModeler, 500));
      // 添加根节点事件
      rawModeler.on('root.added', (internalEvent: InternalEvent) => {
        bpmnRoot.value = internalEvent.element;
        emit('root-added', internalEvent);
      });
      // 选择元素改变事件
      rawModeler.on('selection.changed', (internalEvent: InternalEvent) => {
        const newSelection = internalEvent.newSelection;
        const element = !newSelection || newSelection.length < 1 ? undefined : (newSelection[0] as BpmnElement);
        selectedElement.value = element;
        updateAndEmitSelectedProperties(element);
      });
      // 元素属性变化事件
      // TODO 待验证：外部通过 API 更新 modeler 时，会触发这个事件吗？
      rawModeler.on('element.changed', (internalEvent: InternalEvent) => {
        /**
         * 元素改变时，改变的元素不一定是选中的元素
         * 因为无论选中什么元素，都能编辑流程根节点的属性，改变根节点的属性时，触发这个事件，对象为根节点，而不是选中的节点
         * 这时不应该更新选中元素的属性
         */
        if (toRaw(selectedElement.value) == internalEvent.element) {
          updateAndEmitSelectedProperties(internalEvent.element);
        }
      });

      /**
       * watch bpmnXml 没有设置 immediate，因为那时 bpmnModeler 还没准备好
       * 在 onMounted 中导入一下 bpmnXml 的初始值
       */
      updateXmlIfDifferent(bpmnXml.value);

      // 打印所有事件 console.log(bpmnModeler.value.get('eventBus'));
    });
  };

  /**
   * 改选了元素，或模型编辑器改变了选中元素的属性时调用
   *
   * @param element 选中的元素
   */
  const updateAndEmitSelectedProperties = (element?: BpmnElement) => {
    if (!element) {
      // 未选中元素，视为选中根节点流程对象
      const root: { id?: string; type?: string; name?: string } = bpmnRoot.value as {
        id?: string;
        type?: string;
        name?: string;
      };
      emit('update:selected-properties', {
        id: root?.id ?? '',
        type: root?.type ?? '',
        name: root?.name ?? '',
      });
    } else {
      const businessObject: BpmnBusiness | undefined = element.businessObject as BpmnBusiness;
      if (businessObject) {
        const attrs_: Record<string, string> | undefined = businessObject.$attrs as Record<string, string>;

        const conditionExpression = businessObject.conditionExpression;
        const loopCharacteristics = businessObject.loopCharacteristics;
        // 是否为多实例
        const multiInstance = !!loopCharacteristics;

        let createTaskEvent = false;
        let completeTaskEvent = false;
        const extensionElements = businessObject.extensionElements;
        if (extensionElements) {
          const values = extensionElements.values;
          if (values && values.length > 0) {
            const events = values.map(value => value.event ?? '').filter(event => !!event);
            createTaskEvent = events.includes('create');
            completeTaskEvent = events.includes('complete');
          }
        }

        const properties_: Record<string, unknown> = attrs_
          ? Object.keys(attrs_).reduce(
              (newPros, key) => {
                if (key.startsWith(NAMESPACE)) {
                  const rawKey = key.substring(NAMESPACE.length);
                  const rawValue = attrs_[key];
                  if (ARRAY_KEYS.includes(rawKey)) {
                    newPros[rawKey] = toArray(rawValue);
                  } else {
                    newPros[rawKey] = rawValue;
                  }
                }
                return newPros;
              },
              {} as Record<string, unknown>,
            )
          : {};

        emit('update:selected-properties', {
          ...properties_,
          id: businessObject.id,
          name: businessObject.name ?? '',
          async: businessObject.async || undefined,
          formKey: businessObject.formKey ? String(businessObject.formKey) : undefined,
          sourceType: businessObject.sourceRef?.$type ?? '',
          priority: businessObject.priority || undefined,
          dueDate: businessObject.dueDate || undefined,
          executionListener: businessObject.executionListener || undefined,
          taskListener: businessObject.taskListener || undefined,
          class: businessObject.class || undefined,
          delegateExpression: businessObject.delegateExpression || undefined,
          expression: businessObject.expression || undefined,
          conditionExpression: conditionExpression?.body ? String(conditionExpression.body) : undefined,
          type: element.type,
          asyncType: toStringArray(getAttribute('asyncType', attrs_)),
          assignee: multiInstance ? getAttribute('assignees', attrs_) : getAttribute('assignee', attrs_),
          completionConditionCount: Number(getAttribute('completionConditionCount', attrs_) ?? 0),
          // 多实例是否并行
          isSequential: !!loopCharacteristics?.isSequential,
          multiInstance,
          createTaskEvent,
          completeTaskEvent,
        });
      }
    }
  };
  return {};
}
