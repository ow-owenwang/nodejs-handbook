// 使用 Node.js 内置的 path 模块生成跨平台兼容的配置文件路径。
const path = require('node:path');
// build 是 esbuild 的 JavaScript API，效果相当于在命令行执行 esbuild 构建。
const { build } = require('esbuild');

build({
  // 固定构建基准目录为当前配置文件所在目录。
  // 即使从其他目录执行此配置，下面的相对路径也仍然以项目根目录为准。
  absWorkingDir: __dirname,

  // 明确指定 TypeScript 配置文件。
  // esbuild 会读取其中与代码转换和模块解析有关的部分配置，但不会进行类型检查；
  // package.json 中的 build:bundle 会先执行 tsc --noEmit 完成类型检查。
  tsconfig: path.join(__dirname, 'tsconfig.json'),

  // 构建入口。esbuild 会从 server.ts 开始分析其所有静态依赖。
  entryPoints: ['src/server.ts'],

  // 单文件构建产物的输出位置。
  // 使用 .cjs 扩展名可明确告诉 Node.js 按 CommonJS 模块加载该文件。
  outfile: 'dist/bundle/server.cjs',

  // 开启打包，将入口文件、本项目模块以及可打包的第三方依赖合并到输出文件。
  bundle: true,

  // 允许把 node_modules 中引用到的 npm 包打入产物。
  // 如果设置为 external，输出文件仍会在运行时从 node_modules 加载这些依赖。
  packages: 'bundle',

  // 目标运行平台是 Node.js。
  // esbuild 会保留 fs、path、http 等 Node.js 内置模块，不为浏览器生成替代实现。
  platform: 'node',

  // 生成 CommonJS 格式，以便使用 node dist/bundle/server.cjs 直接启动。
  format: 'cjs',

  // 产物面向 Node.js 20，esbuild 可保留该版本已经支持的 JavaScript 语法。
  target: 'node20',

  // 压缩变量名和代码，减小交付文件体积。
  // 压缩只能降低阅读便利性，不能作为可靠的源码保护措施。
  minify: true,

  // 不生成 source map，避免交付包中出现原始 TypeScript 源码和目录映射信息。
  sourcemap: false,

  // 在构建时输出产物大小、警告和错误等信息。
  logLevel: 'info',
}).catch((error) => {
  // build 返回 Promise。构建失败时记录错误并以非零状态码退出，便于 CI 判断失败。
  console.error('esbuild failed:', error);
  process.exit(1);
});
