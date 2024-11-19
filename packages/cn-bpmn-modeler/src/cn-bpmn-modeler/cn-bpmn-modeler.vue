<template>
  <div ref="bpmnModelerContainer" class="bpmn-modeler-wrapper" :style="{ height }">
    <div ref="container" class="content">
      <!-- 提示 -->
      <div v-show="!bpmnXml && !errorMessage" ref="dragFileRef" class="message intro">
        <div class="note">可拖动 BPMN 文件到这里</div>
      </div>
      <!-- 错误消息 -->
      <div v-show="!!errorMessage" class="message error">
        <div class="note">
          <p>无法显示 BPMN 2.0 图表</p>
          <div class="details">
            <span>问题原因</span>
            <pre>{{ errorMessage }}</pre>
          </div>
        </div>
      </div>
      <div v-show="!!bpmnXml" :id="canvasId" class="canvas" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import BpmnModeler from 'bpmn-js/lib/Modeler';
import { Moddle, SaveXMLResult } from 'bpmn-js/lib/BaseViewer';
import { getInitialXml } from './util/util';
import { DIRECT_KEYS, ElementProperties, EmitType, NAMESPACE } from './types';
import { useInit } from './init';
import { useUpdateXmlOfModeler } from './update-xml-of-modeler';

const emit = defineEmits<EmitType>();

