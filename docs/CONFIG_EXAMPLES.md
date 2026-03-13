# Config Examples

This document points to runnable examples already stored in `testdata/`.

## Install Scan

Safe example:
- `./testdata/install/safe.json`

Risky example:
- `./testdata/install/risky.json`

Run:

```bash
corepack pnpm -C apps/cli exec mcp-guard install scan ./testdata/install/safe.json
corepack pnpm -C apps/cli exec mcp-guard install scan ./testdata/install/risky.json
```

## Identity Check

Example inputs:
- `./testdata/identity/registry.json`
- `./testdata/identity/manifest.json`
- `./testdata/identity/drift.json`

Run:

```bash
corepack pnpm -C apps/cli exec mcp-guard identity check \
  ./testdata/identity/registry.json \
  ./testdata/identity/manifest.json
```

## Auth Check

Safe example:
- `./testdata/auth/safe.json`

Risky example:
- `./testdata/auth/risky.json`

Run:

```bash
corepack pnpm -C apps/cli exec mcp-guard auth check ./testdata/auth/safe.json
corepack pnpm -C apps/cli exec mcp-guard auth check ./testdata/auth/risky.json
```

## Diff

Example inputs:
- `./testdata/diff/old.json`
- `./testdata/diff/new.json`

Run:

```bash
corepack pnpm -C apps/cli exec mcp-guard diff \
  ./testdata/diff/old.json \
  ./testdata/diff/new.json
```

## Baseline

Create a baseline:

```bash
corepack pnpm -C apps/cli exec mcp-guard \
  --write-baseline .mcp-guard-baseline.json \
  install scan ./testdata/install/risky.json
```

Reuse a baseline:

```bash
corepack pnpm -C apps/cli exec mcp-guard \
  --baseline .mcp-guard-baseline.json \
  install scan ./testdata/install/risky.json
```
