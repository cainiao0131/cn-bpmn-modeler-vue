<template>
  <div class="bpmn-wrapper">
    <div id="canvas" class="bpmn-canvas"></div>
  </div>
</template>

<script setup lang="ts">
import { axios } from '@/plugins/axios';
import BpmnJS from 'bpmn-js/lib/Modeler';

// bpmn.js 实例
const bpmnModeler = ref<typeof BpmnJS>();

onMounted(() => {
  const rawModeler = new BpmnJS({
    container: '#canvas',
    keyboard: {
      bindTo: window,
    },
  });

  bpmnModeler.value = rawModeler;

  axios({
    method: 'get',
    url: 'https://cdn.staticaly.com/gh/bpmn-io/bpmn-js-examples/dfceecba/starter/diagram.bpmn',
  }).then(data => {
    if (data) {
      bpmnModeler.value.importXML(data).then(() => {
        // 访问 modeler 组件
        const canvas = bpmnModeler.value.get('canvas');
        const overlays = bpmnModeler.value.get('overlays');
        // 缩放以适合整个视口
        canvas.zoom('fit-viewport');
        // 将叠加层附加到节点
        overlays.add('SCAN_OK', 'note', {
          position: {
            bottom: 0,
            right: 0,
          },
          html: '<div class="diagram-note">Mixed up the labels?</div>',
        });
        // 添加标记
        canvas.addMarker('SCAN_OK', 'needs-discussion');
      });
    }
  });
});
</script>

<style lang="less" scoped>
.bpmn-wrapper {
  height: 100%;
  .bpmn-canvas {
    height: 100%;
  }
}
</style>
