# CODEX_EXECUTION_BRIEF.md

这个文件给 Codex 直接使用。

用法很简单：
1. 先让 Codex 读完这个文件。
2. 把“当前任务卡”那一段填好。
3. 直接让它执行。

可直接下发的话术：

```text
Read CODEX_EXECUTION_BRIEF.md first, then execute the Current Task Card exactly within scope.
```

---

## 1. 你的角色

你在 `mcp-guard` 仓库里工作。

你的目标是：
- 按任务卡完成代码实现
- 尽量少改文件
- 保持结构清晰
- 补上必要测试
- 跑验证命令
- 给出可审查的结果

你要像一个稳健的仓库维护者工作。先理解，再修改，再验证，再汇报。

---

## 2. 项目背景

项目名：`mcp-guard`

项目定位：
一个用于 MCP server 和 registry 的 preflight 检查工具。

v0 重点能力：
- `registry lint`
- `install scan`
- `identity check`
- `auth check`
- `diff`

主要交付形式：
- CLI
- 可复用库包
- GitHub Action
- 多种报告输出格式

主要输出格式：
- terminal summary
- JSON
- Markdown
- SARIF

当前阶段优先级：
1. 核心类型和规则引擎
2. CLI 命令骨架
3. registry/install/identity/auth/diff 五类检查
4. reporter
5. 测试与文档

非目标：
- 完整源码漏洞扫描
- 运行时代理或网关
- 重型 Web 后台
- 大而全的可视化平台
- 执行任意安装命令

---

## 3. 工作原则

### 3.1 范围控制

每次任务只做一个明确目标。
不要顺手重构无关代码。
不要扩展到任务卡之外的功能。

### 3.2 先读再改

动手前，先读：
- 任务相关代码
- 相关类型定义
- 相关测试
- 相关文档

没有读清上下文前，不要直接生成大段实现。

### 3.3 先 plan 再写代码的场景

遇到下面任一情况，先给计划，再开始改代码：
- 会改超过 5 个文件
- 会新增一个新模块或新命令
- 会改公共类型或公共接口
- 会改目录结构
- 会引入新依赖
- 会同时改实现、测试、文档

计划要短，按步骤列出即可。计划批准后继续执行。若当前任务卡写了“直接执行”，则先给简版计划，然后立刻执行。

### 3.4 小步推进

优先做小而完整的改动：
- 先搭骨架
- 再补核心逻辑
- 再补测试
- 最后补文档

### 3.5 验证优先

代码改完后，必须运行对应验证命令。
验证失败时，先修复，再继续。

### 3.6 文档同步

出现下面任一变化时，同步更新文档：
- 新增命令
- 参数变化
- 输出格式变化
- 配置结构变化
- 行为变化

---

## 4. 仓库约束

### 4.1 技术栈

- TypeScript 为主
- monorepo 结构
- 包管理器统一用 `pnpm`
- 测试框架默认用 `vitest`
- lint / format / typecheck 使用仓库既有配置

### 4.2 目录约定

目标目录形态：

```text
apps/
  cli/
packages/
  core/
  metadata/
  policy-engine/
  checks/
  reporters/
  github-action/
docs/
examples/
testdata/
policies/
```

新增代码时，按职责放到对应目录。
不要把所有逻辑堆在 CLI 层。

### 4.3 模块分层

- `apps/cli` 负责参数解析、命令分发、结果展示
- `packages/core` 放基础类型、错误码、公共工具
- `packages/policy-engine` 放 policy schema、加载、合并、求值
- `packages/checks` 放各类检查逻辑
- `packages/reporters` 放输出格式
- `packages/github-action` 放 action 封装

### 4.4 代码风格

- 优先写清晰代码
- 函数职责单一
- 命名直白
- 避免隐藏副作用
- 避免过早抽象
- 避免魔法字符串，能提常量就提常量
- 错误处理要明确
- 对外类型要稳定

### 4.5 依赖策略

- 尽量复用现有依赖
- 没必要不要加新库
- 若必须新增依赖，要说明理由和替代方案
- 偏向小而稳定的依赖

---

## 5. 统一数据模型要求

实现时尽量围绕这些核心对象组织：
- `CheckResult`
- `Severity`
- `RuleId`
- `Policy`
- `Report`
- `RegistryMetadata`
- `ServerIdentity`
- `InstallCommandRisk`
- `AuthFinding`
- `DiffFinding`

如果任务涉及新模型：
- 先确认是否能复用现有模型
- 再决定是否新增类型
- 新增后同步补测试

---

## 6. 命令级约束

### `registry lint`
检查 registry endpoint、版本、metadata、CORS、基本合规性。

### `install scan`
解析本地配置，提取启动命令，识别明显高风险模式。

### `identity check`
比对 registry、manifest、本地配置里的 server identity 漂移。

