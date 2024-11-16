<template>
  <div class="file-directory-wrapper">
    <a-tree
      :selected-keys="selectedKeys"
      :tree-data="treeData"
      draggable
      block-node
      default-expand-all
      @update:selected-keys="onUpdateDelectedKeys"
      @drop="onDrop"
    >
      <template #title="nodeTitleParam">
        <a-dropdown :trigger="['contextmenu']" style="width: 100%">
          <div style="width: 100%">{{ nodeTitleParam.title }}</div>
          <template #overlay>
            <a-menu @click="onContextMenuClick(nodeTitleParam, $event)">
              <a-menu-item key="add">添加</a-menu-item>
              <a-menu-item key="delete">删除</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </template>
    </a-tree>
  </div>
</template>

<script setup lang="ts">
import { AntTreeNodeDropEvent, DataNode } from 'ant-design-vue/es/tree';
import { findByKey, deleteByKey } from '@/utils';
import { Modal, ModalFuncProps } from 'ant-design-vue/es';
import { Key } from 'ant-design-vue/es/vc-tree/interface';

const emit = defineEmits<{
  (eventName: 'update:tree-data', message: Array<DataNode>): void;
  (eventName: 'update:selected-keys', message: Array<string>): void;
  (eventName: 'insert-item', message: DataNode): void;
}>();

const props = defineProps({
  treeData: {
    type: Array as PropType<Array<DataNode>>,
    required: true,
  },
  selectedKeys: {
    type: Array as PropType<Array<string>>,
    default: () => {
      return [];
    },
  },
});
const { treeData } = toRefs(props);

const onDrop = (info: AntTreeNodeDropEvent) => {
  const dropKey = info.node.key;
  const dragKey = info.dragNode.key;
  const pos = info.node.pos || '';
  const dropPos = pos.split('-');
  const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);
  const data = [...treeData.value];
  // 找到拖动对象并删除
  const dragObj: DataNode | null = deleteByKey(data, dragKey);
  if (!dragObj) {
    throw new Error(`未找到${dragKey}`);
  }
  if (!info.dropToGap) {
    // Drop on the content
    findByKey(data, dropKey, (item: DataNode) => {
      item.children = item.children || [];
      // 插入位置，添加到头部
      item.children.unshift(dragObj);
    });
  } else if (
    (info.node.children || []).length > 0 && // 有子节点
    info.node.expanded && // 展开的
    dropPosition === 1 // On the bottom gap
  ) {
    findByKey(data, dropKey, (item: DataNode) => {
      item.children = item.children || [];
      // 插入位置，添加到头部，可以是随意位置
      item.children.unshift(dragObj);
    });
  } else {
    let ar: Array<DataNode> = [];
    let i = 0;
    findByKey(data, dropKey, (_item: DataNode, index: number, arr: Array<DataNode>) => {
      ar = arr;
      i = index;
    });
    if (dropPosition === -1) {
      ar.splice(i, 0, dragObj);
    } else {
      ar.splice(i + 1, 0, dragObj);
    }
  }
  emit('update:tree-data', data);
};

const onUpdateDelectedKeys = (keys: Array<Key>) => {
  emit('update:selected-keys', keys as Array<string>);
};

const onContextMenuClick = (nodeInfo: DataNode, { key }: { key: string }) => {
  if (key == 'delete') {
    const option: ModalFuncProps = {
      title: `确定删除【${nodeInfo.title}】？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        const nodes = [...treeData.value];
        deleteByKey(nodes, nodeInfo.key);
        emit('update:tree-data', nodes);
      },
    };
    if (nodeInfo.children && nodeInfo.children.length > 0) {
      option.content = `【${nodeInfo.title}】下存在子项，确定删除当前项及所有子项？`;
    }
    Modal.confirm(option);
  } else if (key == 'add') {
    emit('insert-item', nodeInfo);
  }
};
</script>
