# PLANS.md

## 1. When a plan is required

Create or update a plan before coding when a task does any of the following:
- touches multiple packages
- adds a new CLI command
- changes shared types or result models
- changes policy schema or merge behavior
- changes reporter output format
- adds a dependency
- changes GitHub Action behavior
- spans several milestones or is likely to be lengthy

Small, single-file fixes usually do not need a formal plan.

## 2. Plan workflow

For planned work:
1. read `AGENTS.md` and relevant package files
2. write or update a plan section in this file
3. confirm scope and out-of-scope items
4. implement one milestone at a time
5. run validation after each milestone when practical
6. update status and notes as the work progresses
7. finish with a completion summary

Keep the plan current. The plan is the execution guide for the task.

## 3. Plan template

Copy this template for each substantial task.

```md
## Plan: <short title>

Status: proposed | in-progress | blocked | done
Owner: Codex
Date: YYYY-MM-DD

### Goal
<what this task should accomplish>

### Why
<why this matters now>

### Scope
- <in scope item>
- <in scope item>

### Out of scope
- <explicit non-goal>
- <explicit non-goal>

### Expected files
- <file or directory>
- <file or directory>

### Milestones
1. <milestone name>
   - Deliverables:
   - Validation:
2. <milestone name>
   - Deliverables:
   - Validation:
3. <milestone name>
   - Deliverables:
   - Validation:

### Risks and assumptions
- <risk or assumption>
- <risk or assumption>

### Completion criteria
- <clear done condition>
- <clear done condition>

### Progress log
- [x] Milestone 1
- [ ] Milestone 2
- [ ] Milestone 3

### Final summary
<fill in when done>
```

## 4. Execution rules for every plan

- Keep diffs tightly scoped to the active milestone.
- Do not mix unrelated cleanup into the same task.
- Update the plan before expanding scope.
- Prefer shipping a working slice over partially changing many areas.
- Run the narrowest useful validation early, then broader validation before closing.
- Record blockers or assumptions instead of hiding them.

## 5. Validation checklist

Use the most relevant subset first, then broaden as needed.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Possible targeted validation examples:
- run tests only for the touched package
- run CLI integration tests for a changed command
- run fixture snapshot tests for reporter or rule changes

## 6. Plan quality checklist

A good plan should answer these questions clearly:
- what is being built or changed
- what is deliberately excluded
- which files or packages are expected to move
- how success will be validated
- where the main risks are
- what “done” means for this task

## 7. Starter backlog for `mcp-guard`

These are the default large tasks for the repository.
They can be copied into plan sections as needed.

### Plan seed A: repository bootstrap
Goal:
- set up workspace structure, base scripts, TypeScript config, linting, testing, and release-ready package boundaries

Likely areas:
- root config files
- `apps/cli/`
- `packages/core/`
- `packages/reporters/`
- `testdata/`

### Plan seed B: shared types and result model
Goal:
- define stable result types, severity levels, rule IDs, exit codes, and shared error handling

Likely areas:
- `packages/core/`
- `packages/policy-engine/`
- `packages/reporters/`

### Plan seed C: reporter skeletons
Goal:
- provide terminal, JSON, Markdown, and SARIF reporters on top of the shared result model

Likely areas:
- `packages/reporters/`
- reporter tests and snapshots

### Plan seed D: `registry lint`
Goal:
- validate registry structure, version endpoints, CORS behavior, and metadata completeness

Likely areas:
- `packages/checks/src/registry/`
- CLI command wiring
- fixtures and tests

### Plan seed E: `install scan`
Goal:
- parse local config files, extract install commands, and detect risky patterns such as `sudo`, shell pipes, or risky paths

Likely areas:
- `packages/checks/src/install/`
- CLI command wiring
- risky and safe fixtures

### Plan seed F: `identity check`
Goal:
- compare server IDs across registry entries, manifests, and local config to flag identity drift

Likely areas:
- `packages/checks/src/identity/`
- normalization utilities
- fixtures and tests

### Plan seed G: `auth check`
Goal:
- perform lightweight checks for transport safety, auth configuration quality, and obvious token-handling risks

Likely areas:
- `packages/checks/src/auth/`
- CLI command wiring
- tests and docs

### Plan seed H: `diff`
Goal:
- compare old and new metadata for changes in tools, descriptions, params, install commands, or auth-related fields

Likely areas:
- `packages/checks/src/diff/`
- CLI command wiring
- fixtures and snapshot tests

### Plan seed I: GitHub Action wrapper
Goal:
- expose CLI behavior in CI with stable inputs, outputs, and markdown summaries

Likely areas:
- `packages/github-action/`
- action metadata
- examples and docs

### Plan seed J: docs and examples hardening
Goal:
- align README, policy reference, rules reference, config examples, roadmap, and examples with the implemented commands

Likely areas:
- `README.md`
- `docs/`
- `examples/`

## 8. Active plan template for the next task

Copy this section and replace placeholders before starting a substantial implementation.

```md
## Plan: <next task>

Status: proposed
Owner: Codex
Date: <YYYY-MM-DD>

### Goal

### Why

### Scope
- 

### Out of scope
- 

### Expected files
- 

### Milestones
1. 
   - Deliverables:
   - Validation:
2. 
   - Deliverables:
   - Validation:

### Risks and assumptions
- 

### Completion criteria
- 

### Progress log
- [ ] Milestone 1
- [ ] Milestone 2

### Final summary
```

## 9. Completed: Bootstrap the mcp-guard monorepo and base toolchain

Status: done
Owner: Codex
Date: 2026-03-13

### Goal
Build a minimal workspace baseline with shared scripts, TypeScript, Vitest, lint, and formatter config so repository-wide validation commands work consistently.

### Why
The next command and policy checks need stable package boundaries and command wiring before feature work can proceed.

### Scope
- root workspace setup and scripts
- skeleton directories for `apps/cli` and `packages/*` used by v0
- minimal package-level TS build/typecheck/test/lint scripts
- baseline docs/examples/policies/testdata directories with placeholders

### Out of scope
- full checker implementations
- policy parsing/evaluation logic
- GitHub Action integration

