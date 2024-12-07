<template>
  <div ref="bpmnModelerContainer" class="bpmn-modeler-wrapper" :style="{ height: '100%' }">
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
      <div v-show="!!bpmnXml" id="canvas-container" class="canvas" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import BpmnModeler from 'bpmn-js/lib/Modeler';
import { SaveXMLResult } from 'bpmn-js/lib/BaseViewer';
import { CN } from '@/utils';
import { flowableExtensions } from '../../../../cn-bpmn-modeler/src/cn-bpmn-modeler/moddle-extensions/flowable';
import flowableControlsModule from '../../../../cn-bpmn-modeler/src/cn-bpmn-modeler/additional-modules/flowable';
import { cnTranslator } from '../../../../cn-bpmn-modeler/src/cn-bpmn-modeler/util/locale';
import {
  BpmnBusiness,
  BpmnElement,
  ProcessElement,
  InternalEvent,
} from 'cn-bpmn-modeler-vue/src/cn-bpmn-modeler/types';

const emit = defineEmits<{
  (eventName: 'update:bpmn-xml', bpmnXml: string): void;
  (eventName: 'update:selected-elements', selectedElements: Array<ProcessElement>): void;
}>();

const props = defineProps({
  bpmnXml: {
    type: String,
    default: '',
  },
  selectedElements: {
    type: Array as PropType<Array<ProcessElement>>,
    default: () => {
      return [];
    },
  },
});
const { bpmnXml, selectedElements } = toRefs(props);

// modeler 实例
const bpmnModeler = ref<typeof BpmnModeler>();
const dragFileRef = ref<HTMLElement>();
// 根节点
const bpmnRoot = ref<ProcessElement>();

/**
 * 由于 bpmn.js 会在同一个 event loop 中 emit 多个 update:selected-elements 事件
 * 而这多个 emit update:selected-elements 事件前，都会先通过 isEqual 判断，而 isEqual 中又依赖对 selectedElements 的读操作
 * 此时对 selectedElements 的读操作，是无法看见同一个 event loop 的前驱 update:selected-elements 弹出的状态的，从而造成误判
 * 因此通过 internalSelectedElements 来解决这个问题，所有的读写都对 internalSelectedElements 进行操作
 * 对 Vue 的 Ref 的写操作是立即可见的
 * 详见：https://test-cprjkirb9nbd.feishu.cn/docx/YEnrdEbrtosu9Mx6I3DcLXoEnmc#share-PMmPd153ToP8aAxvwMVchjQ9nFd
 */
const internalSelectedElements = ref<Array<ProcessElement>>([]);
watch(internalSelectedElements, newValue => {
  /**
   * 这里必须弹出新的对象，否则外部对 prop 属性的修改会导致内部的 internalData 被修改
   * 这样对 selectedElements 的 watch 中的 isEqual 判断就永远都是相同的了
   */
  const new_: Array<ProcessElement> = [];
  if (newValue) {
    newValue.forEach(v => {
      return new_.push({ ...v });
    });
  }
  emit('update:selected-elements', new_);
});
watch(
  selectedElements,
  newValue => {
    if (selectedElementsOfModeler.value) {
      getNeedUpdateElements(internalSelectedElements.value, newValue).forEach(item => {
        // 必须使用 toRaw()，否则 JS 组件的 API 会修改 Vue Ref 的只读属性导致报错
        updateProperties(toRaw(item.elementOfModeler), item.element);
      });
    }
  },
  { deep: true },
);

// 前一个选中的元素
const previousSelections = ref<Array<ProcessElement>>([]);
// 当前选中的元素
const currentSelections = ref<Array<ProcessElement>>([]);
/**
 * 选中的元素，选中多个元素时，视为没有选中元素
 * 正常情况下，selectedElementOfModeler == currentSelections
 * 但 bpmn.js 在有些情况下会有意料之外的行为
 * 例如用户修改任务类型的操作，会导致先弹出一个 selection.changed 事件将 currentSelections 置空
 * 在任务类型改变完成之后，再弹出一个 selection.changed 事件重新设置 currentSelections
 * 而任务类型属性的 element.changed 事件是在上述两个 selection.changed 事件之间弹出的
 * 并且，对任务类型的改变，还会导致弹出两个无关元素的 selection.changed 事件
 * 这就需要通过事件回调中判断当前事件元素是否等于当前选中元素，以此为依据判断是否应该 emit 事件元素的属性变化
 * 而此时直接获取 currentSelections 的值是获取不到的，因为已经被第一个 selection.changed 事件置空了
 * 所以需要通过 previousSelections 来获取当前选中的元素
 *
 * 说明 1：
 * 注意，element.changed 事件对象中的元素对象
 * 与 selection.changed 事件将 currentSelections 置空之前的对象（即 previousSelections 暂存的对象）是不同的对象
 * 因此在 selection.changed 事件的回调中，不能直接比较对象，需要通过比较对象的 ID 来确认，同时重新设置新对象
 */
