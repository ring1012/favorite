# EdgeOne Pages Next.js SSR 与 ISR 模板

一个专注于 SSR 和 ISR 渲染策略的 Next.js 15 / EdgeOne Pages 演示项目。

## 保留功能

- **SSR**（`/ssr`）：每次请求都在服务端实时渲染。
- **ISR**（`/isr`）：先生成静态页面，再按设定周期增量更新。
- **Edge KV API**（`/hello-edge`）：通过 Edge Function 递增 KV 计数器。部署前请将 KV 命名空间以变量名 `fkv` 绑定到项目。
- **导航页**（`/isr`）：ISR 缓存 60 秒；匿名用户读取 `admin` 导航，登录用户读取并编辑自己的导航。

## KV 数据结构

所有数据均存储在绑定变量 `fkv` 中：

- `navigation:data:<username>`：`{ version, menus, sites }`。菜单采用 `{ id, name, parentId }`，`parentId` 仅允许为空或指向一级菜单；站点采用 `{ id, menuId, name, description, url, iconUrl }`。
- `navigation:user:<username>`：该用户密码的 SHA-256 hex 值。
- `navigation:session:<token>`：用户名与过期时间；浏览器仅保存随机 token 的 HttpOnly Cookie（183 天）。

Edge Function API 包含 `/api/navigation`（读取与编辑）、`/api/auth/register`、`/api/auth/login` 和 `/api/auth/logout`。创建或修改站点 URL 时，函数会读取页面 HTML 的 `link[rel~="icon"]` 并保存图标 URL；相对路径会按站点 host 解析，绝对路径保持不变。

## 本地开发

```bash
npm install
edgeone pages dev
```

## 构建

```bash
edgeone pages build
```
