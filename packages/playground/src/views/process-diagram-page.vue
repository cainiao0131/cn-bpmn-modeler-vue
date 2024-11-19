<template>
  <div class="process-diagram-page-wrapper">
    <a-row type="flex" class="process-diagram-page-row" :gutter="10">
      <a-col :span="12">
        <a-card
          title="流程图"
          :body-style="{ height: `calc(100vh - ${cardHeight}px)`, overflow: 'auto', paddingBottom: 0 }"
        >
          <a-row type="flex">
            <a-col flex="auto">
              <cn-bpmn-modeler
                :height="`calc(100vh - ${cardHeight + 30}px)`"
                :locale="CN"
                v-model:bpmn-xml="selectedProcess.bpmnXml"
                v-model:selected-ids="selectedIds"
                v-model:element-container="elementContainer"
              />
            </a-col>
          </a-row>
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card
          title="流程数据"
          :body-style="{ height: `calc(100vh - ${cardHeight}px)`, overflow: 'auto', paddingBottom: 0 }"
        >
          <template #extra>
            <a-button type="primary" @click="copyPreview">复制</a-button>
          </template>
          <a-collapse v-model:activeKey="activeKeys">
            <a-collapse-panel key="selectedIds" header="selected ids">
              <p>{{ selectedIds }}</p>
            </a-collapse-panel>
            <a-collapse-panel key="elementContainer" header="elementContainer">
              <p>{{ elementContainer }}</p>
            </a-collapse-panel>
            <a-collapse-panel key="bpmnXml" header="BPMN XML">
              <codemirror
                v-if="selectedProcess.bpmnXml"
                :model-value="selectedProcess.bpmnXml"
                disabled
                :autofocus="true"
                :indent-with-tab="true"
                :tab-size="2"
                :extensions="extensions"
              />
            </a-collapse-panel>
          </a-collapse>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue';
import { copyText } from '@/utils/domUtils';
import { CN } from '@/utils';
import { ElementProperties } from 'cn-bpmn-modeler-vue';
import { Codemirror } from 'vue-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { java } from '@codemirror/lang-java';

const extensions = [java(), oneDark];

const activeKeys = ref(['selectedIds', 'elementContainer', 'bpmnXml']);

// 选中的流程
const selectedProcess = ref<{ bpmnXml: string }>({ bpmnXml: '' });
const cardHeight = ref(152);

const selectedIds = ref<Array<string>>([]);
const elementContainer = ref<Record<string, ElementProperties>>({});

// 复制预览
const copyPreview = () => {
  copyText(selectedProcess.value.bpmnXml ?? '').then(() => {
    message.success('已复制到剪切板');
  });
};
</script>

<style lang="less" scoped>
.process-diagram-page-wrapper {
  height: 100%;
  .process-diagram-page-row {
    height: 100%;
  }
}
</style>
