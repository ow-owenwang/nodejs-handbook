# node-backend-bundler

一个使用 Express + TypeScript + MySQL 的后端示例，通过 webpack 构建 Node.js 服务端代码。

## 环境要求

- Node.js 20 或更新版本
- MySQL 8

## 初始化数据库

在项目目录执行（将 `root` 改为有建库权限的 MySQL 用户）：

```bash
mysql -u root -p < sql/init.sql
```

脚本会创建 `node_backend_bundler` 数据库、`products` 表，并插入三条模拟商品数据。重复执行会更新同名商品的价格和库存，不会重复添加。

## 配置与运行

```bash
npm install
cp .env.example .env
# 修改 .env 中的 DB_USER 和 DB_PASSWORD 等连接信息
npm run dev
```

生产构建与运行：

```bash
npm run typecheck
npm run build
npm start
```

webpack 输出 `dist/server.js`。Express、mysql2 等 npm 包作为运行时依赖保留在 `node_modules`；部署时需要同时安装生产依赖，并提供 `.env` 或等价环境变量。

## 查询接口

```bash
curl http://localhost:3000/api/products
```

响应示例（`price` 是字符串，以保留 DECIMAL 精度）：

```json
{
  "data": [
    { "id": 1, "name": "机械键盘", "price": "299.00", "stock": 25, "created_at": "2026-10-29T00:00:00.000Z" }
  ]
}
```

数据库不可用时，服务启动失败并输出错误；查询失败时，接口返回 HTTP 500。
