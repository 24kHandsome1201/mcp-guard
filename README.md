# mcp-guard

`mcp-guard` is a preflight governance tool for MCP servers and registries.

Current v0 surface:
- `registry lint`
- `install scan`
- `identity check`
- `auth check`
- `diff`
- report output in terminal, JSON, Markdown, and SARIF

## Workspace Setup

```bash
corepack pnpm install
```

## Validation

```bash
corepack pnpm run typecheck
corepack pnpm run test
corepack pnpm run lint
```

## CLI Examples

```bash
# Registry endpoint checks
corepack pnpm -C apps/cli exec mcp-guard registry lint http://127.0.0.1:8080

# Local install profile checks
corepack pnpm -C apps/cli exec mcp-guard install scan ./testdata/install/safe.json

# Identity drift checks across local inputs
corepack pnpm -C apps/cli exec mcp-guard identity check \
  ./testdata/identity/registry.json \
  ./testdata/identity/manifest.json

# Auth config smoke checks
corepack pnpm -C apps/cli exec mcp-guard auth check ./testdata/auth/safe.json

# Structural diff checks
corepack pnpm -C apps/cli exec mcp-guard diff \
  ./testdata/diff/old.json \
  ./testdata/diff/new.json

# Use a stricter policy pack
corepack pnpm -C apps/cli exec mcp-guard \
  --policy ./policies/strict.yaml \
  auth check ./testdata/auth/risky.json
```

## Real Output Example

Terminal output from:
`node apps/cli/dist/index.js diff ./testdata/diff/tool-old.json ./testdata/diff/tool-new.json`

```text
Report: diff
Total findings: 6
Started: 2026-03-13T15:47:00.838Z
Finished: 2026-03-13T15:47:00.840Z
Diff risk: high (description, tools, tool-params)

By severity:
critical: 0
high: 0
medium: 6
low: 0
info: 0

Findings:
- [medium] diff: Description changed
- [medium] diff: Tool surface changed
- [medium] diff: Tool parameter surface changed for write_note
- [medium] diff: Tool write_note has an ambiguous description
- [medium] diff: Tool write_note_fast has an ambiguous description
- [medium] diff: Multiple tools share the same description
```

## GitHub Action

The repository includes a local GitHub Action wrapper at `./packages/github-action/action.yml`.

Minimal workflow example:

```yaml
name: mcp-guard

on:
  pull_request:
  push:

jobs:
  guard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: corepack enable
      - run: corepack pnpm install
      - run: corepack pnpm -C apps/cli run build
      - run: corepack pnpm -C packages/github-action run build
      - uses: ./packages/github-action
        with:
          command: "diff"
          args: '["./testdata/diff/old.json","./testdata/diff/new.json"]'
```

Action behavior:
- forces JSON output to a temporary report file and also emits a SARIF artifact path
- writes `exit-code`, `report-path`, `json-report-path`, `sarif-report-path`, `markdown-summary-path`, and `finding-count` outputs
- publishes a PR-friendly GitHub step summary and also saves the markdown summary to disk

Example output consumption:

```yaml
      - id: guard
        uses: ./packages/github-action
        with:
          command: "diff"
          args: '["./testdata/diff/old.json","./testdata/diff/new.json"]'

      - name: Show outputs
        run: |
          echo "JSON: ${{ steps.guard.outputs.json-report-path }}"
          echo "SARIF: ${{ steps.guard.outputs.sarif-report-path }}"
          echo "Summary: ${{ steps.guard.outputs.markdown-summary-path }}"
```

## Global Flags

- `--policy <path>`
- `--baseline <path>`
- `--write-baseline <path>`
- `--ignore-file <path>`
- `--risk-budget <n>`
- `--format <terminal|json|markdown|sarif>`
- `--output <path|->`
- `--fail-on <warning|error|off>`
- `--quiet`

## Baseline Workflow

```bash
# Capture the current findings
corepack pnpm -C apps/cli exec mcp-guard \
  --write-baseline .mcp-guard-baseline.json \
  install scan ./testdata/install/risky.json

# Ignore the known findings next time
corepack pnpm -C apps/cli exec mcp-guard \
  --baseline .mcp-guard-baseline.json \
  install scan ./testdata/install/risky.json
```

## Ignore And Risk Budget

```bash
corepack pnpm -C apps/cli exec mcp-guard \
  --ignore-file ./examples/mcp-guard-ignore.json \
  install scan ./testdata/install/risky.json

corepack pnpm -C apps/cli exec mcp-guard \
  --risk-budget 4 \
  install scan ./testdata/install/risky.json
```

