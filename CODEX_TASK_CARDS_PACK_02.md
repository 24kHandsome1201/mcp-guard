# CODEX_TASK_CARDS_PACK_02.md

这份文档给 `mcp-guard` 项目用。

当前前置状态：
- 前 10 个任务已完成
- CLI、五个最小命令、reporters、policy、fixtures、基础文档已存在
- 当前阶段目标是把“能跑”推进到“更稳、更像可用产品”

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
1. ignore 与 suppression
2. GitHub Action 输出与 PR 摘要
3. policy packs 完善
4. Server Card provider
5. metadata trust scoring
6. registry lint 深化
7. install scan 多格式支持
8. identity check 深化
9. auth check 深化
10. diff 风险分级与 tool description lint

补充约束：
- 每次只发一张任务卡
- 上一张未通过，不要做下一张
- 若实际仓库文件名与任务卡略有不同，以仓库现状为准，但范围不要扩散
- 优先复用现有类型、fixtures、reporters、policy 结构
- 新功能若会影响 CLI 行为，要同步更新 docs 与 examples

---

## Task Card 11

```text
[Current Task Card]
Task Title: Add ignore files, inline suppressions, and risk budget behavior

Goal:
让仓库具备更实用的噪声控制能力，支持忽略部分 finding、对个别规则做局部 suppression，并让 fail-on / baseline 行为更适合真实 CI。

Scope:
- 设计并实现 `.mcp-guard-ignore` 或等价机制
- 支持按 rule id、target、path 等基础维度忽略 finding
- 支持最小 inline suppression 机制，前提是已有输入格式允许携带注释或 metadata
- 补齐 risk budget 行为与 fail-on 的交互逻辑
- 为 ignore / suppression / risk budget 增加测试
- 更新 docs 与 examples

Out of Scope:
- 复杂的时间失效策略
- 远程 suppression 服务
- UI 管理页

Read First:
- CODEX_EXECUTION_BRIEF.md
- packages/core/**
- packages/policy-engine/**
- packages/checks/**
- apps/cli/**
- docs/**
- examples/**

Files Allowed To Change:
- packages/core/**
- packages/policy-engine/**
- packages/checks/**
- apps/cli/**
- docs/**
- examples/**
- testdata/**
- README.md

Implementation Notes:
- 忽略机制先追求简单和稳定
- 规则匹配逻辑集中管理
- CLI 输出里要能区分 active finding 和 suppressed finding
- 行为改变后，同步更新示例命令

Validation Commands:
- pnpm -w typecheck
- pnpm -w test
- pnpm -w lint
- pnpm exec <your-cli-name> <one-or-more-existing-commands> --help

Done When:
- ignore 文件已可用
- suppression 可覆盖最小典型场景
- risk budget 行为可测试、可解释
- 文档说明清楚如何忽略与恢复检查

Execution Mode:
- plan first
```

---

## Task Card 12

```text
[Current Task Card]
Task Title: Improve GitHub Action outputs and add a PR-friendly Markdown summary template

Goal:
让 GitHub Action 的输出更适合 CI 和 PR 审查，能稳定产出 step summary、artifact-friendly report 和适合评论区使用的 Markdown 摘要。

Scope:
- 为现有 GitHub Action 增加清晰的 inputs / outputs 约定
- 输出 PR 友好的 Markdown summary 模板
- 支持在 Action 中写出 JSON 或 SARIF artifact 路径
- 增加 Action 层测试或最小 smoke test
- 补一份 example workflow 文档

Out of Scope:
- 发布到 Marketplace 的品牌包装
- 复杂矩阵 workflow
- 自动评论 PR 的远程集成

Read First:
- CODEX_EXECUTION_BRIEF.md
- packages/github-action/**
- packages/reporters/**
- apps/cli/**
- docs/**
- examples/**

Files Allowed To Change:
- packages/github-action/**
- packages/reporters/**
- apps/cli/** for tiny wiring changes
- docs/**
- examples/**
- README.md
- test files related to action

Implementation Notes:
- 输出约定尽量稳定
- summary 内容优先给人看，信息密度要高
- action 层避免复制业务逻辑，尽量复用 CLI 或 reporter
- example workflow 要能直接作为仓库示例

Validation Commands:
- pnpm -w typecheck
- pnpm -w test
- pnpm -w lint

Done When:
- GitHub Action 输出字段清楚可复用
- PR-friendly Markdown summary 已落地
- example workflow 已可参考使用
- 文档已说明在 CI 中如何消费输出

Execution Mode:
- plan first
```

