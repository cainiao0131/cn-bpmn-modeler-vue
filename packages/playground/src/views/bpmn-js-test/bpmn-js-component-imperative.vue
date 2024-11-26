<template>
  <div ref="bpmnModelerContainer" class="bpmn-modeler-wrapper" :style="{ height: '100%' }">
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
      <div v-show="!!bpmnXml" id="canvas-container" class="canvas" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import BpmnModeler from 'bpmn-js/lib/Modeler';
import { SaveXMLResult } from 'bpmn-js/lib/BaseViewer';
import { CN } from '@/utils';
import { flowableExtensions } from '../../../../cn-bpmn-modeler/src/cn-bpmn-modeler/moddle-extensions/flowable';
import flowableControlsModule from '../../../../cn-bpmn-modeler/src/cn-bpmn-modeler/additional-modules/flowable';
import { cnTranslator } from '../../../../cn-bpmn-modeler/src/cn-bpmn-modeler/util/locale';
import { BpmnBusiness, ProcessElement, InternalEvent } from 'cn-bpmn-modeler-vue/src/cn-bpmn-modeler/types';

export type ElementChangeEvent = {
  /**
   * 元素对应的 bpmn.js 内部对象，应该被作为只读属性使用，不应该修改该对象内部属性
   * 由于元素的 ID 也能修改，因此无法用 ID 作为主键
   * 统一用 modelerElement 作为索引元素的主键
   */
  modelerElement: ProcessElement;
  element: ProcessElement;
};

const emit = defineEmits<{
  (eventName: 'update:bpmn-xml', bpmnXml: string): void;
  (eventName: 'element-change', elementChangeEvent: ElementChangeEvent): void;
  (eventName: 'selection-change', selectedModelerElements: Array<ProcessElement>): void;
}>();

const props = defineProps({
  bpmnXml: {
    type: String,
    default: '',
  },
});
const { bpmnXml } = toRefs(props);

/**
 * 重新绘制图表会导致位移
 * 因此只希望外部设置新的值时重新绘制
 * 流程图内部自己改变了值时，图表已经绘制为新的图了，这种情况导致的 bpmnXml 变化不应该触发重新绘制
 */
watch(bpmnXml, newValue => {
  updateXmlOfModelerIfDifferent(newValue);
});

// modeler 实例
const bpmnModeler = ref<typeof BpmnModeler>();
const dragFileRef = ref<HTMLElement>();
// 根节点
const bpmnRoot = ref<ProcessElement>();

const updateProperties = (modelerElement: ProcessElement, element: ProcessElement) => {
  if (!bpmnModeler.value) {
    return;
  }
  const modeling: { updateProperties: (object: unknown, elementProperties: ProcessElement) => void } | undefined =
    bpmnModeler.value.get('modeling');
  if (!modeling) {
    return;
  }
  /**
   * modelerElement 是 Vue 的代理对象，
   * bpmn.js 的 API 中某些操作会更新代理类的只读属性导致报错，
   * 通过 toRaw() 得到原对象
   * 没有选中元素，更新根节点属性
   */
  modeling.updateProperties(toRaw(modelerElement), element);
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

// 向 bpmn.js 插入 XML
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
            // 根据当前窗口居中
            const canvas = bpmnModeler_.get('canvas') as { zoom: (a: string, b: string) => void };
            canvas.zoom('fit-viewport', 'auto');
          }, 1);
          if (success) {
            success();
          }
        })
        .catch((err: { message: string }) => {
          errorMessage.value = err.message || '打开图表失败';
          console.error('updateXmlOfModeler() >>> err =', err);
        });
    }
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

// 将文件转换为字符串后导入 BPMN modeler
const importXMLFile = (file: File) => {
  const reader = new FileReader();
  reader.onload = (pe: ProgressEvent) => {
    const target = pe.target;
    if (target) {
      emit('update:bpmn-xml', String((target as FileReader).result));
    }
  };
  reader.readAsText(file);
};

const createData = (elementOfModeler: ProcessElement) => {
  const businessObject = elementOfModeler?.businessObject as BpmnBusiness | undefined;
  return { id: elementOfModeler.id, type: elementOfModeler.type, name: businessObject?.name };
};

const createEvent = (elementOfModeler: ProcessElement) => {
  return { modelerElement: elementOfModeler, element: createData(elementOfModeler) };
};

const emitElements = (elements?: Array<ProcessElement>) => {
  if (!elements) {
    return;
  }
  elements.forEach(el_ => {
    emit('element-change', createEvent(el_));
    emitElements(el_.children);
  });
};

const emitRoot = (root: ProcessElement) => {
  emit('element-change', createEvent(root));
  emitElements(root.children);
};

onMounted(() => {
  const newAdditionalModules: Array<unknown> = [];
  newAdditionalModules.push(flowableControlsModule);
  newAdditionalModules.push({
    translate: [
      'value',
      (english: string, replacements: Record<string, string>) => {
        return cnTranslator(english, replacements, CN);
      },
    ],
  });
  const rawModeler = new BpmnModeler({
    container: '#canvas-container',
    keyboard: {
      bindTo: window,
    },
    additionalModules: newAdditionalModules,
    moddleExtensions: {
      flowable: flowableExtensions,
    },
  });
  bpmnModeler.value = rawModeler;

  // 任何会导致 xml 变化的状态更新都会触发，例如包括位置移动，但不包括选中的节点变化
  rawModeler.on('commandStack.changed', () => {
    emitXmlOfModeler();
  });

  rawModeler.on('root.added', (internalEvent: InternalEvent) => {
    const bpmnRoot_ = internalEvent.element!;
    bpmnRoot.value = bpmnRoot_;
    // 需要在 nextTick 中计算，否则 root 对象的 children 子对象无法被获取到
    nextTick(() => {
      emitRoot(bpmnRoot_);
    });
  });

  // 选择元素改变事件
  rawModeler.on('selection.changed', (internalEvent: InternalEvent) => {
    const newSelection = internalEvent.newSelection as Array<ProcessElement> | undefined;
    emit('selection-change', newSelection ?? []);
  });

  // 元素属性变化事件
  rawModeler.on('element.changed', (internalEvent: InternalEvent) => {
    emit('element-change', createEvent(internalEvent.element!));
  });

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
   * watch bpmnXml 没有设置 immediate，因为那时 bpmnModeler 还没准备好
   * 在 onMounted 中导入一下 bpmnXml 的初始值
   */
  updateXmlOfModelerIfDifferent(bpmnXml.value);
});

// 错误信息
const errorMessage = ref('');

defineExpose({
  updateProperties,
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
