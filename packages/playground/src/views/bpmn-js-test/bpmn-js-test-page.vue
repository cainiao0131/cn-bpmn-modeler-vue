<template>
  <div>
    <a-row :gutter="10" :style="{ height: 'calc(100vh - 120px)' }">
      <a-col :span="processWidth">
        <div :style="{ height: 'calc(100vh - 120px)' }">
          <bpmn-js-component v-model:bpmn-xml="bpmnXml" v-model:selected-element="selectedElement" />
        </div>
      </a-col>
      <a-col :span="24 - processWidth">
        <div :style="{ marginBottom: '10px' }">
          <div v-if="selectedElement">
            <a-form :label-col="{ span: 8 }">
              <a-form-item label="selectedElement ID">
                <a-input v-model:value="selectedElement.id" />
              </a-form-item>
              <a-form-item label="selectedElement Name">
                <a-input v-model:value="selectedElement.name" />
              </a-form-item>
            </a-form>
          </div>
          <p v-else>未选中元素</p>
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<script lang="ts" setup>
import BpmnJsComponent from './bpmn-js-component-by-equal.vue';

const processWidth = ref(14);
const bpmnXml = ref('');
const selectedElement = ref<{ id?: string; name?: string }>();
</script>
