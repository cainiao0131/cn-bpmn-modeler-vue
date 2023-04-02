export type Root = {
  id: string;
  type: string;
  children: Array<unknown>;
};

export type InternalEvent = {
  type?: string;
  trigger?: string;
  element?: Root;
  gfx?: unknown;
  originalEvent?: unknown;
  newSelection: Array<unknown>;
  oldSelection: Array<unknown>;
};

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
   * 更新元素属性
   */
  updateProperties: (element: unknown, properties: Record<string, string | Array<unknown> | null>) => void;
  /**
   * 后退
   */
  undo: () => void;
  /**
   * 前进
   */
  redo: () => void;
  /**
   * 获取 SVG 图片
   */
  getSVG: () => Promise<string>;
};
