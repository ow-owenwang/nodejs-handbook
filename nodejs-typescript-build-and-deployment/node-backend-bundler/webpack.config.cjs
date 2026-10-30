const path = require('node:path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  mode: 'production',
  target: 'node20',
  entry: './src/server.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'server.js',
    clean: true,
  },
  resolve: { extensions: ['.ts', '.js'] },
  module: {
    rules: [{ test: /\.ts$/, use: 'ts-loader', exclude: /node_modules/ }],
  },
  externalsPresets: { node: true },
  // externals: [nodeExternals()], // webpack-node-externals 会让 express、mysql2、dotenv 在运行时仍通过 require() 从 node_modules 加载。要让 webpack 尝试把它们打进 server.js，需要删除 nodeExternals 的引入和上述 externals 配置。webpack 的 externals 正是控制“哪些依赖不进入包”的选项。
  // devtool: 'source-map',
};
