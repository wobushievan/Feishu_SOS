# UI 设计指南

> **设计类型**: App 设计（应用架构设计）
> **确认检查**: 本指南适用于可交互的应用/网站/工具。

## 1. Design Archetype (设计原型)

### 1.1 内容理解

- **目标用户**: 
  - **管理员/HR**: 在紧急或日常场景下需要快速掌控全局，心理状态可能焦虑或紧迫，需要极高的信息获取效率。
  - **员工**: 在非办公场景（移动端/Lark内）被触达，需要零思考成本完成反馈，心理状态可能是困惑或匆忙。
- **核心目的**: **消除不确定性**。将模糊的安全状态转化为清晰的统计数据，并在紧急情况下触发快速行动。
- **期望情绪**: 
  - **管理侧**: 掌控感 (Control)、冷静 (Calm)、高效 (Efficient)。
  - **员工侧**: 清晰 (Clear)、安心 (Reassured)、无摩擦 (Frictionless)。
- **需避免的感受**: 
  - 混乱的信息层级（找不到未回复人）。
  - 冰冷的技术感（加剧紧急情况的焦虑）。
  - 复杂的操作路径（员工反馈受阻）。

### 1.2 设计语言

- **Aesthetic Direction**: **「功能性人文主义」(Functional Humanism)**。在保持 B 端工具高效理性的基础上，注入强烈的「生命关怀」色彩。通过高对比度的状态色和清晰的排版，让数据不仅是数字，更是具体的人的状态。
- **Visual Signature**: 
  1. **语义化色彩主导**: 状态颜色（安全绿、求助红、缺席灰）是视觉第一要素，而非品牌色。
  2. **大字号数据卡片**: 统计数字采用超大字重，作为页面的视觉锚点。
  3. **胶囊式交互**: 按钮和标签统一使用 Pill Shape，降低认知锐度，提升亲和力。
  4. **Lark 原生融合**: 界面风格与 Lark 设计规范（Feishu Design）保持高度一致，减少上下文切换的认知负荷。
- **Emotional Tone**: **冷静而敏锐**。像一位专业的应急指挥官，既不被情绪左右，又能瞬间捕捉关键异常。
- **Design Style**: **Rounded 圆润几何** — 选择此风格是因为圆角和柔和的阴影能缓解紧急情况下的紧张感，同时 Pill 形状的按钮符合移动端触控习惯，适合 Lark 内嵌场景。
- **Application Type**: **Admin/SaaS (管理后台) + Mobile Tool (员工反馈页)**。管理侧重重信息密度和筛选效率，员工侧重单任务流和极速反馈。

## 2. Design Principles (设计理念)

1. **Status First (状态优先)**: 在任何视图中，人的安全状态（安全/求助/未回复）必须比姓名、部门等元数据更先被感知。
2. **Zero Friction for Feedback (反馈零摩擦)**: 员工反馈页去除所有干扰元素，只保留「事件说明」和「三个按钮」，确保 3 秒内完成操作。
3. **Exception Highlighting (异常高亮)**: 正常状态（安全）低调呈现，异常状态（需要帮助、未回复）必须通过高饱和色彩和视觉权重强行吸引注意力。
4. **Contextual Consistency (语境一致性)**: 管理后台保持专业克制，员工页保持轻量亲和，但两者共享同一套色彩语义系统，确保认知连贯。

## 3. Color System (色彩系统)

> **配色设计理由**: 基于「消除不确定性」的目标，采用中性灰蓝作为基底（理性、冷静），利用高饱和度的语义色（绿/红/橙）直接映射业务状态。避免使用纯黑，减轻视觉压迫感。

### 3.1 主题颜色

| 角色               | CSS 变量               | Tailwind Class            | HSL 值             | 设计说明                 |
| ------------------ | ---------------------- | ------------------------- | ------------------ | ------------------------ |
| bg                 | `--background`         | `bg-background`           | hsl(210 20% 98%)   | 极浅灰蓝，营造冷静专业的办公氛围 |
| card               | `--card`               | `bg-card`                 | hsl(0 0% 100%)     | 纯白卡片，与背景形成微弱层级 |
| text               | `--foreground`         | `text-foreground`         | hsl(215 25% 20%)   | 深灰蓝，比纯黑柔和，适合长文阅读 |
| textMuted          | `--muted-foreground`   | `text-muted-foreground`   | hsl(215 10% 55%)   | 用于次要信息、时间戳、部门名称 |
| primary            | `--primary`            | `bg-primary`              | hsl(217 91% 60%)   | 科技蓝，仅用于「新建事件」、「导出」等非状态类主操作 |
| primary-foreground | `--primary-foreground` | `text-primary-foreground` | hsl(0 0% 100%)     | 主按钮文字颜色           |
| accent             | `--accent`             | `bg-accent`               | hsl(215 20% 94%)   | 极浅蓝灰，用于 Hover 态、选中态背景 |
| accent-foreground  | `--accent-foreground`  | `text-accent-foreground`  | hsl(217 91% 60%)   | Accent 区域上的文字颜色    |
| border             | `--border`             | `border-border`           | hsl(215 20% 88%)   | 细边框，界定卡片和列表边界 |

