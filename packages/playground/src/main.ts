import { createApp } from 'vue';
import App from '@/App.vue';
import 'ant-design-vue/dist/reset.css';
import plugins from '@/plugins';
import { initSore } from './store/init-store';

const app = createApp(App).use(plugins);

app.config.errorHandler = (err: unknown) => {
  console.error('app.config.errorHandler() >>> err =', err);
  const newErr = err as { location?: unknown };
  if (err && newErr.location) {
    console.error('app.config.errorHandler() >>> err.location = ', newErr.location);
  }
};

app.mount('#app');

// 初始化数据库，在 pinia 插件注册后执行
initSore();
