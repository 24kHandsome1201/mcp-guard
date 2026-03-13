# AGENTS.md

Repository guidance for Codex and other coding agents.

## 1. Repository intent

`mcp-guard` is a preflight governance tool for MCP servers and registries.

Primary deliverables:
- a CLI for local and CI checks
- reusable TypeScript packages for checks, policy evaluation, and reporting
- a GitHub Action wrapper for CI integration

Primary v0 capabilities:
- `registry lint`
- `install scan`
- `identity check`
- `auth check`
- `diff`
- report output in terminal, JSON, Markdown, and SARIF

Out of scope for v0:
- runtime proxying or gateway features
- full source-code vulnerability auditing
- executing arbitrary install commands
- hosting a managed registry service

## 2. Repository structure

Expected top-level layout:
- `apps/cli/` command entrypoints and CLI wiring
- `packages/core/` shared types, errors, and result models
- `packages/checks/` rule implementations grouped by domain
- `packages/policy-engine/` policy schema, loading, merging, and evaluation
- `packages/reporters/` terminal, JSON, Markdown, and SARIF output
- `packages/github-action/` GitHub Action wrapper
- `docs/` references, threat model, rule docs, and roadmap
- `examples/` sample configs, policies, and reports
- `testdata/` safe, risky, and broken fixtures
- `scripts/` repo maintenance scripts

## 3. Default working mode

Before making changes, read these files when they exist:
- `README.md`
- `AGENTS.md`
- `PLANS.md`
- root `package.json`
- workspace config files
- the package-level `package.json` for the area you are changing

Keep changes tightly scoped to the current task.
Do not opportunistically refactor unrelated areas.
Prefer small, reviewable diffs.

If the task touches multiple packages, introduces a new command, changes public types, changes reporter output, changes policy behavior, or is likely to exceed about 200 lines of net-new logic, create or update a plan in `PLANS.md` before implementing.

## 4. Engineering principles

- Prefer deterministic behavior.
- Prefer pure functions over stateful services when practical.
- Prefer explicit types and discriminated unions over loosely shaped objects.
- Keep domain models stable and reusable across CLI, reporters, and tests.
- Design checks to be composable and independently testable.
- Avoid hidden network dependencies in tests.
- Do not execute third-party install commands during tests.
- Make user-facing findings actionable and concise.
- Keep machine-readable outputs stable.

## 5. TypeScript conventions

- Use TypeScript with strict settings.
- Prefer named exports.
- Avoid default exports unless required by framework conventions.
- Keep files focused on one concern.
- Prefer `async` boundaries only where I/O actually exists.
- Validate external input at boundaries.
- Avoid `any`; use `unknown` plus narrowing when needed.
- Keep side effects near the CLI or integration layer.

## 6. Naming and file layout

- Command files should mirror CLI command names.
- Rule files should be grouped by domain, such as `registry`, `install`, `identity`, `auth`, and `diff`.
- Shared types belong in `packages/core` unless they are package-private.
- Test filenames should mirror source filenames when possible.
- Fixture names should describe intent clearly, such as `safe-basic`, `risky-sudo`, `broken-missing-id`.

## 7. Dependency policy

Add new dependencies only when they clearly reduce complexity or maintenance cost.
Before adding a dependency:
- check whether the repo already has an equivalent utility
- prefer standard library or existing workspace packages
- prefer small, maintained packages with stable APIs

Document why a new dependency is needed in the change summary.

## 8. CLI and output rules

Maintain a stable CLI contract where practical.
Any user-visible command change should update:
- CLI help text
- README examples
- tests or snapshots covering the output

Supported output modes should remain consistent:
- terminal summary for humans
- JSON for CI and automation
- Markdown for pull request comments
- SARIF for security tooling

## 9. Policy rules

Policy behavior should be explicit and predictable.
When changing policy logic:
- update schema and validation together
- add or update fixture coverage
- update policy reference docs
- preserve backward compatibility when reasonable

Default policy should be conservative but usable.
Strict policy can be more opinionated.

## 10. Testing rules

Every meaningful change should include validation.
Use the smallest effective test surface first:
- unit tests for pure logic
- fixture tests for rules and reporters
- CLI integration tests for command behavior

Required coverage areas for high-risk changes:
- command parsing
- auth checks
- identity matching
- policy merging
- reporter output structure

Tests should avoid live internet calls unless a task explicitly targets integration behavior.

## 11. Validation commands

Prefer these commands when available:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

If a package supports targeted validation, use the narrowest command that proves the change.
For cross-cutting changes, run the broader repo-level validation before finishing.

## 12. Documentation rules

Update documentation when any of the following changes:
- command names or flags
- policy schema or defaults
- report shape
- repository structure
- contributor workflow

At minimum, keep these files aligned when they exist:
- `README.md`
- `docs/POLICY_REFERENCE.md`
- `docs/RULES.md`
- `docs/CONFIG_EXAMPLES.md`
- `docs/ROADMAP.md`

## 13. Definition of done

A task is done when all of the following are true:
- the implementation matches the requested scope
- changed code compiles or typechecks
- relevant tests were added or updated
- relevant validation commands were run successfully
- affected docs were updated
- no unrelated files were changed
- the final summary lists changed files, validations run, and any remaining limitations

## 14. Planning protocol

Use `PLANS.md` for larger or multi-step work.
A plan should include:
- goal
- scope
- out of scope
- files likely to change
- milestones
- validation steps
- risks or assumptions
- completion criteria

During execution:
- complete one milestone at a time
- run validation after each milestone when practical
- update plan status as work progresses
- do not silently expand scope; amend the plan first

## 15. Change summary format

At the end of each task, provide a concise summary with:
1. what changed
2. which files changed
3. validation commands run and results
4. any follow-up work or known limitations

## 16. Task-specific notes for this repository

Priority order for initial implementation:
1. repo bootstrap and shared types
2. reporter skeletons
3. `registry lint`
4. `install scan`
5. `identity check`
6. `auth check`
7. `diff`
8. GitHub Action wrapper
9. docs, fixtures, and examples hardening

When implementing checks, prefer a common pattern:
- parse input
- normalize metadata
- run rule set
- collect findings
- render report
- map severity to exit code

Keep this file concise and durable. Put task-specific details in `PLANS.md`.
