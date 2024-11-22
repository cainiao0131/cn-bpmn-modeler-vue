<template>
  <div>
    <div :style="{ marginBottom: '10px' }">test</div>
    <div :style="{ height: 'calc(100vh - 120px)' }">
      <bpmn-js-component v-model:bpmn-xml="bpmnXml" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import BpmnJsComponent from './bpmn-js-component.vue';

const bpmnXml = ref('');
</script>
