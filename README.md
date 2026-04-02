# Web3 Daily 中文热点看板

一个基于 **Next.js** 构建的 Web3 每日热点可视化项目。  
页面以 **中文内容优先** 为原则，只展示中文摘要，界面尽量简洁，适合日常浏览和公开展示。

项目数据来自 `daily-news` 提供的上游接口，通过 **Next.js 服务端代理** 获取，避免浏览器直接请求接口时出现跨域问题。

---

## 功能特点

- 只展示中文内容，减少中英文混杂带来的干扰
- 按分类、子分类浏览热点新闻
- 支持关键词搜索中文内容
- 每天早上 **08:10** 自动刷新
- 支持手动刷新
- 上游数据生成中时自动重试
- 使用 Next.js API Route 代理上游接口，适合部署到 Vercel

---

## 技术栈

- [Next.js](https://nextjs.org)
- React
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React

---

## 项目结构

```bash
app/
├── api/
│   └── daily-news/
│       └── route.ts      # 服务端代理接口
├── page.tsx              # 前端主页面
public/
```

# Web3 Daily 中文热点看板

一个基于 **Next.js** 构建的 Web3 每日热点可视化项目。  
页面以 **中文内容优先** 为原则，只展示中文摘要，界面尽量简洁，适合日常浏览和公开展示。

项目数据来自 `daily-news` 提供的上游接口，通过 **Next.js 服务端代理** 获取，避免浏览器直接请求接口时出现跨域问题。

---

## 功能特点

- 只展示中文内容，减少中英文混杂带来的干扰
- 按分类、子分类浏览热点新闻
- 支持关键词搜索中文内容
- 每天早上 **08:10** 自动刷新
- 支持手动刷新
- 上游数据生成中时自动重试
- 使用 Next.js API Route 代理上游接口，适合部署到 Vercel

---

## 技术栈

- [Next.js](https://nextjs.org)
- React
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React

---

## 项目结构

```bash
app/
├── api/
│   └── daily-news/
│       └── route.ts      # 服务端代理接口
├── page.tsx              # 前端主页面
public/
```

## 本地运行

先安装依赖：

```
npm install
```

启动开发环境：

```
npm run dev
```

如果 3000 端口被占用，可以改成 3010：

```
npm run dev -- -p 3010
```

打开浏览器访问：

```
http://localhost:3010
```

------

## 环境变量

项目支持通过环境变量配置上游接口地址。

你可以在 `app/api/daily-news/route.ts` 中这样写：

```
const API_BASE = process.env.DAILY_NEWS_API_BASE || "https://ai.6551.io";
```

然后在本地新建 `.env.local`：

```
DAILY_NEWS_API_BASE=https://ai.6551.io
```

如果你没有配置环境变量，也会自动回退到默认地址：

```
https://ai.6551.io
```

------

## 服务端代理说明

为了避免前端浏览器直接请求上游接口时出现跨域问题，项目没有在 `app/page.tsx` 中直接请求第三方 API，而是通过 Next.js 的服务端路由进行代理。

代理文件位置：

```
app/api/daily-news/route.ts
```

目前代理两个接口：

- `GET /api/daily-news?type=categories`
- `GET /api/daily-news?type=hot&category=xxx&subcategory=xxx`

这样前端只请求本站接口，部署到 Vercel 后也更稳定。

------

## 页面说明

主页面文件：

```
app/page.tsx
```

当前页面版本已经做了这些优化：

- 只保留中文摘要
- 不显示英文标题
- 自动清理摘要中的 `<br />`
- 只展示来源和发布时间
- 保留分类切换、搜索、自动刷新、重试提示

------

## GitHub 首次上传

如果这是你第一次把项目上传到 GitHub，可以在项目根目录执行：

```
git init
git add .
git commit -m "init: first commit"
git branch -M main
git remote add origin https://github.com/x/x.git
git push -u origin main
```

上传前可以先检查当前会提交哪些文件：

```
git status
```

------

## `.gitignore`

本项目建议忽略以下内容：

- `node_modules`
- `.next`
- `.env*`
- `.vercel`
- 日志文件
- 系统缓存文件

如果你是通过 `create-next-app` 创建项目，通常默认已经带好了 `.gitignore`，可以直接使用。

------

## 部署到 Vercel

这个项目可以直接部署到 **GitHub + Vercel**。

部署流程：

1. 把项目推送到 GitHub
2. 登录 Vercel
3. 导入 GitHub 仓库
4. Framework Preset 选择 Next.js（一般会自动识别）
5. 点击 Deploy

如果你使用了环境变量，需要在 Vercel 项目设置中添加：

- `DAILY_NEWS_API_BASE=https://ai.6551.io`

------

## 上游数据说明

本项目依赖上游新闻服务。
 当上游接口返回“数据正在生成中，请稍后访问”时，页面会自动重试并给出状态提示。

因此在某些时间点，页面可能短暂显示：

- 数据生成中
- 当前分类暂无中文内容
- 分类数据为空

这通常不是前端代码报错，而是上游接口当时没有可用数据。

------

## 可继续优化的方向

后续可以继续扩展：

- 增加首页推荐分类
- 增加“查看原文”按钮
- 增加中文日期格式优化
- 增加缓存与请求频率控制
- 增加夜间模式
- 增加移动端阅读优化

------

## License

本项目仅用于学习、演示与个人展示。
 如需用于正式商业用途，请自行确认上游数据接口和内容的授权情况。
