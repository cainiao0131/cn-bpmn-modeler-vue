<template>
  <div>
    <a-row>
      <a-col :span="24" :style="{ marginBottom: '10px' }">
        <a-radio-group v-model:value="currentTest" button-style="solid">
          <a-radio-button value="equalMultiElements">bpmn js component by equal with multi elements</a-radio-button>
          <a-radio-button value="equal">bpmn js component by equal</a-radio-button>
          <a-radio-button value="flag">bpmn js component by flag</a-radio-button>
        </a-radio-group>
      </a-col>
    </a-row>
    <a-row :gutter="10" :style="{ height: 'calc(100vh - 120px)' }">
      <a-col :span="processWidth">
        <a-card>
          <div v-if="currentTest == 'equalMultiElements'" :style="{ height: 'calc(100vh - 185px)' }">
            <bpmn-js-component-by-equal-multi-elements
              v-model:bpmn-xml="bpmnXmlEqualMultiElements"
              v-model:selected-elements="selectedElementEqualMultiElements"
            />
          </div>
          <div v-else-if="currentTest == 'equal'" :style="{ height: 'calc(100vh - 185px)' }">
            <bpmn-js-component-by-equal
              v-model:bpmn-xml="bpmnXmlEqual"
              v-model:selected-element="selectedElementEqual"
            />
          </div>
          <div v-else-if="currentTest == 'flag'" :style="{ height: 'calc(100vh - 185px)' }">
            <bpmn-js-component-by-flag v-model:bpmn-xml="bpmnXmlFlag" v-model:selected-element="selectedElementFlag" />
          </div>
        </a-card>
      </a-col>
      <a-col :span="24 - processWidth">
        <a-card :title="currentTest" :body-style="{ height: 'calc(100vh - 191px)', overflow: 'auto' }">
          <div v-if="currentTest == 'equalMultiElements'">
            <template v-if="selectedElementEqualMultiElements.length > 0">
              <a-card
                v-for="(selectedElementEqualMultiElement, index) in selectedElementEqualMultiElements"
                :key="index"
                :style="{ marginBottom: '10px' }"
              >
                <a-form :label-col="{ span: 8 }">
                  <a-form-item label="element ID">
                    <a-input v-model:value="selectedElementEqualMultiElement.id" />
                  </a-form-item>
                  <a-form-item label="element name">
                    <a-input v-model:value="selectedElementEqualMultiElement.name" />
                  </a-form-item>
                </a-form>
              </a-card>
            </template>
            <p v-else>未选中元素</p>
          </div>
          <div v-else-if="currentTest == 'equal'">
            <a-form v-if="selectedElementEqual" :label-col="{ span: 8 }">
              <a-form-item label="element ID">
                <a-input v-model:value="selectedElementEqual.id" />
              </a-form-item>
              <a-form-item label="element name">
                <a-input v-model:value="selectedElementEqual.name" />
              </a-form-item>
            </a-form>
            <p v-else>未选中元素</p>
          </div>
          <div v-else-if="currentTest == 'flag'">
            <a-form v-if="selectedElementFlag" :label-col="{ span: 8 }">
              <a-form-item label="element ID">
                <a-input v-model:value="selectedElementFlag.id" />
              </a-form-item>
              <a-form-item label="element name">
                <a-input v-model:value="selectedElementFlag.name" />
              </a-form-item>
            </a-form>
            <p v-else>未选中元素</p>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script lang="ts" setup>
import BpmnJsComponentByEqualMultiElements from './bpmn-js-component-by-equal-multi-elements.vue';
import BpmnJsComponentByEqual from './bpmn-js-component-by-equal.vue';
import BpmnJsComponentByFlag from './bpmn-js-component-by-flag.vue';
import { ProcessElement } from '../../../../cn-bpmn-modeler/src/cn-bpmn-modeler/types';

const currentTest = ref('equalMultiElements');
const processWidth = ref(14);

const bpmnXmlEqualMultiElements = ref('');
const selectedElementEqualMultiElements = ref<Array<ProcessElement>>([]);

const bpmnXmlEqual = ref('');
const selectedElementEqual = ref<ProcessElement>();

const bpmnXmlFlag = ref('');
const selectedElementFlag = ref<ProcessElement>();
</script>
