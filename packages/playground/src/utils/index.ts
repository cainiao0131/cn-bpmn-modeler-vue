interface TreeNode {
  key: string | number;
  children?: Array<TreeNode>;
}

export const traverse = <T extends TreeNode>(
  nodes: Array<T>,
  callback: (item: T, index: number, arr: Array<T>) => void,
) => {
  const length = nodes.length;
  for (let i = 0; i < length; i++) {
    const item: T = nodes[i];
    callback(item, i, nodes);
    if (item.children) {
      traverse(item.children as Array<T>, callback);
    }
  }
};

/**
 * 遍历树，通过 Key 找到对象，找到后执行回调
 * 找不到则抛异常
 *
 * @param nodes 树
 * @param key 要寻找的 Key
 * @param callback 找到节点后执行的回调函数
 * @returns 找到的对象
 */
export const findByKey = <T extends TreeNode>(
  nodes: Array<T>,
  key: string | number,
  callback?: (item: T, index: number, arr: Array<T>) => void,
): T | null => {
  const length = nodes.length;
  for (let i = 0; i < length; i++) {
    const item: T = nodes[i];
    if (item.key === key) {
      callback && callback(item, i, nodes);
      return item;
    }
    if (item.children) {
      const find = findByKey(item.children as Array<T>, key, callback);
      if (find) {
        return find;
      }
    }
  }
  return null;
};

export const deleteByKey = <T extends TreeNode>(nodes: Array<T>, key: string | number): T | null => {
  return findByKey(nodes, key, (_, index: number, arr: Array<T>) => {
    arr.splice(index, 1);
  });
};

export const addNode = <T extends TreeNode>(nodes: Array<T>, node: T, parentKey?: string | number): boolean => {
  if (parentKey) {
    const parentNode: T | null = findByKey(nodes, parentKey);
    if (!parentNode) {
      console.error(`未找到 parentKey：${parentKey}`);
      return false;
    }
    const children: Array<T> | undefined = parentNode.children as Array<T>;
    if (children) {
      children.push(node);
    } else {
      parentNode.children = [node];
    }
  } else {
    nodes.push(node);
  }
  return true;
};

export const guid = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
