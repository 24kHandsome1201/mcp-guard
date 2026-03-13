# CODEX_TASK_CARDS_PACK_01.md

这份文档给 `mcp-guard` 项目用。

用途很简单：
1. 先让 Codex 读取 `CODEX_EXECUTION_BRIEF.md`。
2. 再从下面挑一张任务卡直接下发。
3. 严格按顺序执行，前一张过了再做下一张。

建议固定下发话术：

```text
Read CODEX_EXECUTION_BRIEF.md first.
Then execute the Current Task Card below exactly within scope.
Do not expand scope.
Run the listed validation commands.
Finish with Plan, Changed Files, Validation, Notes, and Risks.
```

建议执行顺序：
1. 仓库初始化
2. 核心类型
3. policy 引擎
4. reporter 层
5. CLI 骨架
6. registry lint
7. install scan
8. identity check
9. auth check
10. diff

补充约束：
- 每次只发一张任务卡
- 上一张未通过，不要做下一张
- 若实际仓库文件名与任务卡略有不同，以仓库现状为准，但范围不要扩散
- 若命令名未配置完成，可以先补最小可运行命令，再执行剩余验证

---

## Task Card 01

```text
[Current Task Card]
Task Title: Bootstrap the mcp-guard monorepo and base toolchain

Goal:
搭建最小可工作的 monorepo 仓库骨架，统一开发命令和基础工程配置，为后续命令实现提供稳定底座。

Scope:
- 初始化根目录 package 配置与 workspace 配置
- 建立 apps/cli 与 packages/core、policy-engine、checks、reporters 的基础目录和占位入口
- 建立 TypeScript、Vitest、基础 lint 和 format 配置
- 提供最小 build、test、typecheck、lint 命令
- 建立 docs、examples、policies、testdata 目录

Out of Scope:
- 任何具体检查逻辑
- 任何真实的 registry、install、auth、diff 实现
- GitHub Action

Read First:
- CODEX_EXECUTION_BRIEF.md
- package.json if it already exists
- any existing tsconfig / eslint / prettier / vitest config files

Files Allowed To Change:
- package.json
- pnpm-workspace.yaml
- tsconfig*.json
- vitest.config.*
- eslint/prettier related config files
- apps/cli/**
- packages/core/**
- packages/policy-engine/**
- packages/checks/**
- packages/reporters/**
- docs/**
- examples/**
- policies/**
- testdata/**
- .gitignore

Implementation Notes:
- 保持配置尽量小，优先能跑通
- 目录下先放占位导出与 README 或 index 文件即可
- 根命令尽量统一成 pnpm -w build / test / typecheck / lint
- 若某些工具链太重，可先给最小版本，后续任务再补

Validation Commands:
- pnpm install
- pnpm -w typecheck
- pnpm -w test
- pnpm -w lint

Done When:
- monorepo 结构已建立
- 根级开发命令可执行
- 各核心包都有最小入口文件
- 测试框架可运行并通过最小示例
- 没有引入与当前阶段无关的复杂依赖

Execution Mode:
- plan first
```

---

## Task Card 02

```text
[Current Task Card]
Task Title: Define shared core types, error model, and exit codes

Goal:
在 packages/core 中定义后续所有检查与输出要共用的核心类型，确保模型稳定、命名统一、错误处理可复用。

Scope:
- 定义 Severity、RuleId、CheckResult、Report、Policy 等核心类型
- 定义错误码和 CLI 退出码模型
- 定义基础结果聚合与统计辅助函数
- 为核心类型补单元测试

Out of Scope:
- 具体命令实现
- 具体 reporter 渲染逻辑
- policy 解析与加载逻辑

Read First:
- CODEX_EXECUTION_BRIEF.md
- packages/core/**
- apps/cli/** if present

Files Allowed To Change:
- packages/core/**
- testdata/** if needed for core tests
- package.json if script wiring is required

Implementation Notes:
- 类型命名保持直白
- 保证结果结构兼容人类输出和机器输出
- 退出码要能支持 success、warning threshold exceeded、error 这类常见场景
- 尽量避免后续会频繁破坏兼容性的字段设计

Validation Commands:
- pnpm -w typecheck
- pnpm -w test
- pnpm -w lint

Done When:
- core 类型集中定义完成
- 基础聚合函数可用
- 错误码与退出码清晰可复用
- 单元测试覆盖正常路径和边界路径

Execution Mode:
- direct execute
```

---

## Task Card 03

