import BpmnModeler from 'bpmn-js/lib/Modeler';
import { debounce, getAttribute, guid, toArray, toStringArray } from './util/util';
import { onMounted, toRaw } from 'vue';
import { flowableExtensions } from './moddle-extensions/flowable';
import flowableControlsModule from './additional-modules/flowable';
import { ARRAY_KEYS, BpmnBusiness, BpmnElement, EmitType, InternalEvent, NAMESPACE, ProcessElement } from './types';
import { cnTranslator } from './util/locale';

export function useInit(
  emit: EmitType,
  importXMLFile: (file: File) => void,
  emitXmlOfModeler: () => void,
  updateXmlOfModelerIfDifferent: (newValue: string, success?: () => void) => void,
  canvasId: Ref<string>,
  keyboardBindTo: Ref<unknown>,
  dragFileRef: Ref<HTMLElement | undefined>,
  bpmnXml: Ref<string>,
  locale: Ref<Record<string, string> | undefined> | undefined,
  bpmnModeler: Ref<typeof BpmnModeler | undefined>,
  bpmnRoot: Ref<ProcessElement | undefined>,
  internalElementContainer: Ref<Record<string, ProcessElement>>,
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
            const locale_ = locale?.value;
            return locale_ ? cnTranslator(english, replacements, locale_) : english;
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
        const bpmnRoot_ = internalEvent.element;
        bpmnRoot.value = bpmnRoot_;
        // emit('root-added', internalEvent);
        nextTick(() => {
          // 需要在 nextTick 中计算，否则 root 对象的 children 子对象无法被获取到
          internalElementContainer.value = buildElementContainerByRoot(bpmnRoot_);
        });
      });
      // 选择元素改变事件
      rawModeler.on('selection.changed', (internalEvent: InternalEvent) => {
        let selectedIds_: Array<string> = [];
        const newSelection = internalEvent.newSelection;
        if (newSelection && newSelection.length > 0) {
          selectedIds_ = newSelection.map(el => {
            const el_ = el as { id?: string };
            return el_?.id || '';
          });
        }
        // emit('update:selected-ids', selectedIds_);
      });
      // 元素属性变化事件
      // TODO 待验证：外部通过 API 更新 modeler 时，会触发这个事件吗？
      rawModeler.on('element.changed', (internalEvent: InternalEvent) => {
        const el_ = internalEvent.element;
        if (el_) {
          const id = el_.id;
          if (id) {
            internalElementContainer.value[id] = getPropertiesOfElement(el_);
          }
        }
      });

      /**
       * watch bpmnXml 没有设置 immediate，因为那时 bpmnModeler 还没准备好
       * 在 onMounted 中导入一下 bpmnXml 的初始值
       */
      updateXmlOfModelerIfDifferent(bpmnXml.value);

      emit('modeler-ready', rawModeler);
      // 打印所有事件 console.log(bpmnModeler.value.get('eventBus'));
    });
  };

  const buildElementContainerByRoot = (root?: ProcessElement): Record<string, ProcessElement> => {
    if (!root) {
      return {};
    }
    const elementContainer_: Record<string, ProcessElement> = {
      [root.id as string]: getPropertiesOfElement(root),
    };
    setElements(elementContainer_, root.children);
    return elementContainer_;
  };

  const setElements = (elementContainer_: Record<string, ProcessElement>, elements?: Array<ProcessElement>) => {
    if (!elements) {
      return;
    }
    elements.forEach(el_ => {
      elementContainer_[el_.id as string] = getPropertiesOfElement(el_);
      setElements(elementContainer_, el_.children);
    });
  };

  const getPropertiesOfElement = (element: ProcessElement): ProcessElement => {
    const businessObject: BpmnBusiness | undefined = element.businessObject as BpmnBusiness;
    if (!businessObject) {
      return {};
    }

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

    return {
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
    };
  };
  return {};
}
