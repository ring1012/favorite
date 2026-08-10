# Orbit 网址导航 - EdgeOne Pages Next.js 模板

基于 **Next.js 15** 与 **Tencent EdgeOne Pages** 打造的高性能现代网址导航系统。

## 架构与缓存策略

- **主页 (`/`)**：非缓存页面（动态渲染 Dynamic Rendering），每次请求实时响应。
- **用户导航页 (`/nav/[user]`)**：标准的 ISR（增量静态生成）静态页面，缓存周期为 60 秒（`revalidate = 60`）。
- **ISR 预加载数据接口**：由于 ISR 页面需要在服务端提前渲染加载用户数据，`GET /api/navigation?username=<username>` 接口未加强鉴权保护，可直接获取公开导航数据。
- **编辑操作安全保护**：导航及分类的任何增删改操作（`POST /api/navigation`）均需经过 JWT 会话令牌严格校验。登录成功后，前端将令牌保存在 **localStorage**（键 `navigation_session`），并通过统一的请求拦截层把令牌放入 `x-n-auth` 请求头提交给后端，后端仅校验该 Header，不再使用 Cookie。
- **ISR 缓存自动刷新**：用户在编辑保存导航时，后端会触发 `revalidatePath('/nav/' + user)` 立即清除对应 `/nav/[user]` 路径的 ISR 静态缓存。

## 环境变量配置

部署与运行需设置以下两个环境变量：

| 变量名 | 说明 | 示例 |
| --- | --- | --- |
| `JWT_SECRET` | 用于 JWT 签名与校验的密钥（**必须不少于 32 位字符**）。 | `your_super_secret_jwt_key_at_least_32_chars` |
| `NAV_HOST` | 服务端 ISR 数据 Fetch 所需的主机路径（按绑定域名设定）。 | `http://localhost:8088` |

## KV 数据结构 (`fkv`)

项目所有持久化数据存储于 Edge KV 绑定变量 `fkv` 中：

- `navigation:data:<username>`：存储 `{ version, menus, sites }` 数据。菜单支持最多 2 级树状结构；站点字段包含 `{ id, menuId, name, description, url, iconUrl }`。
- `navigation:favorites:<username>`：存储用户的收藏网址 URL 数组。
- `navigation:user:<username>`：存储用户密码的 SHA-256 哈希字符串。

## 本地开发与构建

### 本地开发

```bash
npm install
edgeone pages dev
```

### 项目构建

```bash
edgeone pages build
```
