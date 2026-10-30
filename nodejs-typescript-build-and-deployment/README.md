# Node.js TypeScript 后端的构建、打包与部署

## 先说结论

正式的 Node.js 后端项目通常值得使用 TypeScript，但 TypeScript 并不要求配合 webpack。常规项目可以直接使用 `tsc` 编译；需要单文件产物时，再使用 esbuild、webpack 等打包工具。

常见选择如下：

| 目标 | 推荐方式 | 产物特点 |
| --- | --- | --- |
| 常规开发和部署 | `tsc` | 多个 JavaScript 文件，保留模块结构 |
| 单文件交付 | `tsc --noEmit` + esbuild | 类型检查与打包分开，生成单个文件 |
| 已有复杂 webpack 体系 | `tsc --noEmit` + webpack | 配置能力强，构建配置相对复杂 |
| 客户使用 Docker 部署 | 多阶段 Docker 构建 | 交付最终镜像，运行环境和依赖一起封装 |

不论选择哪种方式，压缩或打包后的 JavaScript 都可以被分析。它们能减少源码目录和可读性，但不能提供绝对的源码保护。如果核心逻辑必须完全不可见，应由服务提供方托管，客户通过 API 使用。

## webpack 是必需的吗

一般不是。

Node.js 本身支持模块加载，服务器也不需要像浏览器那样把大量资源合并以减少网络请求。因此，多数 TypeScript 后端可以直接把 `.ts` 编译成 `.js`，再由 Node.js 运行：

```text
TypeScript 源码 → tsc 编译 → dist 中的 JavaScript → Node.js 运行
```

webpack、esbuild 等工具主要在以下场景有价值：

- 希望生成单个或少量交付文件；
- 希望把可打包的生产依赖放入产物；
- 希望压缩代码，降低直接阅读的便利性；
- 目标是 Serverless、边缘运行时等有特殊产物要求的环境；
- 项目已经使用特定 loader、插件或资源处理流程。

如果只是开发并部署普通 API 服务，引入 webpack 并不是必要步骤。

## 开发与构建工具链

一套简单且常见的 TypeScript 后端工具链是：

```text
开发：tsx watch src/server.ts
检查：tsc --noEmit
构建：tsc，或使用 esbuild / webpack 打包
运行：node dist/server.js
```

各工具的职责不同：

- `tsx`：开发阶段直接运行 TypeScript，并在文件变化后重启服务；
- `tsc --noEmit`：只进行 TypeScript 类型检查，不生成文件；
- `tsc`：进行类型检查并逐文件生成 JavaScript；
- esbuild：快速转换并打包代码，但不进行完整的 TypeScript 类型检查；
- webpack：根据依赖图打包代码，支持更复杂的 loader 和插件配置；
- Node.js：在生产环境运行最终 JavaScript 产物。

因此，使用 esbuild 时通常仍保留一次独立的类型检查：

```bash
tsc --noEmit
esbuild src/server.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --format=cjs \
  --outfile=dist/server.cjs
```

## 三种构建方式

### 1. 使用 tsc 编译

假设源码包含三个模块：

```text
src/
├── server.ts
├── product.service.ts
└── db.ts
```

执行：

```bash
tsc
```

通常得到：

```text
dist/
├── server.js
├── product.service.js
└── db.js
```

`tsc` 保留模块边界，不会把常规 CommonJS 或 ES 模块项目合成一个文件。生成的 JS 仍会在运行时从 `node_modules` 加载 `express`、`mysql2` 等依赖。

优点：

- 配置简单，行为接近原始源码；
- 类型检查与代码生成由同一个工具完成；
- 调试和线上问题定位较直观。

限制：

- 交付文件较多，并保留接近源码的目录结构；
- 目标服务器仍需安装生产依赖；
- 生成的 JavaScript 通常比较容易阅读。

### 2. 使用 esbuild 打包

esbuild 可以从入口文件分析依赖，将本地模块和可打包的 npm 依赖合并到一个文件：

```text
src/*.ts + 可打包依赖 → dist/server.cjs
```

推荐先运行 `tsc --noEmit`，因为 esbuild 会移除 TypeScript 类型，但不负责完整的类型检查。

优点：