### 3.2 Sidebar 颜色（仅当使用 Sidebar 导航时定义）

> **定义时机**: 管理后台采用 Sidebar 布局以容纳多级功能。

| 角色                       | CSS 变量                       | Tailwind Class                    | HSL 值             | 设计说明                         |
| -------------------------- | ------------------------------ | --------------------------------- | ------------------ | -------------------------------- |
| sidebar                    | `--sidebar`                    | `bg-sidebar`                      | hsl(215 25% 98%)   | 略深于背景，区分导航区与内容区 |
| sidebar-foreground         | `--sidebar-foreground`         | `text-sidebar-foreground`         | hsl(215 25% 35%)   | 导航文字，保证清晰可读         |
| sidebar-primary            | `--sidebar-primary`            | `bg-sidebar-primary`              | hsl(217 91% 60%)   | 当前激活菜单项的背景色         |
| sidebar-primary-foreground | `--sidebar-primary-foreground` | `text-sidebar-primary-foreground` | hsl(0 0% 100%)     | 激活态文字                     |
| sidebar-accent             | `--sidebar-accent`             | `bg-sidebar-accent`               | hsl(215 20% 92%)   | 菜单项 Hover 背景                |
| sidebar-accent-foreground  | `--sidebar-accent-foreground`  | `text-sidebar-accent-foreground`  | hsl(217 91% 60%)   | Hover 文字                       |
| sidebar-border             | `--sidebar-border`             | `border-sidebar-border`           | hsl(215 20% 88%)   | 右侧分隔线                     |
| sidebar-ring               | `--sidebar-ring`               | `ring-sidebar-ring`               | hsl(217 91% 60%)   | 聚焦环                         |

### 3.3 Topbar/Header 设计策略

**背景策略**: 
- 管理后台 Header 使用 `bg-card` + `border-b`，保持简洁。
- 员工反馈页（嵌入 Lark）隐藏原生 Header，使用页面内部标题区。

**文字与图标**: 
- 默认态 `text-foreground`，激活态 `text-primary` + 加粗。
- 紧急状态提示（如“进行中”）使用橙色徽章。

**边框与分隔**: 
- 底部 `border-border` 细线，高度 1px。

### 3.4 语义颜色 (Semantic Colors)

> **关键设计**: 这是本系统的核心。状态色不仅仅是装饰，而是信息的载体。

| 用途        | CSS 变量 (示例)       | HSL 值              | 应用场景                                     | 对比度策略 |
| ----------- | --------------------- | ------------------- | -------------------------------------------- | ---------- |
| **安全 (Safe)** | `--status-safe-bg`    | hsl(142 70% 95%)    | 「我安全」按钮背景、统计卡片背景、标签底色   | 文字用深绿 hsl(142 70% 20%) |
| **求助 (Help)** | `--status-help-bg`    | hsl(0 85% 95%)      | 「我需要帮助」按钮背景、高危人员高亮行背景   | 文字用深红 hsl(0 85% 25%) |
| **缺席 (Away)** | `--status-away-bg`    | hsl(35 90% 95%)     | 「不在本地」按钮背景、相关统计卡片           | 文字用深橙 hsl(35 90% 25%) |
| **未回复 (No Response)** | `--status-none-bg`    | hsl(215 20% 90%)    | 未回复名单默认背景、灰色标签                 | 文字用深灰 hsl(215 20% 30%) |
| **紧急 (Urgent)** | `--status-urgent-text`| hsl(0 85% 45%)      | 截止时间临近提示、紧急事件标识               | 直接用作文字色 |

## 4. Typography (字体排版)

