import type { RouteRecordRaw } from 'vue-router';

// 登录页路由
export const routerModules: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'index',
    component: () => import('@/layouts/layout.vue'),
    redirect: '/process-diagram',
    children: [
      {
        path: 'process-diagram',
        name: 'process-diagram',
        meta: { title: '流程图' },
        component: () => import('@/views/process-diagram-page.vue'),
      },
    ],
  },
];
