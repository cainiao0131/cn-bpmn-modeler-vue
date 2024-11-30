import BpmnModeler from 'bpmn-js/lib/Modeler';

export const DIRECT_KEYS = ['name', 'id', 'text'];
export const SPECIAL_KEYS = [
  'conditionExpression',
  'multiInstance',
  'isSequential',
  'createTaskEvent',
  'completeTaskEvent',
];
export const ARRAY_KEYS = ['candidateUsers', 'candidateGroups'];
export const NAMESPACE = 'flowable:';

export type ElementChangeEvent = {
  newProcessElement: ProcessElement;
  oldProcessElement?: ProcessElement;
};

export type EmitType = {
  (eventName: 'update:bpmn-xml', message: string): void;
  (eventName: 'root-added', root: ProcessElement): void;
  (eventName: 'element-changed', elementChangeEvent: ElementChangeEvent): void;
  (eventName: 'update:selected-element-ids', selectedElementIds: Array<string>): void;
  (eventName: 'modeler-ready', message: typeof BpmnModeler): void;
};

export type InternalEvent = {
  type?: string;
  trigger?: string;
  element?: ProcessElement;
  gfx?: unknown;
  originalEvent?: unknown;
  newSelection: Array<unknown>;
  oldSelection: Array<unknown>;
};

export type ProcessElement = {
  /**
   * id 作为元素的 Entity ID，在一个流程定义范围内不可重复，不可缺失
   */
  id: string;
  type?: string;
  children?: Array<ProcessElement>;
  name?: string;
  assignee?: string; // 用户任务的委托人
  formKey?: string;
  parameter?: string;
  text?: string;
  service?: string;
  sourceType?: string;
  conditionExpression?: string;
  multiInstance?: boolean;
  isSequential?: boolean;
  completionConditionCount?: number;
  createTaskEvent?: boolean;
  completeTaskEvent?: boolean;
  [key: string]: unknown | undefined;
};

export type FlowableType = {
  'flowable:formKey'?: string;
  'flowable:async'?: string;
  'flowable:userType'?: string;
  'flowable:assignee'?: string;
  'flowable:candidateUsers'?: string;
  'flowable:candidateGroups'?: string;
  'flowable:priority'?: string;
  'flowable:dueDate'?: string;
  'flowable:parameterDes'?: string;
  'flowable:loopChara'?: string;
  'flowable:cyclicCard'?: string;
  'flowable:collection'?: string;
  'flowable:elementVariable'?: string;
  'flowable:completionCondition'?: string;
  'flowable:asyncType'?: Array<string>;
  'flowable:retryPeriod'?: string;
  'flowable:executionListener'?: object;
  'flowable:taskListener'?: object;
  'flowable:class'?: string;
  'flowable:delegateExpression'?: string;
  'flowable:expression'?: string;
  'flowable:conditionalFormat'?: string;
  'flowable:conditionExpression'?: string;
  'flowable:scriptType'?: string;
  'flowable:script'?: string;
  'flowable:resource'?: string;
};
/**
 * 流程表单的值类型
 */
export type FormValueType = string | number | boolean | Array<unknown> | symbol | object | undefined;
export type BpmnBusiness = {
  id: string;
  loopCharacteristics?: { assignees?: string; isSequential?: boolean };
  name?: string;
  formKey?: string[];
  async?: string;
  userType?: string;
  assignee?: string;
  candidateUsers?: string;
  candidateGroups?: string;
  priority?: string;
  dueDate?: string;
  parameterDes?: string;
  loopChara?: string;
  cyclicCard?: string;
  collection?: string;
  elementVariable?: string;
  completionCondition?: string;
  asyncType?: string;
  retryPeriod?: string;
  executionListener?: object;
  taskListener?: object;
  class?: string;
  delegateExpression?: string;
  expression?: string;
  conditionalFormat?: string;
  scriptType?: string;
  script?: string;
  resource?: string;
  $attrs?: FlowableType;
  sourceRef?: { $type: string };
  conditionExpression?: { body?: FormValueType };
  extensionElements?: { values?: Array<{ event?: string }> };
};
export type BpmnElement = { type: string; businessObject?: BpmnBusiness };

export type ProcessModelerApi = {
  /**
   * 新建流程，导入一个只有开始节点的流程，会覆盖已有数据
   */
  newProcess: () => void;
  /**
   * 将文件转换为 XML 字符串后导入 Modeler
   */
  importXMLFile: (file: File) => void;
  /**
   * 更新根元素属性
   */
  updateRootProperty: (key: string, value: string) => void;
  /**
   * 后退
   */
  undo: () => void;
  /**
   * 前进
   */
  redo: () => void;
  /**
   * 清空
   */
  clear: () => void;
  /**
   * 获取 SVG 图片
   */
  getSVG: () => Promise<string>;
};
