<template>
  <div class="bpmn-modeler-wrapper" :style="{ height }">
    <div class="content">
      <!-- 提示 -->
      <div v-show="isShowDrag" ref="dragFileRef" class="message">
        <div class="note">可拖动 BPMN 文件到这里</div>
      </div>
      <!-- 错误消息 -->
      <div v-show="isShowError" class="message error">
        <div class="note">
          <p>无法显示 BPMN 2.0 图表</p>
          <div class="details">
            <span>问题原因</span>
            <pre>{{ errorMessage }}</pre>
          </div>
        </div>
      </div>
      <div v-show="hasDiagram" id="_bpmn-modeler-canvas" class="canvas" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, toRefs, PropType } from 'vue';
import BpmnJS from 'bpmn-js/lib/Modeler';
import { getInitialXml } from '../utils';
import { useImportToModeler } from './import-to-modeler';
import { useInit } from './init';
import { InternalEvent, ProcessModelerApi } from '../types';

const emit = defineEmits<{
  (eventName: 'update:bpmn-xml', message: string): void;
  (eventName: 'api-ready', message: ProcessModelerApi): void;
  (eventName: 'modeler-ready', message: typeof BpmnJS): void;
  (eventName: 'root-added', message: InternalEvent): void;
  (eventName: 'selection-changed', message: InternalEvent): void;
}>();

const props = defineProps({
  keyboardBindTo: {
    type: Object,
    default: window,
  },
  bpmnXml: {
    type: String,
    default: '',
  },
  height: {
    type: [String, Number],
    default: '100%',
  },
  translator: {
    type: Function as PropType<(english: string, replacements: Record<string, string>) => string>,
    default: () => {
      return () => undefined;
    },
  },
  options: {
    type: Object as PropType<Record<string, unknown>>,
    default: () => {
      return {};
    },
  },
  additionalModules: {
    type: Array,
    default: () => {
      return () => {
        return [];
      };
    },
  },
});
const { translator, bpmnXml, additionalModules, options, keyboardBindTo } = toRefs(props);

// bpmn.js 实例
const bpmnModeler = ref<typeof BpmnJS>();
// 拖动文件的组件，ref 不能放到组合式函数中，否则无法绑定组件引用
const dragFileRef = ref<HTMLElement>();
// 错误消息
const errorMessage = ref('');
// 是否显示错误信息容器
const isShowError = computed(() => {
  return !!errorMessage.value;
});
// 是否有图表内容
const hasDiagram = computed(() => {
  if (!bpmnXml.value) {
    return false;
  }
  return !!bpmnXml.value.trim();
});
// 是否展示提示
const isShowDrag = computed(() => {
  return !isShowError.value && !hasDiagram.value;
});

/**
 * 将 bpmnXml 更新为 Modeler 的最新值
 * 具体的：从 Modeler 中获取最新的 XML 并弹出
 */
const emitModelerXml = () => {
  bpmnModeler.value
    .saveXML({ format: true })
    .then(({ xml }: { xml: string }) => {
      emit('update:bpmn-xml', xml || '');
    })
    .catch((err: unknown) => {
      console.error('保存 XML 时出错：', err);
      emit('update:bpmn-xml', '');
    });
};

// 导入数据到 Modeler
const { importIfDifferent, importAndEmitIfDifferent, importXMLFile } = useImportToModeler(
  bpmnModeler,
  errorMessage,
  emitModelerXml,
);

/**
 * 不设置 immediate，因为那时 bpmnModeler 还没准备好
 * 在 onMounted 中 插入一下初始值
 */
watch(bpmnXml, newValue => {
  importIfDifferent(newValue);
});

const getProcessModelerApi = (): ProcessModelerApi => {
  return {
    newProcess: () => {
      importAndEmitIfDifferent(getInitialXml());
    },
    updateProperties: (element: unknown, properties: Record<string, string | Array<unknown> | null>) => {
      // 复制一下，避免对其的兼容性修改影响到原对象
      const copyProperties = Object.assign({}, properties);
      const documentation = copyProperties.documentation;
      copyProperties.documentation = documentation
        ? [bpmnModeler.value.get('moddle').create('bpmn:Documentation', { text: documentation })]
        : [];
      /**
       * 需要通过 toRaw() 获得原始对象
       * 因为 bpmn.js 的 API 中某些操作会设置代理类的只读属性导致报错
       */
      bpmnModeler.value.get('modeling').updateProperties(toRaw(element), copyProperties);
    },
    undo: () => {
      bpmnModeler.value.get('commandStack').undo();
    },
    redo: () => {
      bpmnModeler.value.get('commandStack').redo();
    },
    getSVG: (): Promise<string> => {
      return new Promise((resolve, reject) => {
        bpmnModeler.value
          .saveSVG()
          .then(({ svg }: { svg: string }) => {
            resolve(svg);
          })
          .catch((err: unknown) => {
            reject(err);
          });
      });
    },
    importXMLFile: (file: File) => {
      importXMLFile(file);
    },
  };
};

useInit(
  getProcessModelerApi,
  importXMLFile,
  emitModelerXml,
  importIfDifferent,
  keyboardBindTo,
  dragFileRef,
  bpmnXml,
  translator,
  bpmnModeler,
  errorMessage,
  options,
  additionalModules,
  emit,
);
</script>

<style lang="less">
@import 'bpmn-js/dist/assets/bpmn-js.css';
@import 'bpmn-js/dist/assets/diagram-js.css';
@import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
@import 'bpmn-js-properties-panel/dist/assets/properties-panel.css';
</style>
<style lang="less" scoped>
.bpmn-modeler-wrapper {
  :deep(.bjs-powered-by) {
    display: none;
  }
  .content,
  .content > div {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  .content {
    .properties-panel-parent {
      border-left: 1px solid #ccc;
      overflow: auto;
      top: 0;
      position: absolute;
      right: 0;
      width: 200px;
      &:empty {
        display: none;
      }
      > .djs-properties-panel {
        padding-bottom: 70px;
        min-height: 100%;
      }
    }
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
