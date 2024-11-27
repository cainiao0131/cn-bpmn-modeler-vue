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
const { bpmnXml, additionalModules, locale, keyboardBindTo, bpmnModeleroptions } = toRefs(props);

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
// 根节点
const bpmnRoot = ref<ProcessElement>();

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

const bindEventListeners = (bpmnModeler_: typeof BpmnModeler) => {
  // 打印所有事件 console.log(bpmnModeler.value.get('eventBus'));
  /**
   * change 事件，每次变化都将新的数据弹出。
   * change 事件回调的参数中没有 XML 值，需要调用 emitXmlOfModeler 获取。
   */
  bpmnModeler_.on('commandStack.changed', debounce(emitXmlOfModeler, 500));
  // 添加根节点事件
  bpmnModeler_.on('root.added', (internalEvent: InternalEvent) => {
    const bpmnRoot_ = internalEvent.element!;
    bpmnRoot.value = bpmnRoot_;
    // 需要在 nextTick 中计算，否则 root 对象的 children 子对象无法被获取到
    nextTick(() => {
      emitAllElements(bpmnRoot_);
    });
  });
  // 选择元素改变事件
  bpmnModeler_.on('selection.changed', (internalEvent: InternalEvent) => {
    const newSelection = internalEvent.newSelection as Array<ProcessElement> | undefined;
    emit('selection-changed', newSelection ?? []);
  });
  // 元素属性变化事件
  bpmnModeler_.on('element.changed', (internalEvent: InternalEvent) => {
    emit('element-changed', createEvent(internalEvent.element!));
  });
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

const createEvent = (elementOfModeler: ProcessElement) => {
  return { modelerElement: elementOfModeler, element: createElement(elementOfModeler) };
};

const emitElements = (elements?: Array<ProcessElement>) => {
  if (!elements) {
    return;
  }
  elements.forEach(el_ => {
    emit('element-changed', createEvent(el_));
    emitElements(el_.children);
  });
};

const emitAllElements = (root: ProcessElement) => {
  emit('root-added', createEvent(root));
  emitElements(root.children);
};

const createElement = (element: ProcessElement): ProcessElement => {
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
