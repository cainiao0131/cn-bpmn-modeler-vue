<template>
  <div class="process-diagram-page-wrapper">
    <a-row type="flex" class="process-diagram-page-row" :gutter="10">
      <a-col flex="20rem">
        <a-card
          title="流程"
          class="list-card"
          :body-style="{ height: `calc(100vh - ${cardHeight}px)`, overflow: 'auto' }"
        >
          <template #extra>
            <a-button type="link" @click="addProcess()">添加</a-button>
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
          :body-style="{ height: `calc(100vh - ${cardHeight}px)`, overflow: 'auto', paddingBottom: 0 }"
        >
          <template #extra>
            <a-row :gutter="10">
              <a-col>
                <a-button size="small" @click="previewDiagram">预览</a-button>
              </a-col>
              <a-col>
                <a-button v-show="!isEdit" size="small" type="link" @click="onEditClick">编辑</a-button>
                <a-button v-show="isEdit" size="small" type="primary" @click="onSaveClick">保存</a-button>
              </a-col>
            </a-row>
          </template>
          <a-row type="flex">
            <a-col flex="auto">
              <cn-bpmn-modeler
                v-if="selectedProcess"
                :height="`calc(100vh - ${cardHeight + 30}px)`"
                v-model:bpmn-xml="selectedProcess.bpmnXml"
                v-model:selected-ids="selectedIds"
              />
            </a-col>
          </a-row>
        </a-card>
      </a-col>
      <!-- 添加流程弹框 -->
      <a-modal v-model:open="addProcessVisible" title="添加流程" cancel-text="取消" ok-text="确定" @ok="onAddProcessOk">
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
    <!-- 预览 -->
    <a-drawer v-model:open="previewVisible" width="70%" title="预览" placement="left" :closable="false">
      <template #extra>
        <a-button type="primary" @click="copyPreview">复制</a-button>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import DirectoryList from '@/components/directory-list/directory-list.vue';
import { useProcessStore } from '@/store/process-store';
import { guid } from '@/utils';
import { Form } from 'ant-design-vue/es';
import { DataNode } from 'ant-design-vue/es/tree';
import { addNode } from '@/utils';
import { message } from 'ant-design-vue';
import { copyText } from '@/utils/domUtils';

const processStore = useProcessStore();

const cardHeight = ref(152);
const selectedIds = ref<Array<string>>([]);

const onUpdateTreeData = (nodes: Array<DataNode>) => {
  processStore.setProcessNodes(nodes);
};

// 预览图表
const previewVisible = ref(false);
const previewDiagram = () => {
  previewVisible.value = true;
};
// 复制预览
const copyPreview = () => {
  copyText(selectedProcess.value?.bpmnXml ?? '').then(() => {
    message.success('已复制到剪切板');
  });
};

// 选中的流程
const selectedProcess = computed<DataNode | null>(() => {
  const selectedKey = selectedKeys.value.length > 0 ? selectedKeys.value[0] : '';
  if (!selectedKey) {
    return null;
  }
  return processStore.processNodeMap[selectedKey];
});

const selectedKeys = ref<Array<string>>([]);

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
    .diagram-card {
      display: flex;
      flex-direction: column;
    }
  }
}
</style>
