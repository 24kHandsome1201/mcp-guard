# Policy Reference

`mcp-guard` policies are YAML documents loaded through `--policy <path>`.

## Document Shape

```yaml
version: "1.0.0"
name: custom
description: Optional description
metadata:
  strictMode: false
  defaultSeverity: medium
rules:
  registry.endpoint-reachable:
    enabled: true
    severity: medium
    reason: Optional explanation
    params: {}
```

## Top-level Fields

- `version`: required string
- `name`: required string
- `description`: optional string
- `metadata.strictMode`: optional boolean
- `metadata.defaultSeverity`: optional severity fallback
- `rules`: object keyed by rule id

## Rule Fields

- `enabled`: required boolean in full policy files
- `severity`: optional override
- `reason`: optional string
- `params`: optional object for future rule-specific settings

Supported severity values:
- `info`
- `low`
- `medium`
- `high`
- `critical`

## Merge Behavior

When a custom policy is loaded, `mcp-guard` merges it with the built-in default policy.

Current behavior:
- known rules inherit defaults when not overridden
- custom rules may be added
- `metadata.defaultSeverity` becomes the fallback severity for unspecified rules
- `params` objects are shallow-merged

Built-in example policies:
- `./policies/base.yaml`
- `./policies/strict.yaml`
- `./policies/enterprise.yaml`
- `./policies/ci-friendly.yaml`

## Included Policy Packs

| Pack | Intent | Default posture |
| --- | --- | --- |
| `base` | local default use | balanced severities, broad visibility |
| `strict` | strong review gating | escalates drift, install, and auth risk |
| `enterprise` | high-scrutiny environments | treats install/auth/diff drift as blocking |
| `ci-friendly` | staged CI rollout | keeps parser/transport checks strong, softens some review noise |

## Current Rule Coverage

The shipped policy packs now cover the implemented v0 rules for:
- `registry.*`
- `install.*`
- `identity.*`
- `auth.*`
- `diff.*`

## Baseline Interaction

Policy and baseline solve different problems:
- policy changes whether findings are produced and how severe they are
- baseline suppresses findings after they are produced

Recommended order of use:
1. use policy to set desired enforcement
2. use `--write-baseline` to record existing findings
3. use `--baseline` in CI to keep focus on new findings

## Example Usage

```bash
corepack pnpm -C apps/cli exec mcp-guard \
  --policy ./policies/strict.yaml \
  auth check ./testdata/auth/risky.json

corepack pnpm -C apps/cli exec mcp-guard \
  --policy ./policies/ci-friendly.yaml \
  diff ./testdata/diff/old.json ./testdata/diff/new.json
```
