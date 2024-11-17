<template>
  <div class="bpmn-modeler-wrapper" :style="{ height }">
    <div class="content">
      <!-- 提示 -->
      <div v-show="isShowDragTip" ref="dragFileRef" class="message">
        <div class="note">可拖动 BPMN 文件到这里</div>
      </div>
      <!-- 错误消息 -->
      <div v-show="isShowError" class="message error">
        <div class="note">
          <p>无法显示 BPMN 2.0 图表</p>
          <div class="details">
            <span>问题原因</span>
            <pre>{{ errorMessage }}</pre>
          </div>
        </div>
      </div>
      <div v-show="hasDiagram" :id="canvasId" class="canvas" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, toRefs, PropType } from 'vue';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import { getInitialXml } from '../utils';
import { useImportToModeler } from './import-to-modeler';
import { useInit } from './init';
import { BpmnElement, DIRECT_KEYS, ElementProperties, EmitType, ProcessModelerApi, Root, SPECIAL_KEYS } from '../types';

const emit = defineEmits<EmitType>();

const props = defineProps({
  height: {
    type: [String, Number],
    default: '100%',
  },
  bpmnXml: {
    type: String,
    default: '',
  },
  translator: {
    type: Function as PropType<(english: string, replacements: Record<string, string>) => string>,
    default: () => {
      return () => undefined;
    },
  },
  keyboardBindTo: {
    type: Object,
    default: () => {
      return window;
    },
  },
  options: {
    type: Object as PropType<Record<string, unknown>>,
    default: () => {
      return {};
    },
  },
  additionalModules: {
    type: Array,
    default: () => {
      return [];
    },
  },
  /**
   * 用户任务创建事件监听器表达式，可以直接调用 Spring Bean 方法
   */
  userTaskCreateEventListenerExpression: {
    type: String,
    default: '${userTaskService.onCreate(task)}',
  },
  /**
   * 用户任务完成事件监听器表达式，可以直接调用 Spring Bean 方法
   */
  userTaskCompleteEventListenerExpression: {
    type: String,
    default: '${userTaskService.onComplete(task)}',
  },
});
const {
  translator,
  bpmnXml,
  additionalModules,
  options,
  keyboardBindTo,
  userTaskCreateEventListenerExpression,
  userTaskCompleteEventListenerExpression,
} = toRefs(props);

const canvasId = ref('_canvas_id');

// bpmn.js 实例
const bpmnModeler = ref<typeof BpmnModeler>();
// 根节点
const bpmnRoot = ref<Root>();
// 选中的元素
const selectedElement = ref<BpmnElement>();

// 拖动文件的组件，ref 不能放到组合式函数中，否则无法绑定组件引用
const dragFileRef = ref<HTMLElement>();
// 错误消息
const errorMessage = ref('');
// 是否显示错误信息容器
const isShowError = computed(() => {
  return !!errorMessage.value;
});
// 是否有图表内容
const hasDiagram = computed(() => {
  const bpmnXml_ = bpmnXml.value;
  return !!bpmnXml_ && !!bpmnXml_.trim();
});
// 是否展示拖动提示
const isShowDragTip = computed(() => {
  return !isShowError.value && !hasDiagram.value;
});

/**
 * 将 bpmnXml 更新为 Modeler 的最新值
 * 具体的：从 Modeler 中获取最新的 XML 并弹出
 */
const emitXmlOfModeler = () => {
  bpmnModeler.value
    ?.saveXML({ format: true })
    .then(({ xml }: { xml: string }) => {
      emit('update:bpmn-xml', xml || '');
    })
    .catch((err: unknown) => {
      console.error('保存 XML 时出错：', err);
      emit('update:bpmn-xml', '');
    });
};

// 导入数据到 Modeler
const { updateXmlIfDifferent, importAndEmitIfDifferent, importXMLFile } = useImportToModeler(
  bpmnModeler,
  errorMessage,
  emitXmlOfModeler,
  emit,
);

/**
 * 不设置 immediate，因为那时 bpmnModeler 还没准备好
 * 在 onMounted 中 插入一下初始值
 */
watch(bpmnXml, newValue => {
  updateXmlIfDifferent(newValue);
});

/**
 * 外部更新元素属性，调用 bpmn.js API 时，将待更新的属性数据结构转换为 API 需要的数据结构
 *
 * @param properties 新的属性
 * @param element 待更新的元素
 */
