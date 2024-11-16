<template>
  <div class="bpmn-editor-wrapper" :style="{ height }">
    <cn-bpmn-modeler
      :bpmn-xml="bpmnXml"
      :height="height"
      :keyboard-bind-to="keyboardBindTo"
      :translator="translator"
      @update:bpmn-xml="onUpdateBpmnXml"
    />
  </div>
</template>

<script lang="ts" setup>
import BpmnModeler from 'bpmn-js/lib/Modeler';
import { InternalEvent, ProcessModelerApi } from 'cn-bpmn-modeler-vue';

const emit = defineEmits<{
  (eventName: 'api-ready', message: ProcessModelerApi): void;
  (eventName: 'modeler-ready', message: typeof BpmnModeler): void;
  (eventName: 'update:bpmn-xml', message: string): void;
  (eventName: 'root-added', message: InternalEvent): void;
  (eventName: 'selection-changed', message: InternalEvent): void;
}>();

const props = defineProps({
  keyboardBindTo: {
    type: Object,
    default: window,
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
  bpmnXml: {
    type: String,
    /**
     * 因为需要通过 bpmnXml 来判断是已经有导入的流程图了
     * 所以必须通过 v-model 来更新 bpmnXml，因此要求客户端程序员一定要设置 v-model:bpmnXml
     */
    required: true,
  },
});
const { translator, bpmnXml } = toRefs(props);

const onUpdateBpmnXml = (xml: string) => {
  emit('update:bpmn-xml', xml);
};

const options = ref({
  propertiesPanel: {
    parent: '#js-properties-panel',
  },
});
</script>

<style lang="less" scoped>
.bpmn-editor-wrapper {
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
}
</style>