---

## Task Card 13

```text
[Current Task Card]
Task Title: Expand policy packs for strict and enterprise use cases

Goal:
把 policy 体系从“能加载”推进到“能直接拿来用”，补齐 strict、enterprise、CI-friendly 等策略包与说明文档。

Scope:
- 审视现有 policy packs
- 增加 strict policy
- 增加 enterprise-oriented policy
- 增加 CI-friendly 示例 policy
- 为 policy packs 补测试与 reference 文档
- 在 examples 中加入典型调用方式

Out of Scope:
- 动态远程策略下发
- 多租户策略系统
- 图形化 policy 编辑器

Read First:
- CODEX_EXECUTION_BRIEF.md
- packages/policy-engine/**
- policies/**
- docs/**
- examples/**

Files Allowed To Change:
- packages/policy-engine/**
- policies/**
- docs/**
- examples/**
- README.md
- related tests

Implementation Notes:
- policy 命名直白
- 每份策略都写清适用场景
- 文档里放最小对比表，帮助维护者快速选用
- 不要为了展示性增加太多难维护字段

Validation Commands:
- pnpm -w typecheck
- pnpm -w test
- pnpm -w lint

Done When:
- 至少有 base、strict、enterprise、CI-friendly 四类清晰策略
- 策略差异有文档解释
- 示例命令能直接引用这些策略
- 测试能覆盖策略加载与关键差异

Execution Mode:
- direct execute
```

---

## Task Card 14

```text
[Current Task Card]
Task Title: Add a Server Card provider interface and metadata normalization layer

Goal:
为后续的 trust scoring 和 richer metadata checks 做底座，先把 Server Card 与其他 metadata 来源做成统一 provider 接口和归一化层。

Scope:
- 设计 metadata provider 接口
- 增加 Server Card provider 的最小实现或占位实现
- 建立 metadata normalization 流程
- 统一输出给 registry / identity / trust related checks 消费
- 补 fixtures 与测试
- 更新 architecture docs

Out of Scope:
- 完整 trust scoring 逻辑
- 所有外部 metadata 来源的全量支持
- 复杂缓存层

Read First:
- CODEX_EXECUTION_BRIEF.md
- packages/checks/**
- packages/core/**
- packages/metadata/** if present
- docs/**
- testdata/**

Files Allowed To Change:
- packages/metadata/**
- packages/core/** for shared type additions
- packages/checks/** for light wiring
- docs/**
- testdata/**
- related tests

Implementation Notes:
- provider 接口要偏稳，方便后续扩展
- normalization 要明确原始值和归一化值的边界
- 对缺失字段保持宽容，但输出要可解释
- 新层不要把已有命令耦合得更乱

Validation Commands:
- pnpm -w typecheck
- pnpm -w test
- pnpm -w lint

Done When:
- provider 接口已成形
- Server Card 最小 provider 可被测试消费
- normalization 结果可复用
- 文档说明了 provider 和 normalization 的角色

Execution Mode:
- plan first
```

---

## Task Card 15

```text
[Current Task Card]
Task Title: Implement metadata trust scoring and surfaced trust signals

Goal:
基于归一化 metadata 构建最小可用的 trust scoring 机制，让输出里能体现“哪些信号让这个 server 更值得信任，哪些信号缺失”。

Scope:
- 设计 trust signal 集合
- 设计最小 trust score 或 trust band 方案
- 把 score 和信号写进统一 finding / report
- 支持 policy 覆盖部分 trust 规则
- 增加 fixtures、单元测试和输出示例
- 更新 docs 与 examples

Out of Scope:
- 复杂机器学习打分
- 声誉网络或远程 reputation service
- 过度细碎的分值模型

Read First:
- CODEX_EXECUTION_BRIEF.md
- packages/metadata/**
- packages/core/**
- packages/policy-engine/**
- packages/reporters/**
- docs/**

Files Allowed To Change:
- packages/metadata/**
- packages/core/**
- packages/policy-engine/**
- packages/reporters/**
- docs/**
- examples/**
- testdata/**
- related tests

Implementation Notes:
- 先做 bands 或有限等级，别上复杂百分制
- 输出里要能看出 score 的来源
- reporter 中要给出简洁摘要
- 命名保持稳定，方便后续 CI 消费

Validation Commands:
- pnpm -w typecheck
- pnpm -w test
- pnpm -w lint

Done When:
- trust signals 已定义并落地
- report 能展示 trust summary
- policy 可影响部分 trust 检查行为
- 文档说明 score 的意图与局限

Execution Mode:
- plan first
```

