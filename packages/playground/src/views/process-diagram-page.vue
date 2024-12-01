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
                ref="cnBpmnModelerImperativeRef"
                :height="`calc(100vh - ${cardHeight + 30}px)`"
                :locale="CN"
                v-model:bpmn-xml="bpmnXml"
                v-model:selected-element-ids="selectedElementIds"
                @element-changed="onElementChanged"
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
          <div v-if="showData && selectedElementIds.length > 0">
            <a-card
              v-for="(selectedElementId, index) in selectedElementIds"
              :key="index"
              :style="{ marginBottom: '10px' }"
            >
              <a-form :label-col="{ span: 5 }">
                <a-form-item label="元素类型">
                  {{ getElementPropertValue(selectedElementId, 'type') }}
                </a-form-item>
                <a-form-item label="元素 ID">
                  <a-input
                    :value="getElementPropertValue(selectedElementId, 'id')"
                    @update:value="updateElementProperty(selectedElementId, 'id', $event)"
                  />
                </a-form-item>
                <a-form-item label="元素名称">
                  <a-input
                    :value="getElementPropertValue(selectedElementId, 'name')"
                    @update:value="updateElementProperty(selectedElementId, 'name', $event)"
                  />
                </a-form-item>
              </a-form>
            </a-card>
          </div>
          <div v-else>未选中任何流程元素</div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue';
import { copyText } from '@/utils/domUtils';
import { CN } from '@/utils';
import { ProcessElement, ElementChangeEvent } from '../../../cn-bpmn-modeler/src/cn-bpmn-modeler/types';

const cardHeight = ref(152);
const bpmnXml = ref<string>('');
const selectedElementIds = ref<Array<string>>([]);
const showData = ref(true);

const elementConainer = ref<Record<string, ProcessElement>>({});
const onElementChanged = (elementChangeEvent: ElementChangeEvent) => {
  const newProcessElement: ProcessElement = elementChangeEvent.newProcessElement;
  const newId = newProcessElement.id;
  elementConainer.value[newId] = newProcessElement;
  const oldProcessElement: ProcessElement | undefined = elementChangeEvent.oldProcessElement;
  if (oldProcessElement) {
    const oldId = oldProcessElement.id;
    if (oldId != newId) {
      // ID 发生了改变，需要垃圾回收
      delete elementConainer.value[oldId];
    }
  }
};

const getElementPropertValue = (selectedElementId: string, key: string): string | undefined => {
  const element = elementConainer.value[selectedElementId];
  const elementValue = element ? element[key] : undefined;
  return typeof elementValue === 'string' ? elementValue : undefined;
};
const cnBpmnModelerImperativeRef = ref();
const updateElementProperty = (selectedElementId: string, key: string, value?: string) => {
  if (!cnBpmnModelerImperativeRef.value?.updateElement(selectedElementId, key, value)) {
    /**
     * 如果没有更新成功，则恢复一下原来的值
     * 之所以需要手动恢复，时因为获取 <a-input> 的 :value 的值的方法 getElementPropertValue() 在用户手动输入了新值后不会被触发
     * 因此 <a-input> 会展示错误的没有更新成功的新值
     * 通过 v-if 促使重新渲染计算一下
     */
    showData.value = false;
    nextTick(() => {
      showData.value = true;
    });
  }
};

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
