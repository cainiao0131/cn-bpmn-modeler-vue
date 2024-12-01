<template>
  <div ref="bpmnModelerContainer" class="bpmn-modeler-wrapper" :style="{ height }">
    <div ref="container" class="content">
      <!-- 提示 -->
      <div v-show="!bpmnXml && !errorMessage" ref="dragFileRef" class="message intro">
        <div class="note">可拖动 BPMN 文件到这里</div>
      </div>
      <!-- 错误消息 -->
      <div v-show="!!errorMessage" class="message error">
        <div class="note">
          <p>无法显示 BPMN 2.0 图表</p>
          <div class="details">
            <span>问题原因</span>
            <pre>{{ errorMessage }}</pre>
          </div>
        </div>
      </div>
      <div v-show="!!bpmnXml" :id="canvasId" class="canvas" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import BpmnModeler from 'bpmn-js/lib/Modeler';
import { SaveXMLResult } from 'bpmn-js/lib/BaseViewer';
import { ARRAY_KEYS, BpmnBusiness, EmitType, InternalEvent, NAMESPACE, ProcessElement } from './types';
import flowableControlsModule from './additional-modules/flowable';
import { flowableExtensions } from './moddle-extensions/flowable';
import { cnTranslator } from './util/locale';
import { debounce, getAttribute, guid, toArray, toStringArray } from './util/util';

const emit = defineEmits<EmitType>();

const props = defineProps({
  bpmnXml: {
    type: String,
    default: '',
  },
  selectedElementIds: {
    type: Array as PropType<Array<string>>,
    default: [],
  },
  additionalModules: {
    type: Array,
    default: () => {
      return [];
    },
  },
  locale: {
    type: Object as PropType<Record<string, string>>,
    default: () => {
      return undefined;
    },
  },
  keyboardBindTo: {
    type: Object,
    default: () => {
      return window;
    },
  },
  bpmnModeleroptions: {
    type: Object as PropType<Record<string, unknown>>,
    default: () => {
      return {};
    },
  },
  height: {
    type: [String, Number],
    default: '100%',
  },
});
const { bpmnXml, additionalModules, locale, keyboardBindTo, bpmnModeleroptions, selectedElementIds } = toRefs(props);

/**
 * 重新绘制图表会导致位移
 * 因此只希望外部设置新的值时重新绘制
 * 流程图内部自己改变了值时，图表已经绘制为新的图了，这种情况导致的 bpmnXml 变化不应该触发重新绘制
 */
watch(bpmnXml, newValue => {
  resetXmlOfModelerIfDifferent(newValue);
});

// 画布 DOM ID
const canvasId = ref('_canvas_id');
// 错误信息
const errorMessage = ref('');
const dragFileRef = ref<HTMLElement>();
// BpmnModeler 实例
const bpmnModeler = ref<typeof BpmnModeler>();
/**
 * processElementRepository 的 Kye 是元素的 bpmn.js 内部对象，Value 是组件定义的流程元素对象
 * 之所以需要 processElementRepository 是因为 bpmn.js 的 element.changed 事件回调参数没有旧值
 * 而元素的 ID 又是可变的，因此不能用 ID 从容器中获取旧值
 * 例如 ID 从 a 改为 b，此时在 element.changed 回调中只有一个 ID 为 b 的元素
 * 此时在回调中无法知道这个元素是容器中的 ID 为 a 的那个元素的新值
 * 因此只能维护一个从 bpmn.js 内部对象到组件定义的流程元素对象之间的映射
 * bpmn.js 内部对象相同则视为是同一个元素
 */
const processElementRepository = ref<Map<ProcessElement, ProcessElement>>(new Map());
// ID 到 bpmn.js 元素对象的映射
const modelerElementContainer = ref<Record<string, ProcessElement>>({});

onMounted(() => {
  init();
});