- 构建速度快；
- 配置相对简洁；
- 可以生成压缩后的单文件产物；
- 适合希望减少交付文件数量的 Node.js 服务。

限制：

- 原生扩展（`.node`）、动态 `require`、运行时读取的模板或资源文件不一定能直接进入单文件；
- 新增依赖后，需要在没有项目 `node_modules` 的环境中重新验证产物；
- 单文件和压缩不能阻止客户分析业务逻辑。

### 3. 使用 webpack 打包

webpack 也可以生成单文件 Node.js 产物。关键配置通常包括：

```js
module.exports = {
  target: 'node20',
  entry: './src/server.ts',
  output: {
    filename: 'server.js',
  },
};
```

如果配置了 `webpack-node-externals`：

```js
externals: [nodeExternals()]
```

那么 `node_modules` 中的依赖不会进入 bundle，运行时仍需安装这些依赖。删除该 external 配置后，webpack 才会尝试把它们打进产物。

下面两项含义不同：

- `exclude: /node_modules/`：只表示不让 `ts-loader` 转译依赖，不等于不打包依赖；
- `externals`：明确要求 webpack 不把某些依赖放入 bundle。

webpack 更适合已有相关技术栈，或确实需要其 loader、插件和高级构建能力的项目。仅为了打包普通 Node.js API，esbuild 通常更轻量。

## source map 是否应该交付

生产环境可以生成 source map 用于错误定位，但通常由开发方私下保存或上传到错误监控系统，不随客户交付包公开。

完整 source map 可能包含：

- 原始 TypeScript 文件名和目录结构；
- 原始源码内容；
- 压缩代码与源码之间的映射。

如果客户没有购买源码，交付产物通常不包含 `.map` 文件，也不应在 JS 文件末尾保留可访问的 source map 引用。即使不提供 source map，JavaScript 本身仍可被分析。

## 部署与交付方式

### 方式一：构建产物加锁文件

不使用 Docker 时，常见交付结构如下：

```text
release/
├── dist/
│   └── server.js
├── package.json
├── package-lock.json
├── sql/
├── .env.example
└── DEPLOY.md
```

客户在目标服务器安装生产依赖并启动：

```bash
cd release
npm ci --omit=dev
cp .env.example .env
# 填写服务器上的实际配置，并执行 sql/ 中的初始化或迁移脚本
node dist/server.js
```

这种方式让依赖在客户服务器的操作系统和 CPU 架构上安装，可以避免直接复制开发机 `node_modules` 造成的平台兼容问题。`package-lock.json` 用于固定实际安装的依赖版本。

不建议直接把 macOS 或 Windows 上安装的 `node_modules` 复制到 Linux 服务器。纯 JavaScript 依赖有时可以运行，但原生模块、安装脚本和平台相关可选依赖可能失败。

### 方式二：单文件 bundle

当 esbuild 或 webpack 已将生产依赖打入产物后，交付结构可以更精简：

```text
release/
├── server.cjs
├── sql/
├── .env.example
└── DEPLOY.md
```

客户配置运行环境后执行：

```bash
cd release
node server.cjs
```

是否真的不需要 `node_modules`，必须通过构建结果和目标环境测试确认。Node.js 内置模块由运行时提供，不会被打进 bundle；原生模块和额外资源可能仍需单独交付。

### 方式三：Docker 镜像

Docker 部署时，通常由开发方或 CI 使用源码构建镜像，交付的是最终镜像，不是构建阶段源码。

多阶段构建可以在第一阶段安装开发依赖并编译代码，在最终阶段只保留 Node.js 运行时、生产依赖和构建产物：

```dockerfile
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

第一阶段中的 `src` 不会自动出现在最终镜像中。最终镜像只包含最终阶段明确复制的内容。仍需检查 `dist` 中是否包含 source map。

镜像可以通过两种方式交付：

- 推送到客户能够访问的私有镜像仓库；
- 使用 `docker save` 导出 `.tar`，客户再用 `docker load` 导入。

离线导出示例：

```bash
docker save -o node-backend-1.0.0.tar node-backend:1.0.0
```

Docker 镜像也需要与客户服务器的操作系统和 CPU 架构匹配，必要时构建 `linux/amd64`、`linux/arm64` 等多平台镜像。

## 环境变量与数据库连接

数据库密码、令牌等运行配置不应写入 JS bundle 或 Docker 镜像。交付包只提供 `.env.example`，实际 `.env` 由部署方创建。

`dotenv` 默认读取：

```text
process.cwd()/.env
```

它读取的是进程启动时的当前工作目录，不是 `server.js` 所在目录。因此下面的结构：

```text
release/
├── .env
└── dist/
    └── server.js