const props = defineProps({
  selectedIds: {
    type: Array as PropType<Array<string>>,
    default: () => [],
  },
  elementContainer: {
    type: Object as PropType<Record<string, ElementProperties>>,
    default: () => {
      return {};
    },
  },
  height: {
    type: [String, Number],
    default: '100%',
  },
  bpmnXml: {
    type: String,
    default: '',
  },
  locale: {
    type: Object as PropType<Record<string, string>>,
    default: () => {
      return undefined;
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
  processId: {
    type: String,
    default: '',
  },
  processName: {
    type: String,
    default: '',
  },
});
const {
  bpmnXml,
  additionalModules,
  keyboardBindTo,
  options,
  locale,
  processId,
  processName,
  userTaskCreateEventListenerExpression,
  userTaskCompleteEventListenerExpression,
  elementContainer,
} = toRefs(props);

/**
 * 内部 internalElementContainer 是为了避免 v-model 的问题
 * 详见：https://test-cprjkirb9nbd.feishu.cn/docx/YEnrdEbrtosu9Mx6I3DcLXoEnmc
 */
const internalElementContainer = ref<Record<string, ElementProperties>>({});
watch(internalElementContainer, newValue => {
  emit('update:element-container', toRaw(newValue));
});
// TODO 对 elementContainer 的每个属性进行 watch 后，通过 API 修改 modeler，以提高新能
// TODO 待验证：通过 API 修改 modeler 后是否会触发 modeler 事件，如果会，如何高效的避免没必要的 internalElementContainer 更新

const canvasId = ref('_canvas_id');

// modeler 实例
const bpmnModeler = ref<typeof BpmnModeler>();
// 根节点
const bpmnRoot = ref<ElementProperties>();

// 错误信息
const errorMessage = ref('');

const dragFileRef = ref<HTMLElement>();
// 选中的元素
const selectedElement = ref();

const specialKeys = ['conditionExpression', 'multiInstance', 'isSequential', 'createTaskEvent', 'completeTaskEvent'];

// 将文件转换为字符串后导入 BPMN modeler
const importXMLFile = (file: File) => {
  const reader = new FileReader();
  reader.onload = (pe: ProgressEvent) => {
    const target = pe.target;
    if (target) {
      emit('update:bpmn-xml', String((target as FileReader).result));
    }
  };
  reader.readAsText(file);
};
// 弹出最新的值，更新 bpmnXml
const emitXmlOfModeler = () => {
  bpmnModeler.value
    ?.saveXML({ format: true })
    .then((saveXMLResult: SaveXMLResult) => {
      emit('update:bpmn-xml', saveXMLResult.xml || '');
    })
    .catch((err: unknown) => {
      console.error('保存 XML 时出错：', err);
      emit('update:bpmn-xml', '');
    });
};

const updateProperties = (element?: ElementProperties, properties?: ElementProperties) => {
  if (!properties || !bpmnModeler.value) {
    return;
  }
  const modeling: { updateProperties: (object: unknown, elementProperties: ElementProperties) => void } | undefined =
    bpmnModeler.value.get('modeling');
  if (!modeling) {
    return;
  }
  /**
   * element 是 Vue 的代理对象，
   * bpmn.js 的 API 中某些操作会更新代理类的只读属性导致报错，
   * 通过 toRaw() 得到原对象
   * 没有选中元素，更新根节点属性
   */
  modeling.updateProperties(toRaw(element ?? bpmnRoot.value), getPropertiesToUpdate(properties, element));
};
const updatePropertiesOfSelected = (properties?: ElementProperties) => {
  updateProperties(selectedElement.value, properties);
};

export type BpmnModdle = { create: () => string | undefined };

const bpmnModdle = computed((): Moddle => {
  return (bpmnModeler.value as unknown as { _moddle: Moddle })._moddle;
});

/**
 * 外部更新元素属性，调用 bpmn.js API 时，将待更新的属性数据结构转换为 API 需要的数据结构
 *
 * @param properties 新的属性
 * @param element 待更新的元素
 */
const getPropertiesToUpdate = (properties: ElementProperties, element?: ElementProperties): ElementProperties => {
  const cleanProperties: ElementProperties = {};
  for (const key in properties) {
    if (DIRECT_KEYS.includes(key)) {
      cleanProperties[key] = properties[key] ?? '';
    } else if (!specialKeys.includes(key)) {
      cleanProperties[`${NAMESPACE}${key}`] = properties[key] ?? undefined;
    }
  }

  if (element?.type == 'bpmn:SequenceFlow' && properties?.sourceType == 'bpmn:ExclusiveGateway') {
    // 为互斥网关流程线的 conditionExpression 创建子元素
    cleanProperties.conditionExpression = properties.conditionExpression
      ? bpmnModdle.value.create('bpmn:FormalExpression', {
          body: properties.conditionExpression,
        })
      : undefined;
  } else if (element?.type == 'bpmn:UserTask') {
    if (!properties.createTaskEvent && !properties.completeTaskEvent) {
      cleanProperties.extensionElements = undefined;
    } else if (bpmnModeler.value) {
      const bpmnFactory = bpmnModeler.value.get('bpmnFactory') as {
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
      const loopCharacteristics = bpmnModdle.value.create('bpmn:MultiInstanceLoopCharacteristics', {
        isSequential: !!properties.isSequential,
        'flowable:collection': '${' + `flowTaskService.getCollection(execution, '${assigneesString}')}`,
        'flowable:elementVariable': elementVariable,
      });
      if (properties.completionConditionCount) {
        const completionCondition = bpmnModdle.value.create('bpmn:Expression');
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

const { updateXmlOfModelerIfDifferent } = useUpdateXmlOfModeler(
  emit,
  updateProperties,
  bpmnModeler,
  errorMessage,
  processId,
  bpmnRoot,
  processName,
);

/**
 * 重新绘制图表会导致位移
 * 因此只希望外部设置新的值时重新绘制
 * 流程图内部自己改变了值时，图表已经绘制为新的图了，这种情况导致的 bpmnXml 变化不应该触发重新绘制
 */
watch(bpmnXml, newValue => {
  updateXmlOfModelerIfDifferent(newValue);
});

useInit(
  emit,
  importXMLFile,
  emitXmlOfModeler,
  updateXmlOfModelerIfDifferent,
  elementContainer,
  canvasId,
  keyboardBindTo,
  dragFileRef,
  bpmnXml,
  locale,
  bpmnModeler,
  bpmnRoot,
  internalElementContainer,
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

defineExpose({
  newProcess: () => {
    emit('update:bpmn-xml', getInitialXml());
  },
  updatePropertiesOfSelected,
  updateRootProperty: (key: string, value: string) => {
    const root: { id?: string; type?: string; name?: string } | undefined = bpmnRoot.value as {
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
  importXMLFile,
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