const init = () => {
  // canvasId_ 不能以数字开头，否则 bpmn.js 会报错
  const canvasId_ = `_${guid()}`;
  canvasId.value = canvasId_;
  nextTick(() => {
    initForImportXmlFileByDrag();

    const newModeler = createBpmnModeler(canvasId_);
    bpmnModeler.value = newModeler;
    bindEventListeners(newModeler);

    /**
     * watch bpmnXml 没有设置 immediate，因为那时 bpmnModeler 还没准备好
     * 在 onMounted 中导入一下 bpmnXml 的初始值
     */
    resetXmlOfModelerIfDifferent(bpmnXml.value);

    emit('modeler-ready', newModeler);
  });
};

const onElementChanged = (newModelerElement: ProcessElement) => {
  const newProcessElement = createElement(newModelerElement);
  const oldProcessElement = processElementRepository.value.get(newModelerElement);
  emit('element-changed', { newProcessElement, oldProcessElement });

  const newId = newModelerElement.id;
  modelerElementContainer.value[newId] = newModelerElement;

  if (oldProcessElement) {
    const oldId = oldProcessElement.id;
    if (oldId != newId) {
      // ID 发生了改变：
      // 1）需要垃圾回收
      delete modelerElementContainer.value[oldId];
      // 2）更新 selectedElementIds
      const selectedElementIds_ = selectedElementIds.value;
      let isIncludes = false;
      const newIds: Array<string> = [];
      selectedElementIds_.forEach(selectedElementId => {
        if (selectedElementId == oldId) {
          newIds.push(newId);
          isIncludes = true;
        } else {
          newIds.push(selectedElementId);
        }
      });
      if (isIncludes) {
        emit('update:selected-element-ids', newIds);
      }
    }
  }

  processElementRepository.value.set(newModelerElement, newProcessElement);
};

const bindEventListeners = (bpmnModeler_: typeof BpmnModeler) => {
  // 打印所有事件 console.log(bpmnModeler.value.get('eventBus'));
  /**
   * change 事件，每次变化都将新的数据弹出。
   * change 事件回调的参数中没有 XML 值，需要调用 emitXmlOfModeler 获取。
   */
  bpmnModeler_.on('commandStack.changed', debounce(emitXmlOfModeler, 500));
  // 添加根节点事件
  bpmnModeler_.on('root.added', (internalEvent: InternalEvent) => {
    // 需要在 nextTick 中计算，否则 root 对象的 children 子对象无法被获取到
    nextTick(() => {
      emitAllElements(internalEvent.element!);
    });
  });
  // 选择元素改变事件
  bpmnModeler_.on('selection.changed', (internalEvent: InternalEvent) => {
    const newSelection = internalEvent.newSelection as Array<ProcessElement> | undefined;
    emit('update:selected-element-ids', newSelection ? newSelection.map(element_ => element_.id) : []);
  });
  // 元素属性变化事件
  bpmnModeler_.on('element.changed', (internalEvent: InternalEvent) => {
    onElementChanged(internalEvent.element!);
  });
};

// 插入 XML
const resetXmlOfModeler = (newVal?: string, success?: () => void) => {
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
          errorMessage.value = err.message || 'importXML fail';
          console.error('resetXmlOfModeler() >>> err =', err);
        });
    }
  }
};

const createBpmnModeler = (canvasId_: string) => {
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
  return new BpmnModeler(
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
      toRaw(bpmnModeleroptions.value),
    ),
  );
};

const initForImportXmlFileByDrag = () => {
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
            importXmlFile(files[0]);
          }
        }
      },
      false,
    );
  }
};

const emitElements = (elements?: Array<ProcessElement>) => {
  if (!elements) {
    return;
  }
  elements.forEach(el_ => {
    onElementChanged(el_);
    emitElements(el_.children);
  });
};

const emitAllElements = (root: ProcessElement) => {
  emit('root-added', createElement(root));
  emitElements(root.children);
};

