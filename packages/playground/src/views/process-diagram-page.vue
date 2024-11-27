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
              <cn-bpmn-modeler-imperative
                :height="`calc(100vh - ${cardHeight + 30}px)`"
                :locale="CN"
                v-model:bpmn-xml="bpmnXml"
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
          未选中任何流程元素
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue';
import { copyText } from '@/utils/domUtils';
import { CN } from '@/utils';

const cardHeight = ref(152);
// 选中的流程
const bpmnXml = ref<string>('');

// 复制预览
const copyPreview = () => {
  copyText(bpmnXml.value).then(() => {
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
