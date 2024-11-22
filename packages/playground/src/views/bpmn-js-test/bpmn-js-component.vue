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
import { flowableExtensions } from '../../../../cn-bpmn-modeler/src/cn-bpmn-modeler/moddle-extensions/flowable';
import flowableControlsModule from '../../../../cn-bpmn-modeler/src/cn-bpmn-modeler/additional-modules/flowable';
import { cnTranslator } from '../../../../cn-bpmn-modeler/src/cn-bpmn-modeler/util/locale';
import { CN } from '@/utils';

const emit = defineEmits<{
  (eventName: 'update:bpmn-xml', message: string): void;
}>();

const props = defineProps({
  bpmnXml: {
    type: String,
    default: '',
  },
});
const { bpmnXml } = toRefs(props);

// modeler 实例
const bpmnModeler = ref<typeof BpmnModeler>();
const dragFileRef = ref<HTMLElement>();

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