```text
[Current Task Card]
Task Title: Implement the policy engine skeleton and YAML policy loading

Goal:
建立最小可用的 policy 引擎，让后续所有检查项都能按统一策略启用、禁用和覆盖参数。

Scope:
- 定义 policy schema
- 支持从 YAML 加载 policy
- 支持默认 policy 与自定义 policy 合并
- 支持按 rule id 开关规则与 severity 覆盖
- 补核心单元测试
- 准备 base 和 strict 两份示例 policy

Out of Scope:
- 具体检查规则的业务逻辑
- CLI 参数解析
- reporter 输出

Read First:
- CODEX_EXECUTION_BRIEF.md
- packages/core/**
- packages/policy-engine/**
- policies/**

Files Allowed To Change:
- packages/policy-engine/**
- packages/core/** if shared types need small additions
- policies/**
- tests related files under current repo structure

Implementation Notes:
- schema 要偏稳，先满足 v0 需要
- 合并规则要清楚，后加载覆盖先加载
- 对非法 policy 给出可读错误
- 不要为了 schema 引入过重依赖，能轻量就轻量

Validation Commands:
- pnpm -w typecheck
- pnpm -w test
- pnpm -w lint

Done When:
- policy 可从 YAML 读入
- 默认 policy 与自定义 policy 可合并
- 至少支持规则开关和 severity 覆盖
- 示例 policy 文件可被测试消费

Execution Mode:
- plan first
```

---

## Task Card 04

```text
[Current Task Card]
Task Title: Build the reporter layer for terminal, JSON, Markdown, and SARIF

Goal:
建立统一 reporter 层，让所有检查结果都能稳定输出到终端、JSON、Markdown 和 SARIF。

Scope:
- 设计 reporter 接口
- 实现 terminal summary reporter
- 实现 JSON reporter
- 实现 Markdown reporter
- 实现最小可用的 SARIF reporter
- 为输出稳定性补测试或 snapshot

Out of Scope:
- CLI 命令参数解析
- 具体检查逻辑
- GitHub Action

Read First:
- CODEX_EXECUTION_BRIEF.md
- packages/core/**
- packages/reporters/**
- packages/policy-engine/** if needed

Files Allowed To Change:
- packages/reporters/**
- packages/core/** for small shared type additions
- tests and snapshots under current repo structure

Implementation Notes:
- terminal 输出给人看，保持短和清楚
- JSON 字段要稳定，方便后续 CI 消费
- Markdown 以 PR 评论可读性优先
- SARIF 先做最小版本，只要结构正确、字段清楚即可

Validation Commands:
- pnpm -w typecheck
- pnpm -w test
- pnpm -w lint

Done When:
- 四种 reporter 都能消费统一 Report 结构
- 输出测试能稳定通过
- 没有把格式逻辑散落到 CLI 层

Execution Mode:
- direct execute
```

---

## Task Card 05

```text
[Current Task Card]
Task Title: Create the CLI shell, command routing, and global flags

Goal:
搭建 CLI 外壳，打通命令路由、全局参数、输出格式选择和退出码处理，为后续五个命令接入做好接口。

Scope:
- 选择并接入轻量 CLI 参数库，若现有项目已有方案则复用
- 建立命令入口与子命令路由
- 支持全局参数：--policy、--format、--output、--fail-on、--quiet
- 打通 policy 加载、reporter 选择、退出码映射
- 先为五个命令放占位处理逻辑
- 补 CLI 集成测试

Out of Scope:
- 五个命令的真实业务检查逻辑
- GitHub Action
- 远程请求细节

Read First:
- CODEX_EXECUTION_BRIEF.md
- apps/cli/**
- packages/core/**
- packages/policy-engine/**
- packages/reporters/**

Files Allowed To Change:
- apps/cli/**
- packages/core/** for small CLI-facing additions
- packages/policy-engine/** if wiring needs tiny adjustments
- packages/reporters/** if wiring needs tiny adjustments
- tests related to CLI

Implementation Notes:
- 参数命名尽量长期稳定
- 命令出错时，错误信息要可读
- 占位命令也要返回统一结构，避免后续反复改接口
- CLI 层只做解析与调度，不堆业务逻辑

Validation Commands:
- pnpm -w typecheck
- pnpm -w test
- pnpm -w lint
- pnpm exec <your-cli-name> --help

Done When:
- CLI 主入口可运行
- 五个子命令已可见
- 全局参数已接通
- reporter 和退出码映射已打通
- CLI 集成测试覆盖 help 和基础参数路径

Execution Mode:
- plan first
```

