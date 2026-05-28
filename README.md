# ReCode Plus - 本地优先的算法复习与笔记系统

[English](./README_EN.md)

ReCode Plus 是一个面向个人使用的算法练习管理工具。它把题目笔记、当前代码、掌握度评分、间隔复习计划和刷题回放时间线放在同一个本地应用里，适合长期维护自己的算法题库。

项目当前以本地源码方式运行，数据默认存储在本机 SQLite 文件中。

## 功能概览

- **本地题库管理**：记录题号、标题、难度、标签、题目链接、笔记和当前代码。
- **间隔复习计划**：根据题目难度、掌握度评分和复习次数计算下一次复习时间。
- **每日复习队列**：自动列出今天需要复习的题目，并支持打分后更新 SRS 状态。
- **刷题回放时间线**：记录题目创建、代码保存、复习评分等事件，方便回看一道题的练习轨迹。
- **代码编辑与运行**：内置 Monaco Editor，支持 TypeScript、JavaScript、Python、Java、C++ 的本地执行。
- **Markdown 笔记**：支持 Markdown、代码高亮和 LaTeX 数学公式。
- **学习概览**：主页展示掌握度分布、待复习数量、本周新增题目和推荐复习题。
- **未来复习视图**：展示未来 30 天的复习任务分布。
- **本地数据可控**：所有数据保存在 `prisma/dev.db`，方便备份、迁移和自托管。

## 截图占位

> 截图占位：主页概览，展示今日待复习、掌握度分布和推荐复习题。

> 截图占位：题目列表，展示搜索、筛选、题目预览弹窗和刷题回放时间线。

> 截图占位：题目编辑页，展示代码编辑器、元信息侧栏、Markdown 笔记和时间线。

> 截图占位：每日复习页，展示复习卡片、评分按钮和题目预览。

> 截图占位：未来复习页，展示未来 30 天复习任务柱状图。

## 技术栈

- 框架：`Next.js 16`
- UI：`React 19`, `Tailwind CSS 4`, `Framer Motion`, `Radix UI`
- 数据库：`SQLite` + `Prisma`
- 编辑器：`Monaco Editor`
- 文档渲染：`React Markdown`, `KaTeX`, `rehype-highlight`
- 状态管理：`Zustand`

## 数据模型

核心数据由 Prisma 管理：

- `User`：本地用户与偏好设置
- `Problem`：题目元信息
- `Progress`：用户对题目的掌握度、复习状态和 SRS 参数
- `Submission`：当前代码记录。一个 `Progress` 最多一条当前代码，保存时更新，不保留代码历史副本
- `ReviewEvent`：时间线事件，例如题目创建、代码保存、复习评分

默认数据库文件：

```text
prisma/dev.db
```

## 快速开始

### 环境要求

- `Node.js` 20 或更高版本
- `npm`

### 自动启动

Windows：

```text
双击 start_windows.bat
```

Mac / Linux：

```bash
chmod +x start_mac.sh
./start_mac.sh
```

脚本会自动安装依赖、初始化数据库并启动开发服务。

### 手动启动

1. 安装依赖

```bash
npm install
```

2. 初始化数据库并生成 Prisma Client

```bash
npx prisma generate
npx prisma db push
```

3. 启动应用

```bash
npm run dev
```

然后访问：

```text
http://localhost:3000
```

首次进入时，如果数据库中没有用户，会自动跳转到 onboarding 页面。填写用户名、首选编程语言和界面语言后即可开始使用。

## 常用命令

```bash
npm run dev
```

启动开发服务。

```bash
npm run build
```

构建生产版本。

```bash
npm run lint
```

运行 ESLint。

```bash
npx tsc --noEmit
```

运行 TypeScript 类型检查。

```bash
npx prisma db push
```

把 `prisma/schema.prisma` 同步到本地 SQLite 数据库。

```bash
npx prisma studio
```

打开 Prisma Studio 查看或管理本地数据。

## 数据备份与迁移

备份时复制这个文件即可：

```text
prisma/dev.db
```

换电脑时，把 `dev.db` 放回新环境的 `prisma/` 目录，然后运行：

```bash
npm install
npx prisma generate
npm run dev
```

## 注意事项

- 这是本地优先应用，没有账号系统和云同步。
- `prisma/dev.db` 是个人数据文件，建议定期备份。
- 当前使用 `prisma db push` 维护本地数据库结构。如果多人协作或正式发布，建议改用标准 Prisma migration 流程。
- 本地代码执行依赖系统环境，例如 `node`、`python3`、`javac`、`g++`。缺少对应运行时会导致该语言执行失败。

## 致谢

感谢 [CoisiniIce/ReCode](https://github.com/CoisiniIce/ReCode)。本项目是在该项目基础上继续展开，并增添新的功能与调整后形成的版本。

## 开源协议

本项目使用 [MIT License](./LICENSE)。