const createElement = (element: ProcessElement): ProcessElement => {
  const businessObject: BpmnBusiness | undefined = element.businessObject as BpmnBusiness;
  const id = element.id;
  if (!businessObject) {
    return { id };
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
    id,
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

// 将文件转换为字符串后导入 BPMN modeler
const importXmlFile = (file: File) => {
  const reader = new FileReader();
  reader.onload = (pe: ProgressEvent) => {
    const target = pe.target;
    if (target) {
      emit('update:bpmn-xml', String((target as FileReader).result));
    }
  };
  reader.readAsText(file);
};

// 弹出最新的值，更新 bpmnXml
const emitXmlOfModeler = () => {
  bpmnModeler.value
    ?.saveXML({ format: true })
    .then((saveXMLResult: SaveXMLResult) => {
      emit('update:bpmn-xml', saveXMLResult.xml || '');
    })
    .catch((err: unknown) => {
      console.error('保存 XML 时出错：', err);
      emit('update:bpmn-xml', '');
    });
};

/**
 * 更新 Xml，只有 Xml 有变化时才插入。
 * 因为插入会导致图像闪烁以及失去焦点，尽量避免不必要的插入。
 */
const resetXmlOfModelerIfDifferent = (newValue: string, success?: () => void) => {
  bpmnModeler.value
    ?.saveXML({ format: true })
    .then((saveXMLResult: SaveXMLResult) => {
      if (newValue != saveXMLResult.xml) {
        resetXmlOfModeler(newValue, success);
      }
    })
    .catch(() => {
      resetXmlOfModeler(newValue, success);
    });
};

const updateElement = (selectedElementId: string, key: string, value?: string): boolean => {
  if (!bpmnModeler.value) {
    console.error('updateElement() >>> bpmnModeler =', bpmnModeler.value);
    return false;
  }
  const modeling:
    | { updateProperties: (object: unknown, elementProperties: Record<string, string | undefined>) => void }
    | undefined = bpmnModeler.value.get('modeling');
  if (!modeling) {
    console.error('updateElement() >>> modeling =', modeling);
    return false;
  }
  const modelerElement = modelerElementContainer.value[selectedElementId];

  if (!modelerElement) {
    console.error('updateElement() >>> can not find modelerElement by selectedElementId ', selectedElementId);
    return false;
  }

  if (key == 'id') {
    // 要更新的属性是元素 ID 时，做一些特殊处理，因为 ID 属性代表的是实体标识，比较特殊
    if (selectedElementId == value) {
      // 新的 ID 与旧的 ID 相同，什么都不用做
      return true;
    }
    if (!value) {
      console.error('updateElement() >>> id can not be empty');
      return false;
    }
    // 需要修改 ID，校验新 ID 是否已经被别的元素使用
    if (modelerElementContainer.value[value]) {
      console.error(`updateElement() >>> id cannot be duplicated, the id "${value}" already exists`);
      return false;
    }
  }

  /**
   * modelerElement 是 Vue 的代理对象，
   * bpmn.js 的 API 中某些操作会更新代理类的只读属性导致报错，
   * 通过 toRaw() 得到原对象
   * 没有选中元素，更新根节点属性
   */
  modeling.updateProperties(toRaw(modelerElement), { [key]: value });
  return true;
};

defineExpose({
  updateElement,
});
</script>

<style lang="less">
@import 'bpmn-js/dist/assets/bpmn-js.css';
@import 'bpmn-js/dist/assets/diagram-js.css';
@import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
</style>
<style lang="less" scoped>
.bpmn-modeler-wrapper {
  .content,
  .content > div {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  .content {
    > .message {
      text-align: center;
      display: table;
      font-size: 16px;
      color: #111;
      .note {
        vertical-align: middle;
        text-align: center;
        display: table-cell;
      }
    }
    .error {
      .details {
        max-width: 500px;
        font-size: 12px;
        margin: 20px auto;
        text-align: left;
      }
      pre {
        border: solid 1px #ccc;
        background: #eee;
        padding: 10px;
      }
    }
  }
}
</style>