const getPropertiesToUpdate = (
  bpmnModeler_: typeof BpmnModeler,
  properties: ElementProperties,
  element?: { type: string; id: string },
): ElementProperties => {
  const cleanProperties: ElementProperties = {};
  for (const key in properties) {
    if (DIRECT_KEYS.includes(key)) {
      cleanProperties[key] = properties[key] ?? '';
    } else if (!SPECIAL_KEYS.includes(key)) {
      cleanProperties[`flowable:${key}`] = properties[key] ?? undefined;
    }
  }

  const elementType = element?.type;
  if (elementType == 'bpmn:SequenceFlow' && properties?.sourceType == 'bpmn:ExclusiveGateway') {
    // 为互斥网关流程线的 conditionExpression 创建子元素
    cleanProperties.conditionExpression = properties.conditionExpression
      ? bpmnModeler_.create('bpmn:FormalExpression', {
          body: properties.conditionExpression,
        })
      : undefined;
  } else if (elementType == 'bpmn:UserTask') {
    if (!properties.createTaskEvent && !properties.completeTaskEvent) {
      cleanProperties.extensionElements = undefined;
    } else {
      const bpmnFactory = bpmnModeler_.get('bpmnFactory') as {
        create: (type: string, attributes: object) => unknown;
      };
      const values: Array<unknown> = [];
      // 任务创建事件监听器
      if (properties.createTaskEvent) {
        values.push(
          bpmnFactory.create('flowable:TaskListener', {
            event: 'create',
            expression: userTaskCreateEventListenerExpression.value,
          }),
        );
      }
      // 任务完成事件监听器
      if (properties.completeTaskEvent) {
        values.push(
          bpmnFactory.create('flowable:TaskListener', {
            event: 'complete',
            expression: userTaskCompleteEventListenerExpression.value,
          }),
        );
      }
      cleanProperties.extensionElements = bpmnFactory.create('bpmn:ExtensionElements', { values });
    }

    // 多人任务
    const elementId = element?.id;
    if (elementId && properties.multiInstance) {
      // 多实例任务，elementId 用作委托人变量名的命名空间，防止受到其它流程变量的影响
      const elementVariable = 'assignee_' + elementId;
      const assigneesString = properties?.assignee ?? '';
      const loopCharacteristics = bpmnModeler_.create('bpmn:MultiInstanceLoopCharacteristics', {
        isSequential: !!properties.isSequential,
        'flowable:collection': '${' + `flowTaskService.getCollection(execution, '${assigneesString}')}`,
        'flowable:elementVariable': elementVariable,
      });
      if (properties.completionConditionCount) {
        const completionCondition = bpmnModeler_.create('bpmn:Expression');
        completionCondition.body = '${' + `nrOfCompletedInstances >= ${properties.completionConditionCount}}`;
        loopCharacteristics.completionCondition = completionCondition;
      }
      cleanProperties.loopCharacteristics = loopCharacteristics;
      // 从 flowable:collection 表达式中解析多个委托人太复杂了，因此还是将其保存在用户任务的 flowable:assignees 属性中方便回显与取值
      cleanProperties['flowable:assignees'] = assigneesString;
      cleanProperties['flowable:assignee'] = '${' + elementVariable + '}';
    } else {
      cleanProperties.loopCharacteristics = undefined;
      cleanProperties['flowable:assignees'] = undefined;
    }
  }

  return cleanProperties;
};

const updateProperties = (element?: unknown, properties?: ElementProperties) => {
  const bpmnModeler_ = bpmnModeler.value;
  if (!properties || !bpmnModeler_) {
    return;
  }
  const modeling: { updateProperties: (object: unknown, elementProperties: ElementProperties) => void } | undefined =
    bpmnModeler_.get('modeling');
  if (!modeling) {
    return;
  }
  /**
   * element 是 Vue 的 Ref 代理对象，
   * bpmn.js 的 API 中某些操作会更新代理类的只读属性导致报错，
   * 通过 toRaw() 得到原对象
   * element 不存在时，则更新根节点属性
   */
  modeling.updateProperties(toRaw(element ?? bpmnRoot.value), getPropertiesToUpdate(properties, bpmnModeler_));
};

/**
 * 更新选中元素的属性
 *
 * @param properties 元素属性
 */
const updatePropertiesOfSelected = (properties?: ElementProperties) => {
  updateProperties(selectedElement.value, properties);
};

const getProcessModelerApi = (): ProcessModelerApi => {
  return {
    newProcess: () => {
      importAndEmitIfDifferent(getInitialXml());
    },
    updatePropertiesOfSelected,
    updateRootProperty: (key: string, value: string) => {
      const root: { id?: string; type?: string; name?: string } = bpmnRoot.value as {
        id?: string;
        type?: string;
        name?: string;
      };
      updateProperties(undefined, {
        id: root?.id ?? '',
        type: root?.type ?? '',
        name: root?.name ?? '',
        [key]: value,
      });
    },
    undo: () => {
      commandStack.value.undo();
    },
    redo: () => {
      commandStack.value.redo();
    },
    clear: () => {
      bpmnModeler.value?.clear();
    },
    getSVG: (): Promise<string> => {
      return new Promise((resolve, reject) => {
        bpmnModeler.value
          ?.saveSVG()
          .then(({ svg }: { svg: string }) => {
            resolve(svg);
          })
          .catch((err: unknown) => {
            reject(err);
          });
      });
    },
    importXMLFile: (file: File) => {
      importXMLFile(file);
    },
  };
};

useInit(
  emit,
  getProcessModelerApi,
  importXMLFile,
  emitXmlOfModeler,
  updateXmlIfDifferent,
  canvasId,
  keyboardBindTo,
  dragFileRef,
  bpmnXml,
  translator,
  bpmnModeler,
  bpmnRoot,
  selectedElement,
  errorMessage,
  options,
  additionalModules,
);

const commandStack = computed((): { undo: () => void; redo: () => void } => {
  if (!bpmnModeler.value) {
    return { undo: () => {}, redo: () => {} };
  }
  return bpmnModeler.value.get('commandStack');
});
</script>

<style lang="less">
@import 'bpmn-js/dist/assets/bpmn-js.css';
@import 'bpmn-js/dist/assets/diagram-js.css';
@import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
</style>
<style lang="less" scoped>
.bpmn-modeler-wrapper {
  .content,
  .content > div {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  .content {
    > .message {
      text-align: center;
      display: table;
      font-size: 16px;
      color: #111;
      .note {
        vertical-align: middle;
        text-align: center;
        display: table-cell;
      }
    }
    .error {
      .details {
        max-width: 500px;
        font-size: 12px;
        margin: 20px auto;
        text-align: left;
      }
      pre {
        border: solid 1px #ccc;
        background: #eee;
        padding: 10px;
      }
    }
  }
}
</style>
