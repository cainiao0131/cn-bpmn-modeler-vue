<template>
  <div class="process-diagram-page-wrapper">
    <a-row type="flex" class="process-diagram-page-row" :gutter="10">
      <a-col flex="20rem">
        <a-card title="流程" class="list-card">
          <template #extra>
            <a-button type="link" @click="addProcess">添加</a-button>
          </template>
          <directory-list
            ref="directoryListRef"
            v-model:selected-keys="selectedKeys"
            :tree-data="processStore.processNodes"
            @updata:tree-data="onUpdateTreeData"
            @insert-item="addProcess"
          />
        </a-card>
      </a-col>
      <a-col flex="auto">
        <a-card
          :title="diagramTitle"
          class="diagram-card"
          :head-style="{ minHeight: 'unset' }"
          :body-style="{ height: '100%' }"
        >
          <template #extra>
            <a-button v-show="!isEdit" type="link" @click="onEditClick">编辑</a-button>
            <a-button v-show="isEdit" type="primary" @click="onSaveClick">保存</a-button>
          </template>
          <process-editor v-show="!!selectedProcess" :bpmn-xml="selectedBpmnXml" @update:bpmn-xml="onUpdateBpmnXml" />
        </a-card>
      </a-col>
      <!-- 添加流程弹框 -->
      <a-modal
        v-model:visible="addProcessVisible"
        title="添加流程"
        cancel-text="取消"
        ok-text="确定"
        @ok="onAddProcessOk"
      >
        <a-form ref="addProcessFormRef" :model="addProcessFormState">
          <a-form-item
            label="流程名称"
            name="processName"
            :rules="[{ required: true, message: '请输入流程名称！', trigger: 'change' }]"
          >
            <a-input v-model:value="addProcessFormState.processName" placeholder="请输入流程名称" />
          </a-form-item>
        </a-form>
      </a-modal>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import DirectoryList from '@/components/directory-list/directory-list.vue';
import { useProcessStore } from '@/store/process-store';
import { guid } from '@/utils';
import { Form } from 'ant-design-vue/es';
import { DataNode } from 'ant-design-vue/es/tree';
import ProcessEditor from '@/components/process-editor.vue';
import { addNode } from '@/utils';

const processStore = useProcessStore();

const onUpdateTreeData = (nodes: Array<DataNode>) => {
  processStore.setProcessNodes(nodes);
};

// 选中的流程
const selectedProcess = computed<DataNode | null>(() => {
  const selectedKey = selectedKeys.value.length > 0 ? selectedKeys.value[0] : '';
  if (!selectedKey) {
    return null;
  }
  return processStore.processNodeMap[selectedKey];
});
// 选中流程对应的 XML
const selectedBpmnXml = computed<string>(() => {
  const newSelectedProcess = selectedProcess.value;
  if (!newSelectedProcess) {
    return '';
  }
  return newSelectedProcess.bpmnXml || '';
});
const selectedKeys = ref<Array<string>>([]);

const onUpdateBpmnXml = (xml: string) => {
  const newSelectedProcess = selectedProcess.value;
  if (!newSelectedProcess) {
    return;
  }
  newSelectedProcess.bpmnXml = xml;
};

const isEdit = ref(false);
const diagramTitle = computed(() => {
  if (!selectedProcess.value) {
    return '请选择流程';
  }
  const selectedProcessName = selectedProcess.value.title;
  return isEdit.value ? `编辑：${selectedProcessName}` : selectedProcessName;
});

const directoryListRef = ref<typeof DirectoryList>();

const addProcessVisible = ref(false);
const addProcessFormRef = ref<typeof Form>();
const addProcessFormState = ref<{ processName?: string }>({});
const parentNode = ref<DataNode>();
const addProcess = (parent?: DataNode) => {
  parentNode.value = parent;
  addProcessFormState.value = {};
  addProcessVisible.value = true;
};
const onAddProcessOk = () => {
  if (addProcessFormRef.value) {
    addProcessFormRef.value.validateFields().then(() => {
      addProcessVisible.value = false;
      const nodes = [...processStore.processNodes];
      addNode(
        nodes,
        {
          key: guid(),
          title: addProcessFormState.value.processName,
        },
        parentNode.value ? parentNode.value.key : undefined,
      );
      processStore.setProcessNodes(nodes);
    });
  }
};

const onEditClick = () => {
  isEdit.value = true;
};
const onSaveClick = () => {
  isEdit.value = false;
};
</script>

<style lang="less" scoped>
.process-diagram-page-wrapper {
  height: 100%;
  .process-diagram-page-row {
    height: 100%;
    .list-card {
      height: 100%;
    }
    .diagram-card {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
  }
}
</style>