const selectedElementsOfModeler = computed({
  get: (): Array<ProcessElement> => {
    return currentSelections.value.length > 0 ? currentSelections.value : previousSelections.value;
  },
  set: newValue => {
    previousSelections.value = currentSelections.value;
    currentSelections.value = newValue;
  },
});
const selectedElementsOfModelerContainer = computed(() => {
  const selectedElementsOfModelerContainer_: Record<string, ProcessElement> = {};
  selectedElementsOfModeler.value.forEach(selectedElementOfModeler => {
    const businessObject = selectedElementOfModeler.businessObject as BpmnBusiness;
    selectedElementsOfModelerContainer_[businessObject.id] = selectedElementOfModeler;
  });
  return selectedElementsOfModelerContainer_;
});

/**
 * 获取需要调用 bpmn.js API 更新元素属性的元素
 */
const getNeedUpdateElements = (
  oldElements: Array<ProcessElement>,
  newElements: Array<ProcessElement>,
): Array<{ elementOfModeler: ProcessElement; element: ProcessElement }> => {
  const oldElementsContainer_: Record<string, ProcessElement> = {};
  oldElements.forEach(oldElement => {
    oldElementsContainer_[oldElement.id!] = oldElement;
  });

  const elementsNeedUpdate: Array<{ elementOfModeler: ProcessElement; element: ProcessElement }> = [];
  newElements.forEach(newElement => {
    const id: string = newElement.id!;
    const elementOfModeler: ProcessElement | undefined = selectedElementsOfModelerContainer.value[id];
    const oldElement = oldElementsContainer_[id];
    if (elementOfModeler && (!oldElement || !isEqual(newElement, oldElement))) {
      elementsNeedUpdate.push({ elementOfModeler, element: newElement });
    }
  });
  return elementsNeedUpdate;
};

const isEqual = (element1: ProcessElement, element2: ProcessElement) => {
  if ((element1.name ?? '') != (element2.name ?? '')) {
    return false;
  }
  if ((element1.id ?? '') != (element2.id ?? '')) {
    return false;
  }
  return true;
};