- **Heading**: `Inter`, `system-ui`, `-apple-system`, sans-serif. (数字显示优异，适合数据看板)
- **Body**: `Inter`, `system-ui`, `-apple-system`, sans-serif.
- **字体导入**: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`
- **排版策略**: 
  - **统计数据**: 使用 `text-4xl font-bold tracking-tight`，强调数字本身。
  - **列表标题**: `text-base font-semibold`，确保扫描速度。
  - **辅助信息**: `text-sm text-muted-foreground`，弱化非关键信息。

## 5. Layout Strategy (布局策略)

### 5.1 结构方向

**导航策略**: 
- **管理后台**: 采用 **Sidebar 布局**。左侧固定导航（事件列表、创建入口、设置），右侧内容区。原因：功能模块清晰（列表 vs 详情 vs 创建），需要持久导航以便在不同事件间切换。
- **员工反馈页**: **无导航 (None)**。全屏单页应用，聚焦当前事件，避免用户迷失。

**页面架构特征**: 
- **Dashboard (事件详情)**: 采用「顶部摘要 + 下部明细」结构。顶部为 6 个统计卡片网格（响应式），下方为可筛选的员工列表。
- **List (事件列表)**: 标准表格布局，右侧固定「操作」列，支持高密度展示。

### 5.2 响应式原则

**断点策略**: 
- **Desktop (>1024px)**: 侧边栏展开，统计卡片 6 列或 3 列并排，列表全宽展示。
- **Tablet/Mobile (<1024px)**: 侧边栏折叠为图标或抽屉，统计卡片转为 2 列或 1 列堆叠，列表卡片化展示（姓名在上，状态在下）。

**内容密度**: 
- 管理侧默认紧凑 (`gap-4`, `p-4`) 以容纳更多数据。
- 员工侧宽松 (`gap-6`, `p-8`) 增大点击热区，防止误触。

## 6. Visual Language (视觉语言)

**形态特征**: 
- **圆润几何 (Rounded Geometry)**: 
  - 按钮、输入框、标签全部使用 `rounded-full` (Pill shape)，传达友好和无攻击性。
  - 卡片使用 `rounded-xl` (12px)，柔和不生硬。
  - 列表项使用 `rounded-lg`，鼠标 Hover 时轻微上浮。

**装饰策略**: 
- **极简主义**: 去除所有无意义的装饰线条和背景图。
- **色彩即装饰**: 利用语义色块（如状态条、彩色数字）作为视觉焦点，代替图标装饰。
- **微投影**: 卡片使用 `shadow-sm`，Hover 时使用 `shadow-md`，营造轻盈的悬浮感。

**动效原则**: 
- **即时反馈**: 按钮点击后立即改变状态（无需等待接口返回再变， optimistic UI），加载时显示骨架屏。
- **平滑过渡**: 状态切换（如筛选器变化）使用 `transition-all duration-200`。
- **强调动画**: 当有「需要帮助」的新反馈进入时，对应列表行可添加轻微的脉冲动画 (`animate-pulse` once) 引起注意。

**可及性保障**: 
- 语义色背景上的文字必须手动指定深色变体，确保对比度 > 4.5:1（例如浅绿背景配深绿文字，而非白色文字）。
- 紧急状态下，红色元素不依赖颜色唯一识别，辅以图标或文字标签。

## 7. Component Principles (组件原则)

**状态完整性**: 
- **Button**: Default (实心/描边), Hover (亮度微调/阴影增加), Active (缩放 0.98), Disabled (透明度 50%, 禁止指针), Loading (Spinner 替代文字)。
- **Status Badge**: 必须包含 Icon + Text，背景色与文字色严格对应语义系统。
- **Input**: Focus 态必须有 `ring-2 ring-primary ring-offset-2`，明确当前输入位置。

**层级清晰**: 
- **Primary Button**: 仅用于「新建事件」、「提醒未回复」、「导出」等改变系统状态的操作。填充色 `bg-primary`。
- **Secondary Button**: 用于「筛选」、「取消」。描边或浅色背景 `bg-accent`。
- **Danger Button**: 仅在涉及高风险操作（如删除事件，若有）时使用红色，本系统主要是「提醒」，使用 Primary 即可，但在「需要帮助」的高亮行中，操作按钮应更显著。

**一致性**: 
- 所有「状态」相关的展示（统计卡、列表标签、按钮）必须复用同一套 HSL 色值，严禁混用不同深浅的红/绿。

## 8. Design Signature (设计签名)

**核心识别特征**: 
1. **「生命体征」统计卡**: 顶部的 6 个统计卡片不仅仅是数字，每个卡片都有与其状态对应的浅色背景（如「需要帮助」卡片整体淡红底），让管理者一眼看到红色的区域。
2. **高亮危险行**: 员工列表中，状态为「需要帮助」的行，整行背景铺设极淡的红色 (`bg-red-50`)，并配有醒目的红色边框或图标，在视觉上「跳」出来。
3. **Lark 原生感**: 整体色调和圆角模仿 Lark 原生应用，让员工感觉这是在飞书里自然发生的工作流，而非跳转到了一个陌生的外部系统。

**应避免**: 
- ❌ 避免使用深色模式（除非用户强制要求），明亮模式更符合日间办公和紧急处理的清晰需求。
- ❌ 避免在员工反馈页放置任何「返回列表」或「其他功能」的链接，那是死胡同，只需反馈成功后的关闭按钮。
- ❌ 避免使用纯黑 (`#000`) 文字，保持深灰蓝的柔和感，减少长时间盯屏的疲劳。