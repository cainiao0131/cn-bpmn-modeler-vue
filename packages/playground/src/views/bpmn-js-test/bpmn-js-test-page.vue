<template>
  <div>
    <a-row>
      <a-col :span="24" :style="{ marginBottom: '10px' }">
        <a-radio-group v-model:value="currentTest" button-style="solid">
          <a-radio-button value="equal">bpmn js component by equal</a-radio-button>
          <a-radio-button value="flag">bpmn js component by flag</a-radio-button>
        </a-radio-group>
      </a-col>
    </a-row>
    <a-row :gutter="10" :style="{ height: 'calc(100vh - 120px)' }">
      <a-col :span="processWidth">
        <a-card>
          <div v-if="currentTest == 'flag'" :style="{ height: 'calc(100vh - 185px)' }">
            <bpmn-js-component-by-flag v-model:bpmn-xml="bpmnXmlFlag" v-model:selected-element="selectedElementFlag" />
          </div>
          <div v-else :style="{ height: 'calc(100vh - 185px)' }">
            <bpmn-js-component-by-equal
              v-model:bpmn-xml="bpmnXmlEqual"
              v-model:selected-element="selectedElementEqual"
            />
          </div>
        </a-card>
      </a-col>
      <a-col :span="24 - processWidth">
        <a-card :title="currentTest" :body-style="{ height: 'calc(100vh - 191px)' }">
          <div v-if="currentTest == 'flag' && selectedElementFlag">
            <a-form :label-col="{ span: 8 }">
              <a-form-item label="selectedElementFlag ID">
                <a-input v-model:value="selectedElementFlag.id" />
              </a-form-item>
              <a-form-item label="selectedElementFlag Name">
                <a-input v-model:value="selectedElementFlag.name" />
              </a-form-item>
            </a-form>
          </div>
          <div v-if="currentTest == 'equal' && selectedElementEqual">
            <a-form :label-col="{ span: 8 }">
              <a-form-item label="selectedElementEqual ID">
                <a-input v-model:value="selectedElementEqual.id" />
              </a-form-item>
              <a-form-item label="selectedElementEqual Name">
                <a-input v-model:value="selectedElementEqual.name" />
              </a-form-item>
            </a-form>
          </div>
          <p v-else>未选中元素</p>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script lang="ts" setup>
import BpmnJsComponentByEqual from './bpmn-js-component-by-equal.vue';
import BpmnJsComponentByFlag from './bpmn-js-component-by-flag.vue';

const currentTest = ref('equal');
const processWidth = ref(14);

const bpmnXmlFlag = ref('');
const selectedElementFlag = ref<{ id?: string; name?: string }>();

const bpmnXmlEqual = ref('');
const selectedElementEqual = ref<{ id?: string; name?: string }>();
</script>
