import BpmnModeler from 'bpmn-js/lib/Modeler';
import { debounce } from '../utils';
import { InternalEvent, ProcessModelerApi } from '../types';
import { onMounted, toRaw } from 'vue';
import { flowableExtensions } from './moddle-extensions/flowable';
import flowableControlsModule from './additional-modules/flowable';

export function useInit(
  getProcessModelerApi: () => ProcessModelerApi,
  importXMLFile: (file: File) => void,
  emitModelerXml: () => void,
  importIfDifferent: (newValue: string, success?: () => void) => void,
  keyboardBindTo: Ref<unknown>,
  dragFileRef: Ref<HTMLElement | undefined>,
  bpmnXml: Ref<string>,
  translator: Ref<(english: string, replacements: Record<string, string>) => string>,
  bpmnModeler: Ref<typeof BpmnModeler>,
  errorMessage: Ref<string>,
  options: Ref<Record<string, unknown>>,
  additionalModules: Ref<Array<unknown>>,
  emit: {
    (eventName: 'api-ready', message: ProcessModelerApi): void;
    (eventName: 'modeler-ready', message: typeof BpmnModeler): void;
    (eventName: 'root-added', message: InternalEvent): void;
    (eventName: 'selection-changed', message: InternalEvent): void;
  },
) {
  onMounted(() => {
    /**
     {
        translate: [
          'value',
          (english: string, replacements: Record<string, string>) => {
            return translator.value(english, replacements) || english;
          },
        ],
      },
     */
    const newAdditionalModules: Array<unknown> = [];
    const rawAdditionalModules = toRaw(additionalModules.value);
    rawAdditionalModules.forEach(additionalModule => {
      newAdditionalModules.push(additionalModule);
    });
    newAdditionalModules.push(flowableControlsModule);
    const rawModeler = new BpmnModeler(
      Object.assign(
        {
          container: '#_bpmn-modeler-canvas',
          keyboard: {
            bindTo: keyboardBindTo.value,
          },
          additionalModules: newAdditionalModules,
          moddleExtensions: {
            flowable: flowableExtensions,
          },
        },
        toRaw(options.value),
      ),
    );
    emit('modeler-ready', rawModeler);
    bpmnModeler.value = rawModeler;

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
     * change 事件，每次变化都将新的数据弹出
     * change 事件回调的参数中没有 XML 值，需要调用 emitModelerXml 获取
     */
    bpmnModeler.value.on('commandStack.changed', debounce(emitModelerXml, 500));
    // 添加根节点事件
    bpmnModeler.value.on('root.added', (internalEvent: InternalEvent) => {
      emit('root-added', internalEvent);
    });
    // 选择改变事件
    bpmnModeler.value.on('selection.changed', (internalEvent: InternalEvent) => {
      emit('selection-changed', internalEvent);
    });
    /**
     * watch bpmnXml 没有设置 immediate，因为那时 bpmnModeler 还没准备好
     * 在 onMounted 中导入一下 bpmnXml 的初始值
     */
    importIfDifferent(bpmnXml.value);

    emit('api-ready', getProcessModelerApi());
  });
  return { bpmnModeler };
}