---

## Task Card 06

```text
[Current Task Card]
Task Title: Implement the minimum viable registry lint command

Goal:
实现 `registry lint` 的最小可用版本，优先覆盖 endpoint 结构、版本信息、CORS 和基础错误处理。

Scope:
- 实现 registry metadata 获取层或 provider
- 检查关键 endpoint 是否存在
- 检查基础版本字段和响应结构
- 检查 CORS 相关响应头
- 产出统一 finding 和 summary
- 增加 safe / risky / broken fixtures 与测试
- 更新 README 或 docs 中的命令示例

Out of Scope:
- 高级 trust score
- 深度 schema 全量校验
- 复杂认证流程

Read First:
- CODEX_EXECUTION_BRIEF.md
- apps/cli/**
- packages/core/**
- packages/checks/**
- packages/reporters/**
- docs/** relevant command docs

Files Allowed To Change:
- packages/checks/**
- apps/cli/** for command wiring
- packages/core/** for small shared additions
- testdata/**
- docs/**
- README.md

Implementation Notes:
- provider 与 rule 逻辑分开
- 网络失败、超时、非预期响应要给清楚错误
- fixture 优先，本地可重复跑
- 若真实网络测试不稳定，可用 mock server 或 fixture 驱动

Validation Commands:
- pnpm -w typecheck
- pnpm -w test
- pnpm -w lint
- pnpm exec <your-cli-name> registry lint <fixture-or-local-target>

Done When:
- registry lint 可输出真实 finding
- endpoint、版本、CORS 三类检查已工作
- fixtures 和测试覆盖正常与异常路径
- 文档已更新到可演示状态

Execution Mode:
- plan first
```

---

## Task Card 07

```text
[Current Task Card]
Task Title: Implement the minimum viable install scan command

Goal:
实现 `install scan` 的最小版本，能解析本地配置、抽取启动命令，并识别明显高风险模式。

Scope:
- 解析一到两种主流本地配置形态，优先支持项目内示例格式
- 抽取 server 启动命令、参数和关键环境变量
- 检测 sudo、shell pipe、危险路径、明显网络调用等模式
- 输出结构化风险 finding
- 增加 safe / risky / broken fixtures 与测试
- 更新命令文档和示例

Out of Scope:
- 执行任何安装命令
- 完整 shell 安全分析
- 针对所有客户端配置格式的兼容

Read First:
- CODEX_EXECUTION_BRIEF.md
- packages/checks/**
- packages/core/**
- apps/cli/**
- testdata/** existing fixtures
- docs/** related docs

Files Allowed To Change:
- packages/checks/**
- apps/cli/** for command wiring
- packages/core/** for small shared additions
- testdata/**
- docs/**
- README.md

Implementation Notes:
- 优先保证解析稳定和风险规则清晰
- 风险判断先做规则化匹配，不必追求全覆盖
- 对无法解析的配置给出明确原因
- 后续可以扩展更多配置格式，本任务先做最小集合

Validation Commands:
- pnpm -w typecheck
- pnpm -w test
- pnpm -w lint
- pnpm exec <your-cli-name> install scan <fixture-or-local-config>

Done When:
- install scan 能解析至少一种稳定配置格式
- 已实现几类高风险模式识别
- fixtures 和测试已覆盖 safe / risky / broken
- 文档示例可直接运行

Execution Mode:
- plan first
```

---

## Task Card 08

```text
[Current Task Card]
Task Title: Implement the minimum viable identity check command

Goal:
实现 `identity check`，用于比对 registry、manifest、本地配置中的 server identity 是否存在漂移。

Scope:
- 定义 identity 抽取和归一化逻辑
- 支持从至少两类输入来源读取 identity 信息
- 比对 canonical id、display name、version 等关键字段
- 输出 drift finding 和 summary
- 增加测试数据与单元测试
- 更新文档与示例

Out of Scope:
- 复杂模糊匹配
- 远程 registry 的高级合规判断
- trust score

Read First:
- CODEX_EXECUTION_BRIEF.md
- packages/checks/**
- packages/core/**
- testdata/**
- docs/** related docs

Files Allowed To Change:
- packages/checks/**
- apps/cli/** for command wiring
- packages/core/** for shared identity types if needed
- testdata/**
- docs/**
- README.md

Implementation Notes:
- identity 归一化逻辑尽量集中管理
- finding 里要明确指出来源和差异字段
- 对缺失字段与冲突字段要区分对待
- 输入来源尽量做成可扩展 provider 结构

Validation Commands:
- pnpm -w typecheck
- pnpm -w test
- pnpm -w lint
- pnpm exec <your-cli-name> identity check <inputs>

Done When:
- identity check 可比较多来源输入
- drift finding 能指出差异位置和字段
- 测试覆盖一致、缺失、冲突三类场景
- 文档补上基本使用方法

Execution Mode:
- direct execute
```