const updateProperties = (element: ProcessElement, properties?: ProcessElement) => {
  if (!properties || !bpmnModeler.value) {
    return;
  }
  const modeling: { updateProperties: (object: unknown, elementProperties: ProcessElement) => void } | undefined =
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
  modeling.updateProperties(element, properties);
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

// 插入 XML
const updateXmlOfModeler = (newVal?: string, success?: () => void) => {
  if (newVal) {
    const bpmnModeler_ = bpmnModeler.value;
    if (bpmnModeler_) {
      bpmnModeler_
        .importXML(newVal)
        .then(() => {
          errorMessage.value = '';
          // 如果不设置 setTimeout，无法设置成功，nextTick 也不行
          setTimeout(() => {
            // 根据当前窗口居中
            const canvas = bpmnModeler_.get('canvas') as { zoom: (a: string, b: string) => void };
            canvas.zoom('fit-viewport', 'auto');
          }, 1);
          if (success) {
            success();
          }
        })
        .catch((err: { message: string }) => {
          errorMessage.value = err.message || '打开图表失败';
          console.error('updateXmlOfModeler() >>> err =', err);
        });
    }
  }
};

/**
 * 更新 Xml，只有 Xml 有变化时才插入。
 * 因为插入会导致图像闪烁以及失去焦点，尽量避免不必要的插入。
 */
const updateXmlOfModelerIfDifferent = (newValue: string, success?: () => void) => {
  bpmnModeler.value
    .saveXML({ format: true })
    .then((saveXMLResult: SaveXMLResult) => {
      if (newValue != saveXMLResult.xml) {
        updateXmlOfModeler(newValue, success);
      }
    })
    .catch(() => {
      updateXmlOfModeler(newValue, success);
    });
};

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

/**
 * 重新绘制图表会导致位移
 * 因此只希望外部设置新的值时重新绘制
 * 流程图内部自己改变了值时，图表已经绘制为新的图了，这种情况导致的 bpmnXml 变化不应该触发重新绘制
 */
watch(bpmnXml, newValue => {
  updateXmlOfModelerIfDifferent(newValue);
});

onMounted(() => {
  const newAdditionalModules: Array<unknown> = [];
  newAdditionalModules.push(flowableControlsModule);
  newAdditionalModules.push({
    translate: [
      'value',
      (english: string, replacements: Record<string, string>) => {
        return cnTranslator(english, replacements, CN);
      },
    ],
  });
  const rawModeler = new BpmnModeler({
    container: '#canvas-container',
    keyboard: {
      bindTo: window,
    },
    additionalModules: newAdditionalModules,
    moddleExtensions: {
      flowable: flowableExtensions,
    },
  });
  bpmnModeler.value = rawModeler;

  // 任何会导致 xml 变化的状态更新都会触发，例如包括位置移动，但不包括选中的节点变化
  rawModeler.on('commandStack.changed', (internalEvent: InternalEvent) => {
    // 弹出新的 xml
    emitXmlOfModeler();
  });

  // 添加根节点事件
  rawModeler.on('root.added', (internalEvent: InternalEvent) => {
    const bpmnRoot_ = internalEvent.element;
    bpmnRoot.value = bpmnRoot_;
  });

  // 选择元素改变事件
  rawModeler.on('selection.changed', (internalEvent: InternalEvent) => {
    const newSelection = internalEvent.newSelection as Array<ProcessElement> | undefined;
    if (newSelection && newSelection.length > 0) {
      selectedElementsOfModeler.value = newSelection;
      internalSelectedElements.value = newSelection.map(newSelect => {
        return createData(newSelect);
      });
    } else {
      selectedElementsOfModeler.value = [];
      internalSelectedElements.value = [];
    }
  });

  const createData = (elementOfModeler: ProcessElement) => {
    const businessObject = elementOfModeler?.businessObject as BpmnBusiness | undefined;
    return { id: businessObject?.id, name: businessObject?.name };
  };

  const getId = (elementOfModeler: ProcessElement) => {
    const businessObject = elementOfModeler?.businessObject as BpmnBusiness | undefined;
    return businessObject?.id ?? '';
  };

  // 元素属性变化事件
  rawModeler.on('element.changed', (internalEvent: InternalEvent) => {
    /**
     * selectedElementsOfModeler.value?.id == internalEvent.element?.id
     * 用于判断当前事件关联的对象与 selectedElementsOfModeler 是不是同一个
     * 之所以可能会不同，是因为某些用户操作，可能会导致多个元素实例都弹出 element.changed 事件
     * 例如改变任务类型，除了对应的任务节点对象会弹出事件，前后的连线元素也会弹出 element.changed 事件
     * 这里的判断能避免【连线元素】弹出的事件触发错误的 emit
     *
     * 不能用 toRaw(selectedElementsOfModeler.value) != internalEvent.element 来做上述判断
     * 因为即便是同一个元素，selectedElementOfModeler 与 internalEvent.element 也可能不同，详见【说明 1】
     */
    const eventElement = internalEvent.element;
    if (eventElement) {
      const id = getId(eventElement);
      const selectedElementOfModeler = selectedElementsOfModelerContainer.value[id];
      if (selectedElementOfModeler) {
        if (toRaw(selectedElementOfModeler) != eventElement) {
          // ID 相同但对象不同时，重新设置对象，详见【说明 1】
          // TODO，能否优化性能
          const new_: Array<ProcessElement> = [];
          selectedElementsOfModeler.value.forEach(e => {
            if (getId(e) == id) {
              new_.push(eventElement);
            } else {
              new_.push(e);
            }
          });
          selectedElementsOfModeler.value = new_;
        }
        // TODO，能否优化性能
        const newElments_: Array<ProcessElement> = [];
        internalSelectedElements.value.forEach(e => {
          if (e.id == id) {
            newElments_.push(createData(eventElement));
          } else {
            newElments_.push(e);
          }
        });
        internalSelectedElements.value = newElments_;
      }
    }
  });

  // 检查浏览器的文件 API 是否可用
  if (!window.FileList || !window.FileReader) {
    errorMessage.value = '您使用的浏览器版本不支持拖入文件，请尝试使用 Chrome、Firefox 或版本 10 以上的 IE 浏览器';
  } else if (dragFileRef.value) {
    // 注册拖入文件时的回调
    dragFileRef.value.addEventListener(
      'dragover',
      (dragEvent: DragEvent) => {
        dragEvent.stopPropagation();
        dragEvent.preventDefault();
        // 显式地展示这是复制
        const dataTransfer = dragEvent.dataTransfer;
        if (dataTransfer) {
          dataTransfer.dropEffect = 'copy';
        }
      },
      false,
    );
    dragFileRef.value.addEventListener(
      'drop',
      (dragEvent: DragEvent) => {
        dragEvent.stopPropagation();
        dragEvent.preventDefault();
        const dataTransfer = dragEvent.dataTransfer;

        if (dataTransfer) {
          const files = dataTransfer.files;
          if (files.length > 0) {
            importXMLFile(files[0]);
          }
        }
      },
      false,
    );
  }

  /**
   * watch bpmnXml 没有设置 immediate，因为那时 bpmnModeler 还没准备好
   * 在 onMounted 中导入一下 bpmnXml 的初始值
   */
  updateXmlOfModelerIfDifferent(bpmnXml.value);
});

// 错误信息
const errorMessage = ref('');
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
