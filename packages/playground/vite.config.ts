import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import Vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers';
import AutoImport from 'unplugin-auto-import/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    Vue(),
    Components({
      dts: 'src/components.d.ts',
      deep: true,
      dirs: ['src/components'],
      extensions: ['vue', 'tsx'],
      resolvers: [
        AntDesignVueResolver({
          importStyle: false,
        }),
      ],
    }),
    AutoImport({
      dts: 'src/auto-imports.d.ts',
      imports: ['vue'],

      eslintrc: {
        enabled: true,
        filepath: './.eslintrc-auto-import.json',
        globalsPropValue: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'cn-bpmn-modeler-vue': fileURLToPath(new URL('../cn-bpmn-modeler/src', import.meta.url)),
    },
  },
  define: {
    __DEV__: JSON.stringify(!process.env.prod),
    __BROWSER__: 'true',
    'process.env': {
      NODE_ENV: JSON.stringify(process.env.NODE_ENV),
    },
  },
  optimizeDeps: {
    include: ['@ant-design/icons-vue', 'ant-design-vue'],
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },
});

// import { visualizer } from 'rollup-plugin-visualizer';
// import vitePluginEslint from 'vite-plugin-eslint';

// const lifecycle = process.env.npm_lifecycle_event;
// export default defineConfig(({ mode }) => {
//   return {
//     plugins: [
//       mode === 'development' &&
//         vitePluginEslint({
//           lintOnStart: false, // 启动时候是否就执行eslint校验，如果开启的话有eslint的报错则服务是会启动失败
//         }),
//       lifecycle === 'report' ? visualizer({ open: true, brotliSize: true, filename: 'report.html' }) : null,
//     ],
//   };
// });