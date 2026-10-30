# node-backend-tsc-esbuild

Express + TypeScript + MySQL 后端示例，同时提供 `tsc` 多文件编译和 esbuild 单文件打包。两种构建方式使用同一套源码，接口为 `GET /api/products`。

核心代码拆分为三个 TypeScript 模块：`server.ts` 负责 HTTP 服务和进程生命周期，`product.service.ts` 负责商品查询，`db.ts` 负责数据库连接池。这让两种构建结果的区别更直观。

## 环境与数据库

需要 Node.js 20+ 和 MySQL 8。先执行建库、建表和模拟数据脚本：

```bash
mysql -u root -p < sql/init.sql
```

再配置运行时环境变量：

```bash
npm install
cp .env.example .env
# 修改 .env 中的数据库地址、账号和密码
```

`.env` 不应放进构建产物或交付包。启动命令应在项目或交付包根目录执行，`dotenv` 默认从当前工作目录读取 `.env`。也可以由服务器直接设置环境变量。

## 开发

```bash
npm run dev
```

## 方式一：tsc

```bash
npm run build:tsc
npm run start:tsc
```

输出到 `dist/tsc/`，分别生成 `server.js`、`product.service.js` 和 `db.js`。`tsc` 保留源码的模块边界，不会把这些文件合并成一个文件。它们仍需要 `express`、`mysql2`、`dotenv` 等生产依赖。部署时提供 `dist/tsc/`、`package.json`、`package-lock.json`，并在目标环境运行 `npm ci --omit=dev`。

## 方式二：esbuild

```bash
npm run build:bundle
npm run start:bundle
```

输出 `dist/bundle/server.cjs`，构建时会先做 TypeScript 类型检查。esbuild 尝试把生产依赖一起打进单文件，不生成 source map。部署时仍需 Node.js、数据库连接配置和数据库本身；如果以后新增原生模块、动态加载文件或其他运行时资源，需重新验证是否可以单文件交付。

## 验证接口

```bash
curl http://localhost:3000/api/products
```

响应格式为 `{ "data": [...] }`。MySQL 的 `DECIMAL` 价格以字符串返回，以保持精度。数据库不可用时服务在启动阶段失败；单次查询失败时接口返回 HTTP 500。
