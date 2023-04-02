import { useProcessStore } from '@/store/process-store';
import { DataNode } from 'ant-design-vue/es/tree';

const initialProcessNodes: Array<DataNode> = [
  {
    title: '财务流程',
    key: '0-0',
    children: [
      {
        title: '财务预算编制管理流程',
        key: '0-0-0',
      },
    ],
  },
  {
    title: '采购流程',
    key: '0-1',
    children: [
      {
        title: '物品采购流程',
        key: '0-1-0',
      },
    ],
  },
  {
    title: 'Java',
    key: '0-2',
    children: [
      {
        title: '方法调用流程',
        key: '0-2-0',
      },
    ],
  },
];

export const initSore = () => {
  useProcessStore().setProcessNodes(initialProcessNodes);
};
