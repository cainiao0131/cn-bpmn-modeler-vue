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
import {
  BpmnBusiness,
  BpmnElement,
  ProcessElement,
  InternalEvent,
} from 'cn-bpmn-modeler-vue/src/cn-bpmn-modeler/types';

const emit = defineEmits<{
  (eventName: 'update:bpmn-xml', bpmnXml: string): void;
  (eventName: 'update:selected-element', selectedElement?: ProcessElement): void;
}>();

const props = defineProps({
  bpmnXml: {
    type: String,
    default: '',
  },
  selectedElement: {
    type: Object as PropType<ProcessElement>,
    default: undefined,
  },
});
const { bpmnXml, selectedElement } = toRefs(props);

// modeler 实例
const bpmnModeler = ref<typeof BpmnModeler>();
const dragFileRef = ref<HTMLElement>();
// 根节点
const bpmnRoot = ref<ProcessElement>();
// 选中的元素，选中多个元素时，视为没有选中元素
const selectedElementOfModeler = ref<ProcessElement>();

const isIn = ref(false);
const isOut = ref(false);

watch(
  () => {
    return selectedElement?.value;
  },
  (newValue, old) => {
    console.log('');
    console.log('watch selectedElement >>> old =', old);
    console.log('watch selectedElement >>> newValue =', newValue);
    console.log('watch selectedElement >>> selectedElementOfModeler.value =', selectedElementOfModeler.value);
    console.log('watch selectedElement >>> isIn.value =', isIn.value);
    console.log('watch selectedElement >>> isOut.value =', isOut.value);

    if (isOut.value) {
      isOut.value = false;
    } else if (selectedElementOfModeler.value) {
      console.log('watch selectedElement >>> update start');
      isIn.value = true;
      /**
       * 必须使用 toRaw()，否则 JS 组件的 API 会修改 Vue Ref 的只读属性导致报错
       * 不用担心性能，toRaw() 只是个引用赋值操作而已，获取了一下原对象引用
       */
      updateProperties(toRaw(selectedElementOfModeler.value), newValue);
      console.log('watch selectedElement >>> update end');
    }
  },
  { deep: true },
);

const updateProperties = (element: ProcessElement, properties?: ProcessElement) => {
  if (!properties || !bpmnModeler.value) {
    return;
  }
  const modeling: { updateProperties: (object: unknown, elementProperties: ProcessElement) => void } | undefined =
    bpmnModeler.value.get('modeling');
  if (!modeling) {
    return;
  }
  /**
   * element 是 Vue 的代理对象，
   * bpmn.js 的 API 中某些操作会更新代理类的只读属性导致报错，
   * 通过 toRaw() 得到原对象
   * 没有选中元素，更新根节点属性
   */
  modeling.updateProperties(element, properties);
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

/**
 * 重新绘制图表会导致位移
 * 因此只希望外部设置新的值时重新绘制
 * 流程图内部自己改变了值时，图表已经绘制为新的图了，这种情况导致的 bpmnXml 变化不应该触发重新绘制
 */
watch(bpmnXml, newValue => {
  updateXmlOfModelerIfDifferent(newValue);
});

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
  rawModeler.on('commandStack.changed', (internalEvent: InternalEvent) => {
    console.log('');
    console.log('commandStack.changed >>> internalEvent =', internalEvent);
    // 弹出新的 xml
    emitXmlOfModeler();
  });

  // 添加根节点事件
  rawModeler.on('root.added', (internalEvent: InternalEvent) => {
    console.log('');
    console.log('root.added >>> internalEvent =', internalEvent);
    const bpmnRoot_ = internalEvent.element;
    bpmnRoot.value = bpmnRoot_;
  });

  // 选择元素改变事件
  rawModeler.on('selection.changed', (internalEvent: InternalEvent) => {
    console.log('');
    console.log('selection.changed >>> internalEvent =', internalEvent);
    const newSelection = internalEvent.newSelection;
    if (newSelection && newSelection.length == 1) {
      const selectedElementOfModeler_ = newSelection[0] as BpmnElement;
      selectedElementOfModeler.value = selectedElementOfModeler_;
      const businessObject = selectedElementOfModeler_.businessObject as BpmnBusiness | undefined;
      emit('update:selected-element', { id: businessObject?.id, name: businessObject?.name });
    } else {
      selectedElementOfModeler.value = undefined;
      emit('update:selected-element', undefined);
    }
  });

  // 元素属性变化事件
  rawModeler.on('element.changed', (internalEvent: InternalEvent) => {
    console.log('');
    console.log('element.changed >>> internalEvent =', internalEvent);
    console.log('element.changed >>> internalEvent.element?.businessObject =', internalEvent.element?.businessObject);
    const selectedElement_ = selectedElement!.value;
    console.log('element.changed >>> selectedElement_ =', selectedElement_);
    console.log('element.changed >>> selectedElementOfModeler.value =', selectedElementOfModeler.value);
    console.log('element.changed >>> internalEvent.element =', internalEvent.element);
    console.log('element.changed >>> isIn.value =', isIn.value);
    console.log(
      'element.changed >>> toRaw(selectedElementOfModeler.value) == internalEvent.element =',
      toRaw(selectedElementOfModeler.value) == internalEvent.element,
    );

    /**
     * toRaw(selectedElementOfModeler.value) == internalEvent.element
     * 用于判断当前事件关联的对象与 toRaw(selectedElementOfModeler.value) 是不是同一个
     * 之所以可能会不同，是因为某些用户操作，可能会导致多个元素实例都弹出 element.changed 事件
     * 例如改变任务类型，除了对应的任务节点对象会弹出事件，前后的连线元素也会弹出 element.changed 事件
     * 这里的判断能避免【连线元素】弹出的事件触发错误的 emit
     */
    if (toRaw(selectedElementOfModeler.value) == internalEvent.element) {
      if (isIn.value) {
        isIn.value = false;
      } else {
        isOut.value = true;
        const businessObject = internalEvent.element?.businessObject as BpmnBusiness | undefined;
        console.log('emit start');
        emit('update:selected-element', { id: businessObject?.id, name: businessObject?.name });
        console.log('emit end');
      }
    }
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
