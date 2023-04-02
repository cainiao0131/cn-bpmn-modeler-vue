import { createRouter, createWebHashHistory } from 'vue-router';
import { routerModules } from './router-modules';

// 创建路由对象
const router = createRouter({
  history: createWebHashHistory(),
  routes: routerModules,
});

export default router;