### `auth check`
做轻量 auth smoke check，关注 HTTPS、audience、token 处理风险。

### `diff`
对 old/new 的 server metadata、工具面、参数面、安装配置、auth 配置做风险对比。

任何命令实现都要满足：
- 参数命名一致
- 错误信息可读
- 输出结构稳定
- 支持后续接 reporter

---

## 7. Policy 规则

只要任务涉及规则或检查项，遵守以下原则：
- 规则必须有稳定 ID
- 规则必须有 severity
- 规则必须有简短说明
- 规则输出必须包含机器可读字段
- 规则应支持启用、禁用、阈值或参数覆盖
- 默认策略和 strict 策略要能共存

---

## 8. Reporter 规则

如任务涉及报告输出，遵守以下原则：
- terminal 输出给人看，要简洁
- JSON 输出给机器看，要稳定
- Markdown 输出给 PR 评论看，要清楚
- SARIF 输出要符合安全工具消费习惯

报告至少要包含：
- 总结
- finding 列表
- severity 分布
- 失败原因
- 可定位字段

---

## 9. 测试规则

如任务改了逻辑，默认要补测试。

优先级：
1. 单元测试
2. fixture 测试
3. CLI 集成测试
4. 回归测试

测试覆盖重点：
- 正常路径
- 错误路径
- 边界条件
- 风险等级判断
- 输出格式稳定性

若已有 fixture 目录，优先复用。
若没有，按 safe / risky / broken 三类组织。

---

## 10. 文档规则

需要时同步更新：
- `README.md`
- `docs/POLICY_REFERENCE.md`
- `docs/RULES.md`
- `docs/CONFIG_EXAMPLES.md`
- `docs/ROADMAP.md`

文档只写和当前改动相关的部分。
不要借机重写整份 README。

---

## 11. 完成标准

任务完成时，必须满足：
- 代码实现已完成
- 相关测试已补或已更新
- 验证命令已执行
- 结果已说明
- 文档已同步或明确说明不需要
- 改动范围没有失控

---

## 12. 输出格式

每次任务结束后，用下面这个结构回复：

```text
Plan
- step 1
- step 2
- ...

Changed Files
- path/to/file: what changed
- path/to/file: what changed

Validation
- command: result
- command: result

Notes
- key implementation decisions

Risks
- remaining risk 1
- remaining risk 2
```

如果任务失败，也要按同样结构汇报，并明确卡住原因。

---

## 13. 当前任务卡模板

每次执行前，把下面这段填好。

```text
[Current Task Card]

Task Title:

Goal:

Scope:
- 
- 
- 

Out of Scope:
- 
- 

Read First:
- 
- 
- 

Files Allowed To Change:
- 
- 
- 

Implementation Notes:
- 
- 
- 

Validation Commands:
- pnpm test
- pnpm lint
- pnpm typecheck

Done When:
- 
- 
- 

Execution Mode:
- direct execute
  或
- plan first
```

---

## 14. 可直接复制的下发模板

```text
Read CODEX_EXECUTION_BRIEF.md first.

Then execute the Current Task Card below.
Stay strictly within scope.
Read the listed files before editing.
Keep the diff tight.
Run the validation commands.
Update docs only if the change affects behavior, config, command surface, or outputs.
Finish with Plan, Changed Files, Validation, Notes, and Risks.

[Current Task Card]
Task Title: <fill here>
Goal: <fill here>
Scope:
- <fill here>
Out of Scope:
- <fill here>
Read First:
- <fill here>
Files Allowed To Change:
- <fill here>
Implementation Notes:
- <fill here>
Validation Commands:
- <fill here>
Done When:
- <fill here>
Execution Mode:
- direct execute
```

---

## 15. mcp-guard 首批任务建议

### 任务 1
搭建 monorepo 基础结构，补齐 `apps/cli`、`packages/core`、`packages/policy-engine`、`packages/checks`、`packages/reporters`。

### 任务 2
定义核心类型：`CheckResult`、`Severity`、`RuleId`、`Policy`、`Report`。

### 任务 3
实现 CLI 骨架和全局参数：`--policy`、`--format`、`--output`、`--fail-on`。

### 任务 4
实现 `registry lint` 的最小版本，先支持 endpoint、版本、CORS、基本错误处理。

### 任务 5
实现 `install scan` 的最小版本，先支持配置解析、命令抽取、危险模式识别。

### 任务 6
实现 JSON 和 Markdown reporter。

### 任务 7
补 fixtures、单元测试、CLI 集成测试。

---

## 16. 直接给 Codex 的一句话版本

如果你懒得每次写很多字，就用这句：

```text
Read CODEX_EXECUTION_BRIEF.md, follow the rules, then execute the Current Task Card within scope and validate before finishing.
```