---

## Task Card 09

```text
[Current Task Card]
Task Title: Implement the minimum viable auth check command

Goal:
实现 `auth check` 的轻量版本，优先覆盖 HTTPS、基础配置完整性、audience 相关风险和明显 token 处理问题。

Scope:
- 定义 auth finding 结构
- 支持读取服务端 auth 相关配置或元数据
- 检查 HTTPS 使用情况
- 检查 audience、resource、token handling 相关基础问题
- 对常见错误配置给出清楚提示
- 增加 fixtures、mock、测试与文档

Out of Scope:
- 完整 OAuth 流程联调
- 实时登录交互
- 企业级复杂授权拓扑

Read First:
- CODEX_EXECUTION_BRIEF.md
- packages/checks/**
- packages/core/**
- testdata/**
- docs/** related docs

Files Allowed To Change:
- packages/checks/**
- apps/cli/** for command wiring
- packages/core/** for shared auth types if needed
- testdata/**
- docs/**
- README.md

Implementation Notes:
- 本任务做 smoke check，重在识别明显风险和缺失项
- 对无法验证的项，用 warning 或 info 表达，不要伪装成已验证通过
- 尽量用 fixture 和 mock 驱动测试，减少外部不稳定因素

Validation Commands:
- pnpm -w typecheck
- pnpm -w test
- pnpm -w lint
- pnpm exec <your-cli-name> auth check <fixture-or-local-target>

Done When:
- auth check 可输出基础安全 finding
- HTTPS 和若干关键配置项已能检查
- 无法验证的项有明确状态表达
- fixtures、测试、文档已补齐到最小可用

Execution Mode:
- plan first
```

---

## Task Card 10

```text
[Current Task Card]
Task Title: Implement the minimum viable diff command

Goal:
实现 `diff`，用于比较 old 和 new 两份 server metadata 或相关配置，输出风险变化摘要，完成 v0 的五个核心命令闭环。

Scope:
- 支持读取 old / new 两份输入
- 比较工具数量、描述、参数面、安装配置、auth 配置等关键维度
- 输出新增风险、风险升级、风险下降、无变化等结果
- 为 diff 结果接入所有已有 reporter
- 增加 fixtures、snapshot、CLI 测试
- 更新 README 的核心命令清单与示例

Out of Scope:
- 历史版本链路分析
- 可视化 diff 页面
- 复杂语义理解型描述比较

Read First:
- CODEX_EXECUTION_BRIEF.md
- packages/checks/**
- packages/reporters/**
- apps/cli/**
- testdata/**
- README.md
- docs/** related docs

Files Allowed To Change:
- packages/checks/**
- packages/reporters/** if output wiring needs small additions
- apps/cli/**
- packages/core/** for small shared additions
- testdata/**
- docs/**
- README.md

Implementation Notes:
- 先做结构化 diff，避免过度追求智能描述比较
- finding 里要明确 old 值、new 值与变化类型
- 输出重点放在对审查者真正有帮助的变化
- 尽量复用前面任务形成的 shared model 和 reporter

Validation Commands:
- pnpm -w typecheck
- pnpm -w test
- pnpm -w lint
- pnpm exec <your-cli-name> diff <old> <new>

Done When:
- diff 命令可用
- 关键变化类型已覆盖
- reporters 均可消费 diff 结果
- fixtures 和测试能稳定通过
- README 已达到可演示的 v0 状态

Execution Mode:
- plan first
```

---

## 什么时候进入第二批任务

以下条件满足后，再准备第二批任务卡：
- 五个核心命令都能跑通
- JSON 和 Markdown 输出稳定
- 根级 build、test、typecheck、lint 已稳定
- README 已能支撑外部试用

第二批建议方向：
1. GitHub Action 封装
2. baseline 模式和 ignore 机制
3. 更完整的 SARIF 映射
4. 更强的 registry schema 检查
5. 更多客户端配置兼容
6. docs 细化
7. 发布流程和版本管理
