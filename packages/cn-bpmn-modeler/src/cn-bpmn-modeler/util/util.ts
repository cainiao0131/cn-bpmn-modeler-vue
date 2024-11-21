import { ElementProperties, NAMESPACE } from '../types';

export const guid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const isElementPropertiesEqual = (
  elementProperties1: ElementProperties,
  elementProperties2: ElementProperties,
): boolean => {
  const keys1 = Object.keys(elementProperties1);
  const keys2 = Object.keys(elementProperties2);
  if (keys1.length !== keys2.length) {
    return false;
  }
  for (const key of keys1) {
    if (elementProperties1[key] != elementProperties2[key]) {
      return false;
    }
  }
  return true;
};
export const isElementContainerEqual = (
  record1?: Record<string, ElementProperties>,
  record2?: Record<string, ElementProperties>,
): boolean => {
  if (!record1 || !record2) {
    return !record1 && !record2;
  }
  const keys1 = Object.keys(record1);
  const keys2 = Object.keys(record2);
  if (keys1.length !== keys2.length) {
    return false;
  }
  for (const key of keys1) {
    if (!isElementPropertiesEqual(record1[key], record2[key])) {
      return false;
    }
  }
  return true;
};

// 防抖
export const debounce = (fn: (param1?: unknown, param2?: unknown) => void, timeout: number) => {
  let timer: NodeJS.Timeout;
  return (param1: unknown, param2: unknown) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn(param1, param2);
    }, timeout);
  };
};

export const getInitialXml = (): string => {
  return '<?xml version="1.0" encoding="UTF-8"?>\
<bpmn2:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd" id="sample-diagram" targetNamespace="http://bpmn.io/schema/bpmn">\
<bpmn2:process id="Process_1" isExecutable="false">\
<bpmn2:startEvent id="StartEvent_1"/>\
</bpmn2:process>\
<bpmndi:BPMNDiagram id="BPMNDiagram_1">\
<bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">\
<bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">\
<dc:Bounds height="36.0" width="36.0" x="412.0" y="240.0"/>\
</bpmndi:BPMNShape>\
</bpmndi:BPMNPlane>\
</bpmndi:BPMNDiagram>\
</bpmn2:definitions>';
};

export const toArray = (val?: string) => {
  if (!val) {
    return undefined;
  }
  let str;
  if (typeof val == 'string') {
    if (val.includes(',')) {
      str = val.split(',');
    } else {
      str = [val];
    }
  } else {
    str = val;
  }
  return str;
};

export const toStringArray = (val?: unknown) => {
  if (!val) {
    return undefined;
  }
  let str: string[] | undefined;
  if (typeof val == 'string') {
    str = val.split(',');
  } else {
    str = val as string[];
  }
  return str;
};

export const getAttribute = (key: string, attrs_?: Record<string, string>) => {
  return attrs_ ? attrs_[`${NAMESPACE}${key}`] : undefined;
};