```

应在 `release` 目录启动：

```bash
cd release
node dist/server.js
```

### Docker 中访问 MySQL

如果 Node.js 和 MySQL 分别运行在两个容器中，Node 容器中的 `127.0.0.1` 指向 Node 容器自身，不能代表 MySQL 容器。

推荐把两个容器加入同一个用户定义网络，并使用 MySQL 容器名作为地址：

```dotenv
DB_HOST=mysql-db
DB_PORT=3306
```

也可以把 MySQL 的 `3306` 发布到宿主机，再通过宿主机可访问地址连接；这种方式多绕一层网络，并依赖宿主机端口、防火墙和数据库账号权限。两个容器在同一 Docker 主机时，优先使用自定义网络和容器名。

## 进程托管与自动重启

开发阶段的热重载和生产环境的进程恢复是两件事。

### nodemon 或 tsx watch

适合开发阶段监听文件变化并自动重启服务，不建议作为生产环境进程管理方案。

### systemd

Linux 服务器可以用 systemd 管理服务，负责后台运行、开机启动、日志和异常退出后的重启：

```ini
[Unit]
Description=Node.js backend
After=network.target

[Service]
WorkingDirectory=/opt/node-backend
ExecStart=/usr/bin/node /opt/node-backend/dist/server.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

`WorkingDirectory` 还决定了 `dotenv` 默认查找 `.env` 的位置。

### PM2

PM2 是 Node.js 专用的进程管理器，支持进程状态、日志、异常重启和开机恢复：

```bash
pm2 start dist/server.js --name node-backend
pm2 startup
pm2 save
```

团队已经使用 PM2 时，这种方式比较方便；一般 Linux 服务也可以直接使用 systemd。

### Docker 重启策略

容器部署时通常使用 Docker 自身的重启策略，不需要在容器中再运行 nodemon 或 PM2：

```bash
docker run -d \
  --name node-backend \
  --restart unless-stopped \
  --env-file ./app.env \
  -p 3000:3000 \
  node-backend:1.0.0
```

自动重启只能恢复异常退出的进程，不能修复错误配置。例如数据库密码错误会让应用持续启动失败，应先修复配置，再依靠重启策略保证运行可靠性。

## 案例项目

相关示例位于 [`nodejs-typescript-build-and-deployment/`](./nodejs-typescript-build-and-deployment/)：

- [`node-backend-tsc-esbuild`](./nodejs-typescript-build-and-deployment/node-backend-tsc-esbuild/)：同一套源码分别使用 `tsc` 多文件编译和 esbuild 单文件打包，适合观察两种产物的区别；
- [`node-backend-bundler`](./nodejs-typescript-build-and-deployment/node-backend-bundler/)：使用 webpack 构建 Express + TypeScript + MySQL 服务，并展示依赖是否 external 的影响。

两个案例都提供 MySQL 建库、建表和模拟数据脚本。运行前应复制 `.env.example` 并填写本机或服务器配置，不要提交真实 `.env`。

## 参考资料

- [TypeScript Compiler Options](https://www.typescriptlang.org/docs/handbook/compiler-options.html)
- [esbuild TypeScript 支持](https://esbuild.github.io/content-types/)
- [webpack Externals](https://webpack.js.org/configuration/externals/)
- [npm ci](https://docs.npmjs.com/cli/commands/npm-ci/)
- [Docker 多阶段构建](https://docs.docker.com/get-started/docker-concepts/building-images/multi-stage-builds/)
- [Docker 重启策略](https://docs.docker.com/engine/containers/start-containers-automatically/)
- [PM2 Restart Strategies](https://pm2.keymetrics.io/docs/usage/restart-strategies/)
- [systemd.service](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html)
