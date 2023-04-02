import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fsp } from 'node:fs';
import ts from 'rollup-plugin-typescript2';
import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import chalk from 'chalk';
import pkg from './package.json';
import { terser } from 'rollup-plugin-terser';

const name = pkg.name;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const banner = `/*!
  * ${pkg.name} v${pkg.version}
  * (c) ${new Date().getFullYear()} 重庆
  * @license ${pkg.license}
  */`;

// 确保每次构建只进行一次 TS 检测
let hasTSChecked = false;

const outputConfigs = {
  // 文件名格式：`dist/${name}.${format}.${ext}`
  mjs: {
    file: pkg.module,
    format: `es`,
  },
  cjs: {
    file: 'dist/cn-bpmn-modeler-vue.cjs',
    format: `cjs`,
  },
  global: {
    file: pkg.unpkg,
    format: `iife`,
  },
  browser: {
    file: 'dist/cn-bpmn-modeler-vue.esm-browser.js',
    format: `es`,
  },
};

const stubs = {
  'dist/cn-bpmn-modeler-vue.cjs': 'cn-bpmn-modeler-vue.cjs.js',
  'dist/cn-bpmn-modeler-vue.mjs': 'cn-bpmn-modeler-vue.esm-bundler.js',
  'dist/cn-bpmn-modeler-vue.prod.cjs': 'cn-bpmn-modeler-vue.cjs.prod.js',
};

const packageBuilds = Object.keys(outputConfigs);
// in cn-bpmn-modeler-vue there are not that many
const packageConfigs = packageBuilds.map(buildName => createConfig(buildName, outputConfigs[buildName]));

// only add the production ready if we are bundling the options
packageBuilds.forEach(buildName => {
  if (buildName === 'cjs') {
    packageConfigs.push(createProductionConfig(buildName));
  } else if (buildName === 'global') {
    packageConfigs.push(createMinifiedConfig(buildName));
  }
});

export default packageConfigs;

function createConfig(buildName, output, plugins = []) {
  if (!output) {
    console.log(chalk.yellow(`格式错误："${buildName}"`));
    process.exit(1);
  }

  output.sourcemap = !!process.env.SOURCE_MAP;
  output.banner = banner;
  output.externalLiveBindings = false;
  output.globals = {
    vue: 'Vue',
    // 在 iife 中，开发工具不是 global 的
    // '@vue/devtools-api': 'VueDevtoolsApi',
  };

  const isProductionBuild = /\.prod\.[cm]?js$/.test(output.file);
  const isGlobalBuild = buildName === 'global';
  const isRawESMBuild = buildName === 'browser';
  const isNodeBuild = output.file.includes('.node.') || buildName === 'cjs';
  const isBundlerESMBuild = buildName === 'mjs';

  if (isGlobalBuild) output.name = 'BpmnJsVue';

  const shouldEmitDeclarations = !hasTSChecked;

  const tsPlugin = ts({
    check: !hasTSChecked,
    tsconfig: path.resolve(__dirname, 'tsconfig.json'),
    cacheRoot: path.resolve(__dirname, 'node_modules/.rts2_cache'),
    tsconfigOverride: {
      compilerOptions: {
        sourceMap: output.sourcemap,
        declaration: shouldEmitDeclarations,
        declarationMap: shouldEmitDeclarations,
      },
      exclude: ['__tests__', 'test-dts'],
    },
  });
  // 每次构建只需进行一次 TS 检测与生成声明
  // 在一次构建中进行多次检测还可能出现奇怪的问题
  hasTSChecked = true;

  const external = ['vue'];
  if (
    !isGlobalBuild &&
    // cn-bpmn-modeler-vue.prod.cjs 不应该 require `@vue/devtools-api` (如 Vue)
    !(isProductionBuild && isNodeBuild)
  ) {
    external.push('@vue/devtools-api');
  }

  const nodePlugins = [resolve(), commonjs()];

  return {
    input: `src/index.ts`,
    // 全局（Global）与浏览器（Browser）ESM 构建将内联所有内容，以便可以单独使用
    external,
    plugins: [
      tsPlugin,
      createReplacePlugin(
        isProductionBuild,
        isBundlerESMBuild,
        // isBrowserBuild?
        isGlobalBuild || isRawESMBuild || isBundlerESMBuild,
        isGlobalBuild,
        isNodeBuild,
      ),
      ...nodePlugins,
      ...plugins,
      {
        async writeBundle() {
          const stub = stubs[output.file];
          if (!stub) return;

          const contents =
            buildName === 'cjs' ? `module.exports = require('../${output.file}')` : `export * from '../${output.file}'`;

          await fsp.writeFile(path.resolve(__dirname, `dist/${stub}`), contents);
          console.log(`created stub ${chalk.bold(`dist/${stub}`)}`);
          // add the node specific version
          if (buildName === 'mjs') {
            const outfile = `dist/${stub}`.replace('esm-bundler.js', 'node.mjs');
            await fsp.writeFile(path.resolve(__dirname, outfile), `global.__VUE_PROD_DEVTOOLS__ = false;\n` + contents);
            console.log(`created stub ${chalk.bold(outfile)}`);
          }
        },
      },
    ],
    output,
    // onwarn: (msg, warn) => {
    //   if (!/Circular/.test(msg)) {
    //     warn(msg)
    //   }
    // },
  };
}

function createReplacePlugin(isProduction, isBundlerESMBuild, isBrowserBuild, isGlobalBuild, isNodeBuild) {
  const replacements = {
    __COMMIT__: `"${process.env.COMMIT}"`,
    __VERSION__: `"${pkg.version}"`,
    __DEV__: isBundlerESMBuild
      ? // preserve to be handled by bundlers
        `(process.env.NODE_ENV !== 'production')`
      : // hard coded dev/prod builds
        JSON.stringify(!isProduction),
    // this is only used during tests
    __TEST__: 'false',
    // If the build is expected to run directly in the browser (global / esm builds)
    __BROWSER__: isBrowserBuild,
    __FEATURE_PROD_DEVTOOLS__: isBundlerESMBuild ? `__VUE_PROD_DEVTOOLS__` : 'false',
    // is targeting bundlers?
    __BUNDLER__: JSON.stringify(isBundlerESMBuild),
    __GLOBAL__: JSON.stringify(isGlobalBuild),
    // is targeting Node (SSR)?
    __NODE_JS__: JSON.stringify(isNodeBuild),
  };
  // allow inline overrides like
  //__RUNTIME_COMPILE__=true yarn build
  Object.keys(replacements).forEach(key => {
    if (key in process.env) {
      replacements[key] = process.env[key];
    }
  });
  return replace({
    preventAssignment: true,
    values: replacements,
  });
}

function createProductionConfig(format) {
  const extension = format === 'cjs' || format === 'mjs' ? format : 'js';
  const descriptor = format === 'cjs' || format === 'mjs' ? '' : `.${format}`;
  return createConfig(format, {
    file: `dist/${name}${descriptor}.prod.${extension}`,
    format: outputConfigs[format].format,
  });
}

function createMinifiedConfig(format) {
  return createConfig(
    format,
    {
      file: `dist/${name}.${format}.prod.js`,
      format: outputConfigs[format].format,
    },
    [
      terser({
        module: /^esm/.test(format),
        compress: {
          ecma: 2015,
          pure_getters: true,
        },
      }),
    ],
  );
}