Current suppression surface:
- baseline file for previously accepted findings
- ignore file keyed by `ruleId`, `target`, and optional `path`
- inline suppression for local JSON inputs via `mcpGuard.suppressions`

## Metadata Trust Scoring

The metadata package now exposes a minimal trust assessment model for normalized metadata.

Current trust signals:
- stable identity (`id` and `name`)
- declared version
- at least one HTTPS endpoint
- repository link
- homepage link
- auth issuer when auth metadata exists

Current trust bands:
- `low`
- `guarded`
- `moderate`
- `strong`

Trust findings are policy-aware. Example overlay:

```yaml
version: "1.0.0"
name: trust-sensitive
rules:
  trust.endpoint-https-missing:
    enabled: true
    severity: critical
  trust.homepage-missing:
    enabled: false
```

Example trust artifacts:
- `./examples/trust-policy.yaml`
- `./examples/trust-report.json`

## Registry Lint Diagnostics

`registry lint` now validates more than reachability:
- response `Content-Type`
- required `version` and `name`
- optional `endpoints` shape when present
- richer `details.classification` values for transport, parse, and schema failures

Representative registry fixtures:
- `./testdata/registry/safe.json`
- `./testdata/registry/schema-missing-name.json`
- `./testdata/registry/schema-bad-endpoints.json`

## Install Scan Formats And Redaction

`install scan` now supports:
- JSON install config
- YAML install config
- embedded install config in `package.json` under `mcp.install`

Current env handling:
- extracts env variables into report metadata
- redacts common secret-like keys and values to `[REDACTED]`
- reports which keys were hidden via `redactedEnvKeys`

Representative install fixtures:
- `./testdata/install/safe.yaml`
- `./testdata/install/package-risky.json`

## Identity Check Normalization

`identity check` now applies minimal normalization and fixed source precedence.

Normalization:
- `id`: trimmed and lowercased
- `name`: trimmed, whitespace-collapsed, case-insensitive compare
- `version`: trimmed and leading `v` removed

Current precedence:
- `registry`
- `manifest`
- `server` / `server-card`
- `local-config`
- fallback file source

Current identity categories:
- `missing`
- `mismatch`
- `conflict`
- `stale`

Representative identity fixtures:
- `./testdata/identity/normalized.json`
- `./testdata/identity/stale.json`
- `./testdata/identity/conflict-a.json`
- `./testdata/identity/conflict-b.json`

## Auth Check Coverage

`auth check` now covers:
- insecure `issuer`, `tokenUrl`, and `resource`
- missing `audience` / `resource`
- inline token embedding
- caller token passthrough via `forwardAccessToken`, `passthroughHeaders`, or placeholder `Authorization` headers

Current auth classifications:
- `config-parse`
- `config-issue`
- `protocol-risk`
- `token-handling`

Representative auth fixtures:
- `./testdata/auth/risky.json`
- `./testdata/auth/passthrough.json`

## Diff Risk And Ambiguity Lint

`diff` now adds:
- per-finding `riskLevel`
- aggregated `diffRisk` summary in report metadata
- tool parameter surface change detection
- tool description ambiguity lint for missing, vague, short, or overlapping descriptions

Representative diff fixtures:
- `./testdata/diff/tool-old.json`
- `./testdata/diff/tool-new.json`

## Repository Layout

- `apps/cli`: CLI entrypoint and command routing
- `packages/core`: shared result types and exit-code logic
- `packages/metadata`: metadata providers and normalization
- `packages/checks`: rule implementations for registry/install/identity/auth/diff
- `packages/policy-engine`: policy loading and merge logic
- `packages/reporters`: terminal, JSON, Markdown, and SARIF output
- `testdata`: safe/risky/broken fixtures for command tests

## Reference Docs

- [docs/README.md](./docs/README.md)
- [docs/POLICY_REFERENCE.md](./docs/POLICY_REFERENCE.md)
- [docs/RULES.md](./docs/RULES.md)
- [docs/CONFIG_EXAMPLES.md](./docs/CONFIG_EXAMPLES.md)
- [docs/ROADMAP.md](./docs/ROADMAP.md)
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

## Policy Packs

- `./policies/base.yaml`
- `./policies/strict.yaml`
- `./policies/enterprise.yaml`
- `./policies/ci-friendly.yaml`

## Current Notes

- The implemented checks are intentionally minimal and deterministic.
- `install scan`, `identity check`, `auth check`, and `diff` currently operate on local JSON fixtures/configs.
- trust scoring currently lives in `packages/metadata` and is surfaced through report metadata plus generated trust findings.
- Root workspace scripts are expected to be run through `corepack pnpm`.