---

## Task Card 16

```text
[Current Task Card]
Task Title: Deepen registry lint with schema validation and richer diagnostics

Goal:
把 `registry lint` 从最小可用推进到更靠谱的合规检查，增强 schema 校验、错误分类和诊断信息质量。

Scope:
- 补更完整的 response shape / schema validation
- 增加 endpoint-specific diagnostics
- 对常见错误路径做更明确分类
- 改善 registry-related findings 的 message 质量
- 扩展 fixtures 与集成测试
- 更新 docs 与 examples

Out of Scope:
- 远程认证流程自动化
- 全量网络兼容性实验
- 运行时代理能力

Read First:
- CODEX_EXECUTION_BRIEF.md
- packages/checks/** registry related files
- packages/core/**
- packages/reporters/**
- testdata/**
- docs/**

Files Allowed To Change:
- packages/checks/**
- packages/core/**
- packages/reporters/** for small rendering adjustments
- docs/**
- examples/**
- testdata/**
- README.md
- related tests

Implementation Notes:
- 诊断信息优先帮助维护者修问题
- schema 校验要和 message 映射分层
- 尽量复用已有 provider / normalization 逻辑
- 避免为校验引入过重依赖

Validation Commands:
- pnpm -w typecheck
- pnpm -w test
- pnpm -w lint
- pnpm exec <your-cli-name> registry lint <fixture-or-local-target>

Done When:
- registry lint 能指出更具体的结构问题
- 错误分类清晰
- fixtures 覆盖典型坏例子
- 文档里的示例输出已同步

Execution Mode:
- plan first
```

---

## Task Card 17

```text
[Current Task Card]
Task Title: Expand install scan to support more client config formats and environment redaction

Goal:
提升 `install scan` 的实际可用性，支持更多常见配置格式，并在输出里安全处理环境变量与敏感信息。

Scope:
- 在现有基础上新增一到两种配置格式支持
- 抽象 parser 接口，避免所有逻辑堆在单一实现里
- 识别和结构化提取 environment variables
- 做最小敏感信息 redaction 处理
- 扩展 fixtures 与测试
- 更新 docs 与 examples

Out of Scope:
- 覆盖所有客户端
- 执行任何安装命令
- 深度 shell 解释器语义分析

Read First:
- CODEX_EXECUTION_BRIEF.md
- packages/checks/** install related files
- packages/core/**
- testdata/**
- docs/**
- examples/**

Files Allowed To Change:
- packages/checks/**
- packages/core/**
- docs/**
- examples/**
- testdata/**
- README.md
- related tests

Implementation Notes:
- parser 层和风险规则层分开
- redaction 规则先覆盖最常见秘密模式
- 对未知字段保持宽容，尽量别因小问题全盘失败
- 输出要说明哪些值被隐藏过

Validation Commands:
- pnpm -w typecheck
- pnpm -w test
- pnpm -w lint
- pnpm exec <your-cli-name> install scan <fixture-or-local-config>

Done When:
- install scan 支持更多配置格式
- env 提取和 redaction 已工作
- fixtures 覆盖多格式与敏感信息场景
- 文档说明当前支持范围和限制

Execution Mode:
- plan first
```

---

## Task Card 18

