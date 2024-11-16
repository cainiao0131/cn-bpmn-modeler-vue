import { defineStore } from 'pinia';
import { DataNode } from 'ant-design-vue/es/tree';
import { traverse } from '@/utils';

export interface ProcessState {
  /**
   * 流程树的节点
   */
  processNodes: Array<DataNode>;
}

export const useProcessStore = defineStore('process-store', {
  state: (): ProcessState => ({
    processNodes: [],
  }),
  getters: {
    processNodeMap(): Record<string, DataNode> {
      const newMap: Record<string, DataNode> = {};
      traverse(this.processNodes, (item: DataNode) => {
        newMap[item.key] = item;
      });
      return newMap;
    },
  },
  actions: {
    setProcessNodes(processNodes: Array<DataNode>) {
      this.processNodes = processNodes;
    },
  },
});