### Expected files
- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig*.json`
- `vitest.config.ts`
- `eslint.config.js`
- `.prettierrc.json`
- `.editorconfig`
- `apps/cli/**`
- `packages/core/**`
- `packages/policy-engine/**`
- `packages/checks/**`
- `packages/reporters/**`
- `.gitignore`
- `docs/` `examples/` `policies/` `testdata/`

### Milestones
1. Workspace bootstrap
   - Deliverables: root config files and workspace layout, placeholder package.json files
   - Validation: `pnpm install`
2. Package scaffolding
   - Deliverables: minimal source/typecheck/test/lint in each package, core placeholder test
   - Validation: `pnpm -w typecheck`
3. Repo-level smoke
   - Deliverables: `pnpm -w test` and `pnpm -w lint` complete with baseline config
   - Validation: `pnpm -w test`, `pnpm -w lint`

### Risks and assumptions
- No external business logic exists yet, so minimal implementations use placeholders.
- Tooling may require follow-up dependency tuning if future packages introduce stricter lint rules.

### Completion criteria
- `pnpm -w` validation scripts run successfully
- workspace directories and package entry points exist
- no feature work is introduced beyond Task Card 01 scope

### Progress log
- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

### Final summary
## Completed on 2026-03-13

- Created root monorepo scaffolding (workspace config, TS/Vitest/ESLint/Prettier config, and validation scripts).
- Added scaffolded packages for `apps/cli`, `packages/core`, `packages/policy-engine`, `packages/checks`, and `packages/reporters`.
- Added baseline files for `docs`, `examples`, `policies`, and `testdata`.
- Added placeholder source and smoke tests, and verified typecheck/test/lint commands.

## 10. Completed: Define shared core types, error model, and exit codes

Status: done
Owner: Codex
Date: 2026-03-13

### Goal
定义可复用的核心类型模型和统一退出码行为，给后续检查、策略和报告模块提供稳定基础。

### Why
后续检查模块需要一致的结果结构与失败语义，避免规则实现阶段反复改造通用模型。

### Scope
- 在 `packages/core` 定义 Severity、RuleId、CheckResult、Report、Policy 与关联类型。
- 定义通用错误码与 CLI 退出码模型。
- 增加结果聚合与统计辅助函数。
- 补充核心类型单元测试。

### Out of scope
- 具体命令实现
- 报表输出实现
- Policy 解析与加载逻辑的文件 I/O

### Expected files
- `packages/core/src/model.ts`
- `packages/core/src/index.ts`
- `packages/core/src/index.test.ts`

### Milestones
1. 核心模型定义
   - Deliverables: `model.ts` 与 re-export
   - Validation: `corepack pnpm -C packages/core run typecheck`
2. 聚合函数与退出码规则
   - Deliverables: 聚合与退出码函数与单元测试
   - Validation: `corepack pnpm -C packages/core run test`
3. 结构化收尾
   - Deliverables: 完成计划记录
   - Validation: `corepack pnpm -C packages/core run lint`

### Risks and assumptions
- 当前字段设计以 task 02 范围内的 v0 需求为准，后续可向后兼容扩展。

### Completion criteria
- 核心类型集中可在 `@mcp-guard/core` 导出。
- `CheckResult`/`Report`/`Policy` 可用于未来检查与报告。
- 错误码和退出码逻辑可覆盖 success、warning threshold exceeded、failure。

### Progress log
- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

### Final summary

核心模型完成：定义了规则 ID、严重级、检查结果、汇总报告、Policy、错误与退出码模型，以及聚合与退出码计算函数，并补齐 6 个单元测试。

Status: done

## 11. Active plan: Implement the policy engine skeleton and YAML policy loading

Status: done
Owner: Codex
Date: 2026-03-13

### Goal
建立最小可用 policy 引擎，让后续所有检查项统一规则启用、禁用、severity 覆盖与参数合并。

### Why
所有检查命令需要一致的策略入口和可配置行为，才能稳定推进下一阶段实现。

### Scope
- `packages/policy-engine`：policy schema、YAML 加载、默认与自定义合并
- `policies`：`base.yaml` 与 `strict.yaml` 示例

### Out of scope
- CLI 参数解析
- reporter 输出实现

### Expected files
- `packages/policy-engine/src/index.ts`
- `packages/policy-engine/src/index.test.ts`
- `policies/base.yaml`
- `policies/strict.yaml`

### Milestones
1. 定义 schema 与加载器
   - Deliverables: `PolicyError`, `parsePolicyYaml`, `loadPolicyFromFile`
   - Validation: `corepack pnpm -C packages/policy-engine run typecheck`
2. 实现合并能力
   - Deliverables: `mergePolicy` 与 `PolicyPatch` 覆盖逻辑
   - Validation: `corepack pnpm -C packages/policy-engine run test`
3. 加入示例 policy 并收尾
   - Deliverables: `policies/base.yaml`, `policies/strict.yaml`
   - Validation: `corepack pnpm -C packages/policy-engine run lint`

### Risks and assumptions
- 轻量 schema 校验覆盖常见字段与类型；后续可扩展更多条件验证。

### Completion criteria
- policy 可以从 YAML 读取并校验
- 默认与自定义策略可合并
- rule id 开关与 severity 覆盖可用
- 示例策略可被测试消费

### Progress log
- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

### Final summary
已完成策略引擎最小闭环：定义 policy schema 与 YAML 解析、错误模型、规则合并能力，并提供 base/strict 示例文件；`policy-engine` 核心 API 可被测试加载与合并验证。

## 12. Active plan: Build the reporter layer for terminal, JSON, Markdown, and SARIF

Status: done
Owner: Codex
Date: 2026-03-13

### Goal
建立统一 reporter 层，让四种输出终端复用同一套 `Report` 结构输出报告内容。

### Why
后续检查命令与 CI 路径需要稳定可复用的输出接口，避免在 CLI 层混合格式化逻辑。

### Scope
- `packages/reporters`：设计统一 renderer 接口与 4 种输出实现
- 终端、JSON、Markdown、SARIF 的最小稳定输出
- 补 reporter 结构化测试

### Out of scope
- CLI 参数解析
- 具体检查命令业务逻辑
- GitHub Action 绑定

### Expected files
- `packages/reporters/src/index.ts`
- `packages/reporters/src/index.test.ts`
- `packages/core/src/model.ts`（若需轻量字段补充）

### Milestones
1. 输出模型与终端输出
   - Deliverables: 统一 output 接口、terminal renderer
   - Validation: `corepack pnpm -C packages/reporters run typecheck`
2. JSON 与 Markdown 输出
   - Deliverables: json 和 markdown renderer 与测试断言
   - Validation: `corepack pnpm -C packages/reporters run test`
3. SARIF 与收尾
   - Deliverables: sarif renderer 与稳定字段、测试
   - Validation: `corepack pnpm -C packages/reporters run lint`

### Risks and assumptions
- SARIF 输出使用 v0 最小 schema，先覆盖字段完整性与可读性，不追求完整覆盖全部 SARIF 可选项。

### Completion criteria
- terminal/json/markdown/sarif 输出共用 report 模型。
- 每类输出有对应测试覆盖。
- 报表字符串格式在本地测试稳定通过。

### Progress log
- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

### Final summary
已完成 reporter 层最小实现：提供统一 `Report` 输入下的 terminal/json/markdown/sarif 四类输出渲染器；补齐 5 条单元测试覆盖正常输出、JSON 可解析、SARIF 基本字段。

## Active plan: Create the CLI shell, command routing, and global flags

Status: done
Owner: Codex
Date: 2026-03-13

### Goal
Create the CLI shell and command router so `registry lint`、`install scan`、`identity check`、`auth check`、`diff` 能被统一调度，并打通全局参数与 reporter/exit-code 逻辑。

### Why
后续五个真实检查命令将直接接入该骨架，避免后续重复实现参数解析和命令分发。

### Scope
- `apps/cli/src/index.ts`：参数解析、命令路由、策略加载、reporter 输出、退出码映射。
- `apps/cli/src/index.test.ts`：help、命令路由和输出路径、`--policy`、全局参数异常路径测试。
- `apps/cli/package.json`：可执行入口元数据（bin）补齐。
- `apps/cli/README.md`：更新 CLI 使用示例与参数说明。

### Out of scope
- 五个检查命令的真实业务实现（继续使用占位报告）。
- GitHub Action 集成与远端网络调用。

### Expected files
- `apps/cli/src/index.ts`
- `apps/cli/src/index.test.ts`
- `apps/cli/package.json`
- `apps/cli/README.md`

### Milestones
1. 构建参数与路由骨架
   - Deliverables: `runCli`、`run`、`--help`、子命令解析
   - Validation: `corepack pnpm -C apps/cli run test`
2. 打通 policy + reporter + 退出码
   - Deliverables: `--policy`、`--format`、`--output`、`--fail-on`、`--quiet`
   - Validation: `corepack pnpm -C apps/cli run typecheck`
3. 文档与发布入口
   - Deliverables: README 与 package bin 更新
   - Validation: `corepack pnpm -C apps/cli run lint`

### Risks and assumptions
- 占位命令当前不产生发现项，以便 CLI 骨架先行验证，不干扰 `fail-on`。
- `--policy` 未传入时直接使用 `defaultPolicy`（不再做额外 I/O）。

### Completion criteria
- `mcp-guard --help` 与主命令帮助可见且可解析。
- 五类命令能正确路由到占位处理函数并返回 `Report`。
- 全局 flag 可生效：格式、输出路径、失败策略、策略加载。
- CLI 输出通过 reporter 转换。

### Progress log
- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

### Final summary
CLI 外壳已完成：实现命令路由、全局参数、策略加载、reporter 渲染、退出码映射与基础集成测试，五个命令均返回统一 report 结构的占位结果。

## Active plan: Implement the minimum viable registry lint command

Status: done
Owner: Codex
Date: 2026-03-13

### Goal
Implement a minimal `registry lint` check that performs endpoint fetch, version presence validation, and CORS header checks.

### Why
`registry lint` is the first real command and validates the end-to-end path from CLI routing to report output.

### Scope
- `packages/checks/`：实现 `registry` 检查逻辑与规则化 finding。
- `apps/cli/src/index.ts`：将 `registry lint` 占位命令替换为真实检查入口。
- `testdata/registry/`：补充 safe/risky/broken fixture 响应文件。
- `packages/checks/src` 与 `apps/cli/src` 测试：覆盖成功与失败路径。

### Out of scope
- 复杂认证、分页、schema 扩展。
- install/identity/auth/diff 相关实现。
- GitHub Action。

### Expected files
- `packages/checks/src/registry.ts`
- `packages/checks/src/index.ts`
- `packages/checks/src/registry.test.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/index.test.ts`
- `apps/cli/package.json`
- `packages/checks/package.json`
- `testdata/registry/safe.json`
- `testdata/registry/risky.json`
- `testdata/registry/broken.json`

### Milestones
1. 实现 registry 检查核心逻辑
   - Deliverables: endpoint 可达、版本字段、CORS finding
   - Validation: `corepack pnpm -C packages/checks run test`
2. 接入 CLI registry 命令
   - Deliverables: `registry lint <endpoint>` 走真实检查并回传 findings
   - Validation: `corepack pnpm -C apps/cli run test`
3. 补齐 fixtures
   - Deliverables: safe/risky/broken 测试数据和断言
   - Validation: `corepack pnpm -C apps/cli run test`

### Risks and assumptions
- 通过 `fetch` 发起 HTTP 请求，测试使用本地临时 HTTP server 驱动。
- CORS 规则采用最小策略：缺少 ACAO 头即产生 low 级 finding。

### Completion criteria
- `registry lint <endpoint>` 能输出真实 finding。
- endpoint、version、CORS 三类基础检查有覆盖。
- `apps/cli` 与 `checks` 测试通过。

### Progress log
- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

### Final summary
已完成 registry lint 最小实现：
- 在 `packages/checks` 新增/完善 `runRegistryLint`，支持 endpoint 可达性、JSON/版本字段、CORS 头检测，并接入 policy 的 `enabled/severity` 覆盖。
- 在 CLI 中接入 `registry lint <endpoint>` 到真实检查执行，并对缺少 endpoint 的调用返回 InvalidInput。
- 增加 CLI 集成测试用例及本地 HTTP fixture 服务，补充 `apps/cli/package.json` 对 `@mcp-guard/checks` 的依赖。

## Active plan: Implement the minimum viable install scan command

Status: done
Owner: Codex
Date: 2026-03-13

### Goal
Implement a minimal `install scan` command that parses a local config file, extracts install command metadata, and flags obvious risky patterns.

### Why
`install scan` is the next end-to-end command after `registry lint` and establishes the reusable pattern for local file based checks.

### Scope
- `packages/checks/`：实现 install 配置解析和风险匹配。
- `apps/cli/src/index.ts`：将 `install scan` 占位命令替换为真实检查入口。
- `testdata/install/`：补充 safe/risky/broken fixtures。
- `packages/checks/src` 与 `apps/cli/src` 测试：覆盖成功、风险和解析失败路径。
- `apps/cli/README.md`：补充 `install scan` 最小用法。

### Out of scope
- 执行任何安装命令。
- 完整 shell AST 分析或多格式全兼容。
- identity/auth/diff 实现。

### Expected files
- `packages/checks/src/install.ts`
- `packages/checks/src/install.test.ts`
- `packages/checks/src/index.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/index.test.ts`
- `testdata/install/safe.json`
- `testdata/install/risky.json`
- `testdata/install/broken.json`
- `apps/cli/README.md`

### Milestones
1. 实现 install 检查核心逻辑
   - Deliverables: 本地 JSON 解析、命令提取、风险 finding
   - Validation: `corepack pnpm -C packages/checks run test`
2. 接入 CLI install 命令
   - Deliverables: `install scan <path>` 走真实检查并返回 findings
   - Validation: `corepack pnpm -C apps/cli run test`
3. 补齐 fixtures 与文档
   - Deliverables: safe/risky/broken fixtures 和 README 用法
   - Validation: `corepack pnpm -C apps/cli run test`

### Risks and assumptions
- 本任务只支持 JSON 配置，优先保证解析稳定和错误信息明确。
- 风险识别采用规则化字符串匹配，后续可以扩展为更细粒度解析。

### Completion criteria
- `install scan <path>` 能解析至少一种稳定配置格式。
- `sudo`、pipe、危险路径、明显网络调用至少几类风险可识别。
- fixtures 和测试覆盖 safe / risky / broken。

### Progress log
- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

### Final summary
已完成 install scan 最小实现：
- 在 `packages/checks` 新增 `runInstallScan`，支持顶层与 `install` 嵌套两种 JSON 形态，并输出解析失败与命令风险 finding。
- 在 CLI 中接入 `install scan <path>` 真实执行，缺少路径时返回 InvalidInput。
- 新增 install safe/risky/broken fixtures，以及 checks 和 CLI 测试；补充 CLI README 示例。

## Active plan: Implement the minimum viable identity check command

Status: done
Owner: Codex
Date: 2026-03-13

### Goal
Implement a minimal `identity check` command that compares identity fields across multiple local JSON inputs and reports drift.

### Why
The identity command establishes the next local comparison workflow after install scanning and covers multi-input normalization.

### Scope
- `packages/checks/`：实现 identity 提取、归一化和 drift 检查。
- `apps/cli/src/index.ts`：将 `identity check` 占位命令替换为真实检查入口。
- `testdata/identity/`：补充一致、缺失、冲突 fixtures。
- `packages/checks/src` 与 `apps/cli/src` 测试：覆盖一致、缺失、冲突路径。
- `apps/cli/README.md`：补充最小用法。

### Out of scope
- 模糊匹配与置信度算法。
- 远程 registry 请求。
- auth/diff 实现。

### Expected files
- `packages/checks/src/identity.ts`
- `packages/checks/src/identity.test.ts`
- `packages/checks/src/index.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/index.test.ts`
- `testdata/identity/registry.json`
- `testdata/identity/manifest.json`
- `testdata/identity/drift.json`
- `testdata/identity/missing.json`
- `apps/cli/README.md`

### Milestones
1. 实现 identity 检查核心逻辑
   - Deliverables: 多来源 identity 抽取、归一化、missing/drift finding
   - Validation: `corepack pnpm -C packages/checks run test`
2. 接入 CLI identity 命令
   - Deliverables: `identity check <inputs...>` 走真实检查并返回 findings
   - Validation: `corepack pnpm -C apps/cli run test`
3. 补齐 fixtures 与文档
   - Deliverables: identity fixtures 和 README 用法
   - Validation: `corepack pnpm -C apps/cli run test`

### Risks and assumptions
- 本任务只支持本地 JSON 文件输入。
- 归一化先覆盖 `id`、`name`、`version`，后续可扩展更多字段。

### Completion criteria
- `identity check` 可比较至少两个输入来源。
- drift finding 能指出来源、字段和值差异。
- 测试覆盖一致、缺失、冲突三类场景。

### Progress log
- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

### Final summary
已完成 identity check 最小实现：
- 在 `packages/checks` 新增 `runIdentityCheck`，支持从多份本地 JSON 中提取 `id/name/version` 并检测缺失字段与字段漂移。
- 在 CLI 中接入 `identity check <input...>` 真实执行，少于两个输入时返回 InvalidInput。
- 新增 identity fixtures 和 checks/CLI 测试，并补充 CLI README 示例。

## Active plan: Implement the minimum viable auth check command

Status: done
Owner: Codex
Date: 2026-03-13

### Goal
Implement a minimal `auth check` command that inspects local JSON auth config for obvious transport and token-handling risks.

### Why
The auth command completes the basic local static checks set before diff support.

### Scope
- `packages/checks/`：实现 auth 配置解析和 smoke 风险检查。
- `apps/cli/src/index.ts`：将 `auth check` 占位命令替换为真实检查入口。
- `testdata/auth/`：补充 safe/risky/broken fixtures。
- `packages/checks/src` 与 `apps/cli/src` 测试：覆盖安全、风险、解析失败路径。
- `apps/cli/README.md`：补充最小用法。

### Out of scope
- 实时 OAuth 流程。
- 网络请求和登录交互。
- 企业级授权拓扑分析。

### Expected files
- `packages/checks/src/auth.ts`
- `packages/checks/src/auth.test.ts`
- `packages/checks/src/index.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/index.test.ts`
- `testdata/auth/safe.json`
- `testdata/auth/risky.json`
- `testdata/auth/broken.json`
- `apps/cli/README.md`

### Milestones
1. 实现 auth 检查核心逻辑
   - Deliverables: HTTPS、audience/resource、token handling 基础 finding
   - Validation: `corepack pnpm -C packages/checks run test`
2. 接入 CLI auth 命令
   - Deliverables: `auth check <path>` 走真实检查并返回 findings
   - Validation: `corepack pnpm -C apps/cli run test`
3. 补齐 fixtures 与文档
   - Deliverables: auth fixtures 和 README 用法
   - Validation: `corepack pnpm -C apps/cli run test`

### Risks and assumptions
- 只支持本地 JSON 配置。
- 对无法静态验证的安全属性不输出伪阳性“通过”，只提示明显风险。

### Completion criteria
- `auth check` 可输出基础 auth finding。
- HTTPS 和关键配置缺失能检查。
- fixtures、测试、文档补齐到最小可用。

### Progress log
- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

### Final summary
已完成 auth check 最小实现：
- 在 `packages/checks` 新增 `runAuthCheck`，支持本地 JSON auth 配置检查，覆盖 HTTPS、audience/resource 缺失和内联 token 风险。
- 在 CLI 中接入 `auth check <path>` 真实执行，缺少路径时返回 InvalidInput。
- 新增 auth fixtures 和 checks/CLI 测试，并补充 CLI README 示例。

## Active plan: Implement the minimum viable diff command

Status: done
Owner: Codex
Date: 2026-03-13

### Goal
Implement a minimal `diff` command that compares two local JSON metadata/config inputs and reports meaningful structural changes.

### Why
This closes the v0 core command loop so all five planned checks have an end-to-end path through the CLI and reporters.

### Scope
- `packages/checks/`：实现 old/new JSON 结构化 diff。
- `apps/cli/src/index.ts`：将 `diff` 占位命令替换为真实检查入口。
- `testdata/diff/`：补充 stable/risky/broken fixtures。
- `packages/checks/src` 与 `apps/cli/src` 测试：覆盖无变化、关键变化、解析失败路径。
- `apps/cli/README.md`：补充最小用法。

### Out of scope
- 历史版本链路分析。
- 智能语义比对。
- 可视化 diff 页面。

### Expected files
- `packages/checks/src/diff.ts`
- `packages/checks/src/diff.test.ts`
- `packages/checks/src/index.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/index.test.ts`
- `testdata/diff/old.json`
- `testdata/diff/new.json`
- `testdata/diff/stable.json`
- `testdata/diff/broken.json`
- `apps/cli/README.md`

### Milestones
1. 实现 diff 核心逻辑
   - Deliverables: description/tools/install/auth 四类结构变化 finding
   - Validation: `corepack pnpm -C packages/checks run test`
2. 接入 CLI diff 命令
   - Deliverables: `diff <old> <new>` 走真实比较并返回 findings
   - Validation: `corepack pnpm -C apps/cli run test`
3. 补齐 fixtures 与文档
   - Deliverables: diff fixtures 和 README 用法
   - Validation: `corepack pnpm -C apps/cli run test`

### Risks and assumptions
- 只支持本地 JSON 文件。
- v0 先覆盖结构风险变化，不覆盖复杂描述语义。

### Completion criteria
- `diff` 命令可用。
- 关键变化类型已覆盖。
- reporters 可消费 diff 报告。

### Progress log
- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

### Final summary
已完成 diff 最小实现：
- 在 `packages/checks` 新增 `runDiffCheck`，支持 old/new 本地 JSON 对比，覆盖 description、tools 数量、install、auth 结构变化。
- 在 CLI 中接入 `diff <old> <new>` 真实执行，少于两个输入时返回 InvalidInput。
- 新增 diff fixtures 和 checks/CLI 测试，并补充 CLI README 示例。

## Active plan: Harden root scripts and repository entry docs

Status: done
Owner: Codex
Date: 2026-03-13

### Goal
Make the repository directly usable from the root by fixing validation scripts and adding a root README with runnable examples.

### Why
The core commands now work, but the repo still lacks a usable top-level entrypoint and the root scripts fail in environments without a global `pnpm`.

### Scope
- `package.json`：fix root validation scripts to work via `corepack pnpm`.
- `README.md`：add a minimal project overview, command examples, and validation commands.
- `examples/README.md` and `docs/README.md`：replace placeholder copy with minimal useful pointers.

### Out of scope
- New product features.
- GitHub Action implementation.
- Large documentation expansion.

### Expected files
- `package.json`
- `README.md`
- `examples/README.md`
- `docs/README.md`

### Milestones
1. 修复根脚本
   - Deliverables: root `build/test/typecheck/lint` scripts runnable via `corepack pnpm`
   - Validation: `corepack pnpm run typecheck`
2. 补仓库入口 README
   - Deliverables: overview, install, commands, examples, validation
   - Validation: manual doc sanity
3. 补最小 docs/examples 说明
   - Deliverables: docs/examples README updated from placeholders
   - Validation: manual doc sanity

### Risks and assumptions
- Root scripts prefer environment portability over shortest command string.
- Docs stay intentionally minimal and only describe implemented v0 behavior.

### Completion criteria
- Root scripts run in this environment.
- Repository has a top-level README that can guide first use.
- Placeholder docs are replaced where they block trial use.

### Progress log
- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

### Final summary
已完成仓库收口：
- 根级 `package.json` 脚本改为通过 `corepack pnpm` 调用，避免环境里缺少全局 `pnpm` 时失败。
- 新增根 `README.md`，补齐项目概览、支持命令、示例和验证方式。
- 将 `docs/README.md` 与 `examples/README.md` 从占位说明更新为最小可用入口文档。

## Active plan: Implement the GitHub Action wrapper

Status: done
Owner: Codex
Date: 2026-03-13

### Goal
Create a minimal GitHub Action wrapper that runs the CLI in CI, captures machine-readable output, and publishes a markdown summary.

### Why
The repository now has all five core commands. The next highest-value integration is CI consumption through a reusable GitHub Action.

### Scope
- create `packages/github-action/` package with build/typecheck/test/lint scripts
- add `packages/github-action/action.yml`
- implement Node action that executes the built CLI with JSON output
- surface outputs such as report path and exit code
- write a GitHub step summary from the report
- add unit tests for arg construction and summary rendering
- update root README with a minimal workflow example

### Out of scope
- npm publish packaging
- bundled dist artifact for Marketplace release
- advanced annotations or SARIF upload logic

### Expected files
- `packages/github-action/package.json`
- `packages/github-action/tsconfig.json`
- `packages/github-action/action.yml`
- `packages/github-action/src/index.ts`
- `packages/github-action/src/index.test.ts`
- `README.md`

### Milestones
1. 建立 action 包骨架
   - Deliverables: package metadata, tsconfig, action manifest
   - Validation: `corepack pnpm -C packages/github-action run typecheck`
2. 实现 action 执行逻辑
   - Deliverables: CLI arg build, exec, outputs, summary
   - Validation: `corepack pnpm -C packages/github-action run test`
3. 文档和收尾
   - Deliverables: root README workflow example
   - Validation: `corepack pnpm -r run lint`

### Risks and assumptions
- The action assumes the workspace has already built `apps/cli/dist/index.js`.
- For v0, the action consumes JSON output and writes its own markdown summary rather than invoking markdown reporter separately.

### Completion criteria
- GitHub Action package exists and builds.
- Action can run a chosen CLI command with args and write outputs.
- README contains a minimal workflow example.

### Progress log
- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

### Final summary
已完成 GitHub Action wrapper 最小实现：
- 新增 `packages/github-action/` 包和 `action.yml`，提供本地可运行的 Node action。
- Action 通过标准库执行已构建的 CLI，强制生成 JSON 报告，并写入 `exit-code`、`report-path`、`finding-count` outputs 和 step summary。
- 补充了 helper 单元测试，并在根 `README.md` 中加入最小 workflow 示例。

## Active plan: Add baseline ignore support to the CLI

Status: done
Owner: Codex
Date: 2026-03-13

### Goal
Add a minimal baseline mechanism so existing findings can be recorded and suppressed during later CLI runs.

### Why
Now that the five core commands and the GitHub Action wrapper exist, the next practical adoption feature is allowing CI to ignore already-known findings while still failing on new ones.

### Scope
- `apps/cli/src/index.ts`: add `--baseline` and `--write-baseline` global flags
- baseline file format: JSON with stable finding fingerprints
- apply baseline filtering before render and exit-code calculation
- write baseline file from current findings when requested
- `apps/cli/src/index.test.ts`: add baseline generation and suppression tests
- `apps/cli/README.md` and root `README.md`: document minimal baseline usage

### Out of scope
- rule-level ignore syntax in policy files
- per-finding expiration or comments
- partial fingerprint tuning UI

### Expected files
- `apps/cli/src/index.ts`
- `apps/cli/src/index.test.ts`
- `apps/cli/README.md`
- `README.md`

### Milestones
1. baseline load/write helpers
   - Deliverables: parse baseline JSON and emit fingerprints
   - Validation: `corepack pnpm -C apps/cli run typecheck`
2. CLI filtering integration
   - Deliverables: `--baseline` and `--write-baseline` behavior with tests
   - Validation: `corepack pnpm -C apps/cli run test`
3. docs and final validation
   - Deliverables: README updates
   - Validation: `corepack pnpm run test`, `corepack pnpm run lint`

### Risks and assumptions
- Baseline matching uses a deterministic fingerprint of ruleId, check, message, and location.
- v0 baseline is JSON-only to keep the workflow explicit and machine-readable.

### Completion criteria
- CLI can suppress known findings from a baseline file.
- CLI can generate a baseline file from current findings.
- docs explain how to create and consume a baseline.

### Progress log
- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

### Final summary
已完成 CLI baseline 机制最小实现：
- 在 CLI 中新增 `--baseline <path>` 和 `--write-baseline <path>` 两个全局参数。
- baseline 文件采用稳定 JSON 格式并基于 finding fingerprint 过滤已知问题，过滤后再参与渲染和退出码计算。
- 补充了 CLI 测试以及根 README 和 CLI README 的 baseline 使用说明。

## Active plan: Improve SARIF mapping quality

Status: done
Owner: Codex
Date: 2026-03-13

### Goal
Improve the SARIF reporter so downstream security tooling gets richer rule metadata and more stable fingerprints.

### Why
The current SARIF output is syntactically valid but too minimal for high-quality CI consumption. This is the next best leverage point after baseline support.

### Scope
- `packages/reporters/src/index.ts`: enrich SARIF output
- `packages/reporters/src/index.test.ts`: add assertions for rules, levels, and fingerprints

### Out of scope
- SARIF upload integration
- code scanning annotations outside reporter output
- changes to non-SARIF reporter formats

### Expected files
- `packages/reporters/src/index.ts`
- `packages/reporters/src/index.test.ts`

### Milestones
1. rule metadata extraction
   - Deliverables: driver rules array and stable rule indexing
   - Validation: `corepack pnpm -C packages/reporters run test`
2. richer result mapping
   - Deliverables: severity-to-level mapping, partial fingerprints, properties
   - Validation: `corepack pnpm -C packages/reporters run test`
3. final validation
   - Deliverables: repo-level reporter regression passes
   - Validation: `corepack pnpm run test`, `corepack pnpm run lint`

### Risks and assumptions
- SARIF remains v0-oriented and intentionally avoids full specification coverage.
- Rule descriptions are derived from existing finding fields because dedicated rule catalogs do not exist yet.

### Completion criteria
- SARIF includes driver rule metadata.
- Results contain stable identifiers and better severity mapping.
- Reporter tests pass after the mapping upgrade.

### Progress log
- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

### Final summary
已完成 SARIF 映射增强：
- `packages/reporters` 现在会为唯一 `ruleId` 生成 `tool.driver.rules`，并为结果填充 `ruleIndex`。
- result 增加了更合理的 SARIF `level` 映射、`partialFingerprints` 和结构化 `properties`。
- reporter 包和全仓库回归验证均已通过。

## Active plan: Add minimum reference docs for the implemented v0 surface

Status: done
Owner: Codex
Date: 2026-03-13

### Goal
Create a minimal but usable reference set in `docs/` so the implemented commands, policy behavior, and examples are documented in one place.

### Why
The codebase now supports the v0 CLI, baseline workflow, GitHub Action wrapper, and reporters, but the `docs/` directory still lacks the reference material that the repository guidance expects.

### Scope
- expand `docs/README.md` into an index
- add `docs/POLICY_REFERENCE.md`
- add `docs/RULES.md`
- add `docs/CONFIG_EXAMPLES.md`
- add `docs/ROADMAP.md`
- link these from the root `README.md`

### Out of scope
- full end-user guides for every client ecosystem
- exhaustive schemas or full threat-model writeups
- changes to command behavior

### Expected files
- `docs/README.md`
- `docs/POLICY_REFERENCE.md`
- `docs/RULES.md`
- `docs/CONFIG_EXAMPLES.md`
- `docs/ROADMAP.md`
- `README.md`

### Milestones
1. docs index and references
   - Deliverables: docs index, policy reference, rule reference
   - Validation: manual doc sanity
2. examples and roadmap
   - Deliverables: config examples and roadmap docs
   - Validation: manual doc sanity
3. root cross-links
   - Deliverables: root README doc links
   - Validation: manual doc sanity

### Risks and assumptions
- Docs describe the implemented minimal v0 behavior rather than aspirational future coverage.
- Baseline and GitHub Action workflows are documented at a practical, not exhaustive, level.

### Completion criteria
- `docs/` contains the expected top-level reference files.
- Root README points users to the reference docs.
- Docs stay aligned with the current implemented behavior.

### Progress log
- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

### Final summary
已完成最小 reference 文档集：
- 在 `docs/` 中新增 `POLICY_REFERENCE.md`、`RULES.md`、`CONFIG_EXAMPLES.md`、`ROADMAP.md`。
- 将 `docs/README.md` 扩展为索引页，并在根 `README.md` 中加入文档入口链接。
- 文档内容与当前已实现的 CLI、baseline、GitHub Action 和 reporter 行为保持一致，不引入超前承诺。

## Active plan: Add ignore files, inline suppressions, and risk budget behavior

Status: done
Owner: Codex
Date: 2026-03-13

### Goal
Add practical noise-control controls so CI can ignore known findings, suppress specific local-file cases inline, and tolerate a limited amount of accepted risk.

### Why
The baseline mechanism alone is not enough for long-lived repositories. A direct ignore file, inline suppressions, and risk-budget handling are the next productization step.

### Scope
- `apps/cli/src/index.ts`: add ignore file, inline suppression, and risk budget handling
- `apps/cli/src/index.test.ts`: add suppression and risk-budget tests
- `testdata/install/`: add inline suppression fixture
- `examples/`: add ignore file example
- `apps/cli/README.md` and `README.md`: document ignore/suppression/risk-budget behavior

### Out of scope
- expiration windows for suppressions
- remote suppression services
- policy-level suppression syntax

### Expected files
- `apps/cli/src/index.ts`
- `apps/cli/src/index.test.ts`
- `testdata/install/suppressed-inline.json`
- `examples/mcp-guard-ignore.json`
- `apps/cli/README.md`
- `README.md`

### Milestones
1. ignore and inline suppression matching
   - Deliverables: ignore file parsing and JSON inline suppression loading
   - Validation: `corepack pnpm -C apps/cli run typecheck`
2. risk budget and CLI integration
   - Deliverables: `--ignore-file`, `--risk-budget`, metadata summaries, tests
   - Validation: `corepack pnpm -C apps/cli run test`
3. docs and repo validation
   - Deliverables: docs/examples updates
   - Validation: `corepack pnpm run typecheck`, `corepack pnpm run test`, `corepack pnpm run lint`

### Risks and assumptions
- Ignore file format is JSON for deterministic parsing.
- Inline suppression currently targets local JSON inputs only.
- Risk budget counts active findings after baseline and suppression are applied.

### Completion criteria
- ignore file is usable
- inline suppression covers a typical local JSON case
- risk budget interaction with fail-on is testable and documented
- docs explain how to ignore and restore checks

### Progress log
- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

### Final summary
已完成 ignore、inline suppression 和 risk budget 最小实现：
- CLI 新增 `--ignore-file` 和 `--risk-budget`，并支持自动读取 `.mcp-guard-ignore`。
- 本地 JSON 输入现已支持通过 `mcpGuard.suppressions` 做最小 inline suppression。
- suppressions、baseline 和 risk budget 会在 finding 过滤后再影响渲染与退出码，并在 report metadata 中保留 suppressed/risk-budget 摘要。

## Active plan: Improve GitHub Action outputs and add a PR-friendly Markdown summary template

Status: done
Owner: Codex
Date: 2026-03-13

### Goal
Make the GitHub Action easier to consume in CI and pull requests by stabilizing outputs and generating a denser markdown summary.

### Why
The current Action works, but its outputs are too thin for CI workflows and the summary is not optimized for PR review.

### Scope
- `packages/github-action/src/index.ts`: richer outputs and summary rendering
- `packages/github-action/src/index.test.ts`: helper tests for outputs and PR summary
- `packages/github-action/action.yml`: expand documented inputs and outputs
- `README.md`: add a clearer workflow example and output consumption notes

### Out of scope
- automatic PR comments
- Marketplace packaging
- SARIF upload orchestration

### Expected files
- `packages/github-action/src/index.ts`
- `packages/github-action/src/index.test.ts`
- `packages/github-action/action.yml`
- `README.md`

### Milestones
1. output contract expansion
   - Deliverables: explicit report and artifact outputs
   - Validation: `corepack pnpm -C packages/github-action run typecheck`
2. PR summary template
   - Deliverables: richer markdown summary and tests
   - Validation: `corepack pnpm -C packages/github-action run test`
3. docs and repo validation
   - Deliverables: workflow example and output docs
   - Validation: `corepack pnpm run test`, `corepack pnpm run lint`

### Risks and assumptions
- The action continues to rely on an already-built CLI artifact.
- JSON remains the internal source of truth even when SARIF output paths are surfaced.

### Completion criteria
- action outputs are clearer and reusable
- PR-friendly markdown summary is implemented
- docs explain how to consume outputs in CI

### Progress log
- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

### Final summary
已完成 GitHub Action 输出增强和 PR-friendly summary：
- Action outputs 扩展为 `json-report-path`、`sarif-report-path`、`markdown-summary-path` 等稳定字段。
- Action 现在会同时生成 JSON 报告、SARIF 报告和保存到磁盘的 Markdown summary，并继续写入 step summary。
- README 已补充更清晰的 workflow 示例和 outputs 消费方式。

## Active plan: Expand policy packs for strict and enterprise use cases

Status: done
Owner: Codex
Date: 2026-03-13

### Goal
Turn policies from basic examples into usable packs for local default use, strict enforcement, enterprise review, and CI rollout.

### Why
The current policy files are out of sync with the implemented rules and do not yet provide the selection surface expected by the second task pack.

### Scope
- update `policies/base.yaml` and `policies/strict.yaml`
- add `policies/enterprise.yaml`
- add `policies/ci-friendly.yaml`
- extend policy-engine tests to load and compare the packs
- update policy docs and root usage examples

### Out of scope
- dynamic remote policy loading
- policy UI/editor tooling
- new rule implementations

### Expected files
- `policies/base.yaml`
- `policies/strict.yaml`
- `policies/enterprise.yaml`
- `policies/ci-friendly.yaml`
- `policies/README.md`
- `packages/policy-engine/src/index.test.ts`
- `docs/POLICY_REFERENCE.md`
- `README.md`

### Milestones
1. align existing packs to current rule ids
   - Deliverables: base and strict updated to implemented rules
   - Validation: `corepack pnpm -C packages/policy-engine run test`
2. add new packs and test coverage
   - Deliverables: enterprise and ci-friendly packs with loading assertions
   - Validation: `corepack pnpm -C packages/policy-engine run test`
3. docs and examples
   - Deliverables: policy comparison docs and command examples
   - Validation: `corepack pnpm run test`, `corepack pnpm run lint`

### Risks and assumptions
- Policy packs only set behavior for currently implemented rule ids.
- Enterprise and CI-friendly are intentionally descriptive presets, not exhaustive compliance bundles.

### Completion criteria
- base, strict, enterprise, and ci-friendly packs exist
- strategy differences are documented
- tests cover loading and key differences

### Progress log
- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

### Final summary
已完成 policy packs 扩展：
- `base` 和 `strict` 已对齐到当前真实 rule id，不再引用旧占位规则名。
- 新增 `enterprise.yaml` 和 `ci-friendly.yaml` 两类策略包。
- policy-engine 测试、policy 文档和根 README 已补充 pack 差异与示例调用。

## Active plan: Add a Server Card provider interface and metadata normalization layer

Status: done
Owner: Codex
Date: 2026-03-13

### Goal
Create a reusable metadata provider and normalization layer so later trust scoring and deeper checks have a stable source abstraction.

### Why
Current commands parse source-specific JSON directly. A metadata package is the next structural step before trust scoring and richer registry/identity checks.

### Scope
- add `packages/metadata/` package
- add shared metadata types to `packages/core`
- implement a minimal local JSON Server Card provider
- implement normalization into a shared metadata shape
- add fixture and unit tests
- add architecture docs

### Out of scope
- trust scoring itself
- broad remote metadata source support
- caching and invalidation layers

### Expected files
- `packages/core/src/model.ts`
- `packages/metadata/package.json`
- `packages/metadata/tsconfig.json`
- `packages/metadata/src/index.ts`
- `packages/metadata/src/index.test.ts`
- `testdata/metadata/server-card.json`
- `docs/ARCHITECTURE.md`
- `docs/README.md`
- `README.md`

### Milestones
1. shared types and metadata package
   - Deliverables: core metadata types and package scaffold
   - Validation: `corepack pnpm -C packages/metadata run typecheck`
2. provider and normalization
   - Deliverables: serverCardProvider, normalization API, tests
   - Validation: `corepack pnpm -C packages/metadata run test`
3. docs and repo validation
   - Deliverables: architecture docs and root links
   - Validation: `corepack pnpm run typecheck`, `corepack pnpm run test`, `corepack pnpm run lint`

### Risks and assumptions
- The metadata package starts with local JSON inputs only.
- Existing commands are not yet rewritten to depend on the new provider layer.

### Completion criteria
- provider interface exists
- minimal Server Card provider is testable
- normalized metadata shape is reusable
- docs explain provider and normalization roles

### Progress log
- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

### Completion summary
- Added shared normalized metadata types in `packages/core` for provider outputs and downstream checks.
- Added a new `packages/metadata` package with a reusable `MetadataProvider` interface, local JSON Server Card provider, and normalization helpers.
- Added metadata fixture coverage and architecture documentation so later trust scoring can build on a stable abstraction.
- Validation passed:
  - `corepack pnpm install`
  - `corepack pnpm -C packages/core run typecheck`
  - `corepack pnpm -C packages/metadata run build`
  - `corepack pnpm -C packages/metadata run typecheck`
  - `corepack pnpm -C packages/metadata run test`
  - `corepack pnpm -C packages/metadata run lint`
  - `corepack pnpm run typecheck`
  - `corepack pnpm run test`
  - `corepack pnpm run lint`

## Active plan: Implement metadata trust scoring and surfaced trust signals

Status: done
Owner: Codex
Date: 2026-03-13

### Goal
Add a minimal trust scoring layer on top of normalized metadata so reports can explain which trust signals are present, which are missing, and how policy changes trust-related severities.

### Why
The metadata package now normalizes input consistently, but there is still no reusable trust summary that downstream checks, reporters, and CI can consume.

### Scope
- add shared trust types in `packages/core`
- implement trust signal evaluation in `packages/metadata`
- map trust signals into a trust band and reusable findings
- allow policy rules to override trust signal severity or disable individual trust rules
- surface trust summary in reporters
- add fixtures, tests, docs, and examples

### Out of scope
- percentage-based or ML scoring
- remote reputation services
- rewriting existing command implementations around trust scoring

### Expected files
- `packages/core/src/model.ts`
- `packages/metadata/src/index.ts`
- `packages/metadata/src/index.test.ts`
- `packages/policy-engine/src/index.ts`
- `packages/policy-engine/src/index.test.ts`
- `packages/reporters/src/index.ts`
- `packages/reporters/src/index.test.ts`
- `testdata/metadata/*.json`
- `examples/*`
- `docs/ARCHITECTURE.md`
- `README.md`

### Milestones
1. trust model and scoring engine
   - Deliverables: shared trust types, signal evaluation, trust band mapping
   - Validation: `corepack pnpm -C packages/metadata run typecheck`
2. policy and reporter integration
   - Deliverables: policy-aware trust findings and rendered trust summary
   - Validation: `corepack pnpm -C packages/metadata run test`, `corepack pnpm -C packages/reporters run test`
3. docs and repo validation
   - Deliverables: examples, docs, and passing workspace validation
   - Validation: `corepack pnpm run typecheck`, `corepack pnpm run test`, `corepack pnpm run lint`

### Risks and assumptions
- Trust scoring remains advisory in this task and is surfaced via report metadata plus generated trust findings.
- Existing CLI commands are not being rewritten to call trust scoring automatically in this card.

### Completion criteria
- trust signals are defined and stable
- trust band and summary are reusable
- policy can change at least part of trust evaluation behavior
- reporters and docs expose the trust summary clearly

### Progress log
- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

### Completion summary
- Added shared trust types in `packages/core` and a reusable trust-scoring engine in `packages/metadata`.
- Defined a fixed v0 trust signal set and mapped it into stable trust bands plus policy-aware trust findings.
- Added default policy trust rules, reporter trust summaries, fixtures, examples, and architecture/readme updates.
- Validation passed:
  - `corepack pnpm run typecheck`
  - `corepack pnpm run test`
  - `corepack pnpm run lint`

## Active plan: Deepen registry lint with schema validation and richer diagnostics

Status: done
Owner: Codex
Date: 2026-03-13

### Goal
Make `registry lint` more actionable by adding deeper response-shape validation, clearer failure classification, and higher-quality diagnostics.

### Why
The current implementation only checks reachability, `version`, and CORS, which is not enough to explain common registry metadata failures.

### Scope
- expand registry response validation beyond `version`
- add clearer classification for invalid URL, network, timeout, HTTP status, invalid JSON, and schema failures
- add a minimal content-type check
- extend tests, fixtures, and docs for richer registry diagnostics

### Out of scope
- authenticated registry flows
- broad compatibility probing
- runtime proxy behavior

### Expected files
- `packages/checks/src/registry.ts`
- `packages/checks/src/registry.test.ts`
- `packages/policy-engine/src/index.ts`
- `apps/cli/src/index.test.ts`
- `docs/RULES.md`
- `README.md`
- `testdata/registry/*.json`

### Milestones
1. schema and diagnostic classification
   - Deliverables: expanded registry findings and response metadata
   - Validation: `corepack pnpm -C packages/checks run test`
2. CLI and fixture coverage
   - Deliverables: richer registry fixtures and CLI assertions
   - Validation: `corepack pnpm -C apps/cli run test`
3. docs and repo validation
   - Deliverables: updated docs and passing workspace validation
   - Validation: `corepack pnpm run typecheck`, `corepack pnpm run test`, `corepack pnpm run lint`

### Risks and assumptions
- The schema remains intentionally minimal and deterministic.
- New registry rule ids will be added only where they improve diagnostic clarity.

### Completion criteria
- registry lint points to specific shape errors
- failure categories are reflected in finding details
- fixtures cover representative broken responses
- docs describe the deeper validation surface

### Progress log
- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

### Completion summary
- Expanded `registry lint` with response classification, content-type diagnostics, and deeper shape validation for `name` and `endpoints`.
- Added new registry rules for schema and content-type findings, plus CLI coverage for JSON diagnostics.
- Added representative broken registry fixtures and updated rule/readme documentation.
- Validation passed:
  - `corepack pnpm -C packages/checks run test`
  - `corepack pnpm -C packages/checks run build`
  - `corepack pnpm -C packages/policy-engine run build`
  - `corepack pnpm -C apps/cli run test`
  - `corepack pnpm run typecheck`
  - `corepack pnpm run test`
  - `corepack pnpm run lint`

## Active plan: Expand install scan to support more client config formats and environment redaction

Status: done
Owner: Codex
Date: 2026-03-13

### Goal
Make `install scan` more usable by supporting a couple of common config formats, extracting environment variables structurally, and redacting obvious secrets in output.

### Why
The current install scan only accepts one JSON shape and exposes env keys without any redaction strategy, which is too narrow for real client configs.

### Scope
- add a parser interface for install config inputs
- support YAML install configs
- support embedded install config in `package.json`
- extract env variables consistently across formats
- redact common sensitive env keys and values in findings/report metadata
- add fixtures, tests, and docs

### Out of scope
- covering every client config format
- executing install commands
- deep shell semantics or templating evaluation

### Expected files
- `packages/checks/src/install.ts`
- `packages/checks/src/install.test.ts`
- `packages/checks/package.json`
- `testdata/install/*`
- `docs/RULES.md`
- `README.md`

### Milestones
1. parser and redaction layer
   - Deliverables: parser abstraction, YAML support, package.json embedded config support, env redaction
   - Validation: `corepack pnpm -C packages/checks run test`
2. fixtures and examples
   - Deliverables: multi-format fixtures and docs for supported shapes
   - Validation: `corepack pnpm -C apps/cli exec mcp-guard install scan <fixture>`
3. repo validation and task closeout
   - Deliverables: passing workspace validation and completed task record
   - Validation: `corepack pnpm run typecheck`, `corepack pnpm run test`, `corepack pnpm run lint`

### Risks and assumptions
- Redaction is intentionally heuristic and only targets common secret patterns.
- Parser support remains format-limited and shape-limited in this card.

### Completion criteria
- install scan supports more than the original JSON shape
- env extraction and redaction are visible in output metadata/details
- fixtures cover multi-format and secret-like env cases
- docs explain supported formats and redaction limits

### Progress log
- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

### Completion summary
- Added a parser layer to `install scan` and expanded support to YAML plus embedded `mcp.install` config inside `package.json`.
- Added structured env extraction and heuristic secret redaction with `redactedEnvKeys` surfaced in report metadata and findings.
- Added multi-format fixtures, install tests, and documentation updates for supported shapes and redaction limits.
- Validation passed:
  - `corepack pnpm install`
  - `corepack pnpm -C packages/checks run test`
  - `corepack pnpm -C packages/checks run build`
  - `corepack pnpm -C apps/cli run build`
  - `node apps/cli/dist/index.js install scan ./testdata/install/safe.yaml`
  - `corepack pnpm run typecheck`
  - `corepack pnpm run test`
  - `corepack pnpm run lint`

## Active plan: Deepen identity check with normalization, source precedence, and drift categories

Status: done
Owner: Codex
Date: 2026-03-13

### Goal
Make `identity check` more stable and explainable by adding normalization, explicit source precedence, and categorized drift findings.

### Why
The current implementation compares raw values in first-seen order, which makes results noisy and not very useful for maintainers deciding which source should win.

### Scope
- add centralized identity normalization
- define source precedence rules
- classify findings into missing, mismatch, conflict, and stale
- improve finding details and report metadata
- add fixtures, tests, and docs

### Out of scope
- fuzzy identity lookup
- automatic identity repair
- folding trust scoring into identity logic

### Expected files
- `packages/checks/src/identity.ts`
- `packages/checks/src/identity.test.ts`
- `packages/policy-engine/src/index.ts`
- `apps/cli/src/index.test.ts`
- `testdata/identity/*`
- `docs/RULES.md`
- `README.md`

### Milestones
1. normalization and precedence
   - Deliverables: normalized comparison and precedence-based baseline selection
   - Validation: `corepack pnpm -C packages/checks run test`
2. drift categories and fixtures
   - Deliverables: mismatch/conflict/stale details plus targeted fixtures and CLI assertion
   - Validation: `corepack pnpm -C apps/cli run test`
3. docs and repo validation
   - Deliverables: updated docs and completed task record
   - Validation: `corepack pnpm run typecheck`, `corepack pnpm run test`, `corepack pnpm run lint`

### Risks and assumptions
- Source precedence is fixed and intentionally simple in this card.
- Version staleness only uses a minimal numeric-dot version comparator.

### Completion criteria
- identity normalization reduces obvious false drift
- precedence behavior is testable and documented
- findings expose drift categories clearly
- docs explain precedence and normalization boundaries

### Progress log
- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

### Completion summary
- Added centralized identity normalization for `id`, `name`, and `version`, plus fixed source precedence for baseline selection.
- Added categorized findings for `missing`, `mismatch`, `conflict`, and `stale`, with new `identity.conflict` and `identity.stale` rules.
- Added identity fixtures, CLI JSON assertions, default policy entries, and docs covering normalization and precedence.
- Validation passed:
  - `corepack pnpm -C packages/checks run test`
  - `corepack pnpm -C packages/checks run build`
  - `corepack pnpm -C packages/policy-engine run build`
  - `corepack pnpm -C apps/cli run test`
  - `corepack pnpm run typecheck`
  - `corepack pnpm run test`
  - `corepack pnpm run lint`

## Active plan: Deepen auth check with audience, resource, and token-handling rules

Status: done
Owner: Codex
Date: 2026-03-13

### Goal
Improve `auth check` so it catches more meaningful audience/resource and token-handling risks with clearer machine-readable classifications.

### Why
The current auth check only catches insecure HTTP, missing audience/resource, and inline tokens. It does not distinguish config issues from protocol risk or token passthrough behavior.

### Scope
- add more auth-related rule types
- deepen audience/resource validation
- add token passthrough checks
- improve finding details and classification
- add fixtures, tests, and docs

### Out of scope
- full OAuth flow support
- real remote authorization tests
- secret manager integrations

### Expected files
- `packages/checks/src/auth.ts`
- `packages/checks/src/auth.test.ts`
- `packages/policy-engine/src/index.ts`
- `apps/cli/src/index.test.ts`
- `testdata/auth/*`
- `docs/RULES.md`
- `README.md`

### Milestones
1. rules and classification
   - Deliverables: richer auth rule set and details classification
   - Validation: `corepack pnpm -C packages/checks run test`
2. fixtures and CLI coverage
   - Deliverables: expanded risky fixtures and JSON output assertions
   - Validation: `corepack pnpm -C apps/cli run test`
3. docs and repo validation
   - Deliverables: docs updates and passing workspace validation
   - Validation: `corepack pnpm run typecheck`, `corepack pnpm run test`, `corepack pnpm run lint`

### Risks and assumptions
- Token passthrough detection remains heuristic and focused on obvious patterns.
- Resource validation only treats explicit `http://` resources as insecure.

### Completion criteria
- auth check emits more granular findings
- details classify config issues vs protocol risks
- fixtures cover passthrough and insecure resource cases
- docs explain current auth depth and limits

### Progress log
- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

### Completion summary
- Expanded `auth check` with deeper audience/resource and token-handling rules, including `auth.resource-https-required` and `auth.token-passthrough`.
- Added machine-readable auth classifications for config parsing, config issues, protocol risk, and token handling.
- Added passthrough and insecure-resource fixtures, CLI JSON assertions, policy defaults, and updated docs for the deeper auth surface.
- Validation passed:
  - `corepack pnpm -C packages/checks run test`
  - `corepack pnpm -C packages/checks run build`
  - `corepack pnpm -C packages/policy-engine run build`
  - `corepack pnpm -C apps/cli run test`
  - `corepack pnpm -C apps/cli run build`
  - `node apps/cli/dist/index.js auth check ./testdata/auth/passthrough.json`
  - `corepack pnpm run typecheck`
  - `corepack pnpm run test`
  - `corepack pnpm run lint`

## Active plan: Add diff risk scoring and tool description ambiguity lint

Status: done
Owner: Codex
Date: 2026-03-13

### Goal
Make `diff` more review-friendly by assigning explainable risk levels and linting obviously ambiguous tool descriptions.

### Why
The current diff only reports that changes happened. It does not help reviewers quickly understand whether the change is low-risk wording churn or higher-risk tool/auth/install surface drift.

### Scope
- assign stable risk levels to diff findings
- add tool parameter surface change detection
- add high-value tool description ambiguity lint
- surface diff risk summary in report metadata and reporters
- add fixtures, tests, docs, and example outputs

### Out of scope
- offline model behavior replay
- automatic tool description rewriting
- deep semantic equivalence of parameter schemas

### Expected files
- `packages/core/src/model.ts`
- `packages/checks/src/diff.ts`
- `packages/checks/src/diff.test.ts`
- `packages/policy-engine/src/index.ts`
- `packages/reporters/src/index.ts`
- `packages/reporters/src/index.test.ts`
- `apps/cli/src/index.test.ts`
- `testdata/diff/*`
- `examples/*`
- `docs/RULES.md`
- `README.md`

### Milestones
1. diff risk model and findings
   - Deliverables: risk levels, param-change rule, ambiguity lint
   - Validation: `corepack pnpm -C packages/checks run test`
2. reporter and fixture coverage
   - Deliverables: diff risk summary in reporters, CLI JSON assertion, example output
   - Validation: `corepack pnpm -C apps/cli run test`, `corepack pnpm -C packages/reporters run test`
3. docs and repo validation
   - Deliverables: docs updates and passing workspace validation
   - Validation: `corepack pnpm run typecheck`, `corepack pnpm run test`, `corepack pnpm run lint`

### Risks and assumptions
- Risk levels are heuristic and intentionally simple.
- Ambiguity lint only targets a few high-value patterns in this card.

### Completion criteria
- diff findings expose risk levels clearly
- ambiguity lint produces real findings on representative fixtures
- reporters summarize diff risk cleanly
- docs explain current heuristics and limits

### Progress log
- [x] Milestone 1
- [x] Milestone 2
- [x] Milestone 3

### Completion summary
- Added diff risk scoring with per-finding `riskLevel`, aggregated `diffRisk` summary metadata, and explainable changed-area tracking.
- Added `diff.tool-params-changed` and `diff.tool-description-ambiguous` to catch higher-risk parameter drift and high-value description ambiguity patterns.
- Surfaced diff risk summary in reporters, added CLI JSON assertions, fixtures, example output, and updated docs for the new review surface.
- Validation passed:
  - `corepack pnpm -C packages/checks run test`
  - `corepack pnpm -C packages/checks run build`
  - `corepack pnpm -C packages/reporters run test`
  - `corepack pnpm -C apps/cli run build`
  - `corepack pnpm -C apps/cli run test`
  - `node apps/cli/dist/index.js diff ./testdata/diff/tool-old.json ./testdata/diff/tool-new.json`
  - `corepack pnpm run typecheck`
  - `corepack pnpm run test`
  - `corepack pnpm run lint`

## Active plan: Public repository hardening and launch prep

Status: in-progress
Owner: Codex
Date: 2026-03-14

### Goal
Prepare the public GitHub repository for external contributors by enabling key repository protections, adding contribution templates, publishing an alpha release, and opening initial public issues.

### Scope
- enable discussions
- enable key security settings and branch protection on `main`
- add issue forms and PR template under `.github/`
- add a real CLI output example to `README.md`
- publish `v0.1.0-alpha.1`
- create public launch issues for roadmap, known limitations, and feedback

### Out of scope
- full CI redesign
- marketplace/release automation
- contribution guide beyond minimal templates

### Expected files
- `.github/ISSUE_TEMPLATE/*`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `README.md`

### Milestones
1. local repo templates and docs
   - Deliverables: issue forms, PR template, README output example
2. remote repo settings and release
   - Deliverables: security settings, branch protection, discussions, alpha release
3. public launch issues and final push
   - Deliverables: pushed template/docs changes and three public issues

### Risks and assumptions
- GitHub branch protection will be configured without required status checks because the repo does not yet expose a stable workflow check set.
- Some security features are GitHub-plan dependent; unsupported toggles will be applied on a best-effort basis.

### Completion criteria
- main branch has protection
- repository has discussions enabled
- issue forms and PR template are live
- `v0.1.0-alpha.1` exists
- three public issues are open
