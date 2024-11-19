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

export const CN: Record<string, string> = {
  'Activate create/remove space tool': '启动：创建/删除空间工具',
  'Activate global connect tool': '启动：全局连接工具',
  'Activate hand tool': '启动：手动工具',
  'Activate lasso tool': '启动：Lasso 工具',
  'Ad-hoc': 'Ad-hoc 子流程',
  'Add text annotation': '添加文本注释',
  'Add Lane above': '添加到通道之上',
  'Add Lane below': '添加到通道之下',
  'Append compensation activity': '追加：补偿活动',
  'Append task': '追加：任务',
  'Append intermediate/boundary event': '追加：中间/边界事件',
  'Append end event': '追加：结束事件',
  'Append gateway': '追加：网关',
  'Append {type}': '追加：{type}',
  'Business rule task': '规则任务',
  'Call activity': '调用外部流程',
  'Cancel Boundary Event': '取消边界事件',
  'Cancel End Event': '结束取消事件',
  'Change element': '更改元素',
  'Change type': '更改类型',
  'Collapsed Pool': '折叠池',
  'Compensation Boundary Event': '补偿边界事件',
  'Compensation end event': '结束补偿事件',
  'Compensation intermediate throw event': '中间补偿抛出事件',
  'Compensation Start Event': '补偿启动事件',
  'Complex gateway': '复杂网关',
  'Conditional Boundary Event (non-interrupting)': '条件边界事件 (非中断)',
  'Conditional Boundary Event': '条件边界事件',
  'Conditional intermediate catch event': '中间条件捕获事件',
  'Conditional Start Event (non-interrupting)': '条件启动事件 (非中断)',
  'Conditional start event': '条件启动事件',
  'Connect to other element': '连接到其它元素',
  'Connect using association': '文本关联',
  'Connect using DataInputAssociation': '数据关联',
  'Connect using Sequence/MessageFlow or Association': '消息关联',
  'Create IntermediateThrowEvent/BoundaryEvent': '创建：中间抛出事件/边界事件',
  'Create pool/participant': '创建：池/参与者',
  'Create expanded sub-process': '创建：可折叠子流程',
  'Create group': '创建：组',
  'Create data store reference': '创建：数据存储引用',
  'Create data object reference': '创建：数据对象引用',
  'Create gateway': '创建：网关',
  'Create end event': '创建：结束事件',
  'Create start event': '创建：启动事件',
  'Create intermediate/boundary event': '创建：中间/边界事件',
  'Create task': '创建：任务',
  'Create {type}': '创建：{type}',
  Delete: '删除',
  'Divide into three Lanes': '分成三条通道',
  'Divide into two Lanes': '分成两条通道',
  'End event': '结束事件',
  'Error Boundary Event': '错误边界事件',
  'Error end event': '结束错误事件',
  'Error Start Event': '错误启动事件',
  'Escalation Boundary Event (non-interrupting)': '升级边界事件 (非中断)',
  'Escalation Boundary Event': '升级边界事件',
  'Escalation end event': '结束升级事件',
  'Escalation intermediate throw event': '中间升级抛出事件',
  'Escalation Start Event (non-interrupting)': '升级启动事件 (非中断)',
  'Escalation Start Event': '升级启动事件',
  'Create element': 'Create element',
  Gateways: 'Gateways',
  'Event Sub Process': '事件子流程',
  'Event-based gateway': '事件网关',
  'Exclusive gateway': '互斥网关',
  'Expanded Pool': '展开池',
  'Inclusive gateway': '包容网关',
  'Intermediate throw event': '中间抛出事件',
  'Link intermediate catch event': '中间链接捕获事件',
  'Link intermediate throw event': '中间链接抛出事件',
  Events: 'Events',
  Loop: '循环',
  'Manual task': '手动任务',
  'Message Boundary Event (non-interrupting)': '消息边界事件 (非中断)',
  'Message Boundary Event': '消息边界事件',
  'Message end event': '结束消息事件',
  'Message intermediate catch event': '中间消息捕获事件',
  'Message intermediate throw event': '中间消息抛出事件',
  'Message Start Event (non-interrupting)': '消息启动事件 (非中断)',
  'Message start event': '消息启动事件',
  'Parallel gateway': '并行网关',
  'Parallel multi-instance': '并行多实例',
  'Receive task': '接受任务',
  Remove: '移除',
  'Script task': '脚本任务',
  'Send task': '发送任务',
  'Sequential multi-instance': '串行多实例',
  'Service task': '服务任务',
  'Signal Boundary Event (non-interrupting)': '信号边界事件 (非中断)',
  'Signal Boundary Event': '信号边界事件',
  'Signal end event': '结束信号事件',
  'Signal intermediate catch event': '中间信号捕获事件',
  'Signal intermediate throw event': '中间信号抛出事件',
  'Signal Start Event (non-interrupting)': '信号启动事件 (非中断)',
  'Signal start event': '信号启动事件',
  'Boundary Event': 'Boundary Event',
  'Start event': '开始事件',
  'Sub Processes': 'Sub Processes',
  'Sub-process (collapsed)': '折叠的子流程',
  'Sub-process (expanded)': '展开的子流程',
  'Sub Process': '子流程',
  Tasks: 'Tasks',
  Task: '任务',
  'Terminate end event': '终止边界事件',
  'Timer Boundary Event (non-interrupting)': '定时边界事件 (非中断)',
  'Timer Boundary Event': '定时边界事件',
  'Timer intermediate catch event': '中间定时捕获事件',
  'Timer Start Event (non-interrupting)': '定时启动事件 (非中断)',
  'Timer start event': '定时启动事件',
  Transaction: '事务',
  'User task': '用户任务',
  Data: 'Data',
  'Data Store Reference': 'Data Store Reference',
  'Data Object Reference': 'Data Object Reference',
  Participants: 'Participants',
  'Empty Pool': 'Empty Pool',
  label: '标签',
  'Default Value': '默认值',
  'Default flow': '默认流',
  'Conditional Flow': '条件流',
  'Participant Multiplicity': '参与者多样性',
  Collection: '集合',
  'Append element': 'Append element',
  'already rendered {element}': '{element} 已呈现',
  'diagram not part of bpmn:Definitions': '图表不是 bpmn:Definitions 的一部分',
  'element required': '需要元素',
  'element {element} referenced by {referenced}#{property} not yet drawn':
    '元素 {element} 的引用 {referenced}#{property} 尚未绘制',
  'failed to import {element}': '{element} 导入失败',
  'flow elements must be children of pools/participants': '元素必须是池/参与者的子级',
  'more than {count} child lanes': '超过 {count} 条通道',
  'no diagram to display': '没有要显示的图表',
  'no parent for {element} in {parent}': '在 {element} 中没有父元素 {parent}',
  'no process or collaboration to display': '没有可显示的流程或协作',
  'no shape type specified': '未指定形状类型',
  'out of bounds release': '越界释放',
  TextAnnotation: '文本注释',
  'bpmn:Process': '流程',
  'bpmn:StartEvent': '开始事件',
  'bpmn:IntermediateThrowEvent': '中间事件',
  'bpmn:BoundaryEvent': 'Boundary Event',
  'bpmn:Task': '任务',
  'bpmn:SendTask': '发送任务',
  'bpmn:ReceiveTask': '接收任务',
  'bpmn:UserTask': '用户任务',
  'bpmn:ManualTask': '手工任务',
  'bpmn:BusinessRuleTask': '业务规则任务',
  'bpmn:ServiceTask': '服务任务',
  'bpmn:ScriptTask': '脚本任务',
  'bpmn:EndEvent': '结束事件',
  'bpmn:SequenceFlow': '流程线',
  'bpmn:ExclusiveGateway': '互斥网关',
  'bpmn:ParallelGateway': '并行网关',
  'bpmn:InclusiveGateway': '相容网关',
  'bpmn:ComplexGateway': '复杂网关',
  'bpmn:EventBasedGateway': '事件网关',
  'bpmn:CallActivity': '调用外部流程',
  'bpmn:DataStoreReference': 'Data Store Reference',
  'bpmn:DataObjectReference': 'Data Object Reference',
  'bpmn:EmptyPool': 'Empty Pool',
  'bpmn:Participant': '参与者',
  'bpmn:Collaboration': '流程',
  'bpmn:Association': '协助线',
  'bpmn:TextAnnotation': '文本注释',
  'bpmn:Group': 'Group',
  'bpmn:SubProcess': '子流程',
  'bpmn:Transaction': '事务',
};
