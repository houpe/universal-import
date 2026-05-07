# 万能导入 - 多模板自动导入下单系统

多模板自动识别与导入下单系统，支持 `.xlsx` / `.xls` 文件，智能匹配列映射，一键批量提交。

## 功能特性

- **智能识别** - 自动匹配 Excel 列名到系统字段，支持多种模板格式
- **模板记忆** - 相同结构文件自动复用上次映射，无需重复配置
- **手动映射** - 自动识别失败时支持手动调整列映射
- **实时校验** - 预览阶段全量展示错误（必填、格式、重复等），一次性标注行号+字段+原因
- **历史查重** - 预览时自动检查外部编码与数据库历史记录重复
- **在线编辑** - 预览表格支持逐单元格编辑、删除行、新增空行
- **批量提交** - 一键提交全部有效数据，实时进度展示
- **运单管理** - 分页浏览、按编码/收件人/日期筛选已导入运单
- **导出 Excel** - 预览数据支持导出为 xlsx 文件
- **温层管理** - 支持常温/冷藏/冷冻三种温层

## 技术栈

- **前端**: Next.js 16 (App Router) + React 19 + Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: Neon PostgreSQL (Serverless)
- **部署**: Vercel

## 快速开始

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入数据库连接字符串

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── orders/route.ts    # 运单 CRUD API + 批量查重
│   │   ├── parse/route.ts     # Excel 解析 API
│   │   └── export/route.ts    # Excel 导出 API
│   ├── import/page.tsx        # 导入页面
│   ├── preview/page.tsx       # 数据预览页面
│   ├── orders/page.tsx        # 运单列表页面
│   ├── layout.tsx             # 全局布局
│   └── globals.css            # 全局样式
├── components/
│   ├── Navbar.tsx             # 导航栏
│   ├── FileDropzone.tsx       # 文件上传拖拽区
│   ├── PreviewTable.tsx       # 数据预览表格（可编辑）
│   ├── ColumnMapper.tsx       # 列映射配置器
│   ├── ErrorSummary.tsx       # 错误摘要面板
│   ├── ProgressBar.tsx        # 进度条
│   └── Toast.tsx              # 全局提示
└── lib/
    ├── db.ts                  # 数据库连接与表初始化
    ├── field-mapper.ts        # 字段映射规则
    ├── validator.ts           # 数据校验逻辑
    ├── excel-parser-client.ts # 前端 Excel 解析
    ├── template-memory.ts     # 模板映射记忆
    └── types.ts               # TypeScript 类型定义
```

## 支持的字段

| 字段 | 必填 | 说明 |
|------|------|------|
| 外部编码 | 否 | 唯一标识，重复会拦截 |
| 发件人姓名 | 是 | |
| 发件人电话 | 是 | 11位手机号 |
| 发件人地址 | 是 | |
| 收件人姓名 | 是 | |
| 收件人电话 | 是 | 11位手机号 |
| 收件人地址 | 是 | |
| 重量(kg) | 是 | 正数 |
| 件数 | 是 | 正整数 |
| 温层 | 是 | 常温/冷藏/冷冻 |
| 备注 | 否 | |

## 部署

项目通过 Vercel 自动部署，关联 GitHub 仓库后 push 即自动构建上线。

数据库使用 [Neon](https://neon.tech) Serverless PostgreSQL，在 Vercel 中集成即可自动配置 `DATABASE_URL` 环境变量。
