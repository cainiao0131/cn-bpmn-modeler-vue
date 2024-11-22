import type { RouteRecordRaw } from 'vue-router';

export const menus: Array<RouteRecordRaw> = [
  {
    path: 'process-diagram',
    name: 'processDiagram',
    meta: { title: '流程图' },
    component: () => import('@/views/process-diagram-page.vue'),
  },
  {
    path: 'vue-test',
    name: 'vueTest',
    meta: { title: 'Vue 组件测试' },
    component: () => import('@/views/vue-test/vue-test-page.vue'),
  },
  {
    path: 'bpmn-js-test',
    name: 'bpmnJsTest',
    meta: { title: 'bpmn.js 组件封装测试' },
    component: () => import('@/views/bpmn-js-test/bpmn-js-test-page.vue'),
  },
];

export const routerModules: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'index',
    component: () => import('@/layouts/layout.vue'),
    redirect: '/process-diagram',
    children: menus,
  },
];