```text
[Current Task Card]
Task Title: Deepen identity check with normalization, source precedence, and drift categories

Goal:
把 `identity check` 从基础字段比对推进到更稳定的 identity 判定，加入归一化规则、来源优先级和差异分类。

Scope:
- 增强 identity normalization
- 定义 source precedence 规则
- 定义 drift categories，例如 missing、mismatch、conflict、stale
- 优化 finding message 和 summary
- 扩展 fixtures 与测试
- 更新 docs 与 examples

Out of Scope:
- 模糊搜索服务
- 复杂组织级命名策略平台
- 自动修复 identity

Read First:
- CODEX_EXECUTION_BRIEF.md
- packages/checks/** identity related files
- packages/core/**
- packages/metadata/** if present
- docs/**
- testdata/**

Files Allowed To Change:
- packages/checks/**
- packages/core/**
- packages/metadata/** for small integration changes
- docs/**
- examples/**
- testdata/**
- related tests

Implementation Notes:
- 归一化规则集中维护
- precedence 规则写进文档
- finding 既要有机器可读字段，也要有人类可读解释
- 不要把 trust scoring 和 identity 逻辑混成一层

Validation Commands:
- pnpm -w typecheck
- pnpm -w test
- pnpm -w lint
- pnpm exec <your-cli-name> identity check <inputs>

Done When:
- identity check 能表达更细的 drift 类型
- source precedence 行为可测试
- summary 更适合维护者阅读
- 文档说明字段归一化和优先级

Execution Mode:
- plan first
```

---

## Task Card 19

```text
[Current Task Card]
Task Title: Deepen auth check with audience, resource, and token-handling rules

Goal:
增强 `auth check`，让它不只检查表面配置，还能覆盖 audience、resource、token handling 和更清晰的授权风险分类。

Scope:
- 扩展 auth-related finding types
- 增加 audience 相关检查
- 增加 resource 参数相关检查
- 增加 token handling / passthrough 风险检查
- 改善 auth smoke check 的错误分类
- 扩展 fixtures、测试和文档

Out of Scope:
- 完整 OAuth client 实现
- 真实账号授权流程自动化
- 远程 secret 管理

Read First:
- CODEX_EXECUTION_BRIEF.md
- packages/checks/** auth related files
- packages/core/**
- docs/**
- testdata/**

Files Allowed To Change:
- packages/checks/**
- packages/core/**
- docs/**
- examples/**
- testdata/**
- README.md
- related tests

Implementation Notes:
- 错误分类先做维护者最关心的那几类
- 对无法确定的情况，用 warning 和 explainable message 表达
- 规则之间尽量独立，方便 policy 覆盖
- 输出中明确区分 config issue、network issue、protocol risk

Validation Commands:
- pnpm -w typecheck
- pnpm -w test
- pnpm -w lint
- pnpm exec <your-cli-name> auth check <fixture-or-local-target>

Done When:
- auth check 覆盖更多核心授权风险
- finding 类型更细
- fixtures 覆盖常见好坏案例
- 文档说明了当前检查深度与边界

Execution Mode:
- plan first
```

---

## Task Card 20

```text
[Current Task Card]
Task Title: Add diff risk scoring and tool description ambiguity lint

Goal:
让 `diff` 更适合做变更审查，同时加入 tool description ambiguity lint，帮助维护者发现“看起来改动不大，实际可能影响模型行为”的风险。

Scope:
- 为 diff 增加风险等级或风险分组
- 对工具数量、描述、参数面、auth、install 命令变化做更清晰分类
- 增加 tool description ambiguity checks
- 将 ambiguity findings 接入 report 与 reporters
- 扩展 fixtures、测试和文档
- 更新 example outputs

Out of Scope:
- 真正的离线模型评测系统
- 多模型回放框架
- 自动重写 tool description

Read First:
- CODEX_EXECUTION_BRIEF.md
- packages/checks/** diff related files
- packages/core/**
- packages/reporters/**
- docs/**
- testdata/**

Files Allowed To Change:
- packages/checks/**
- packages/core/**
- packages/reporters/**
- docs/**
- examples/**
- testdata/**
- README.md
- related tests

Implementation Notes:
- 风险分级规则保持可解释
- ambiguity lint 先抓高价值模式，例如语义重叠、描述过空、参数名含糊
- summary 要能帮助 reviewer 快速判断是否需要人工深看
- 尽量复用已有 diff 结构，避免重写整条链路

Validation Commands:
- pnpm -w typecheck
- pnpm -w test
- pnpm -w lint
- pnpm exec <your-cli-name> diff <old> <new>

Done When:
- diff 输出有清楚的风险分级
- ambiguity lint 可产出真实 finding
- reporters 已能展示新增结果
- 文档和示例输出已同步

Execution Mode:
- plan first
```

