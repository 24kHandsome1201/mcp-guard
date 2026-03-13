# MCP Guard CLI

This package hosts the CLI entrypoint.

```bash
# Show usage
mcp-guard --help

# Run checks
mcp-guard registry lint
mcp-guard install scan ./testdata/install/safe.json
mcp-guard identity check ./testdata/identity/registry.json ./testdata/identity/manifest.json
mcp-guard auth check ./testdata/auth/safe.json
mcp-guard diff ./testdata/diff/old.json ./testdata/diff/new.json
```

### Global options

- `--policy <path>` load a YAML policy file
- `--baseline <path>` suppress findings already recorded in a baseline file
- `--write-baseline <path>` write current findings to a baseline file
- `--ignore-file <path>` load JSON ignore rules, defaults to `.mcp-guard-ignore` if present
- `--risk-budget <n>` allow up to `n` relevant findings before failing
- `--format <terminal|json|markdown|sarif>` set report format
- `--output <path|->` write output to file or `-` for stdout
- `--fail-on <warning|error|off>` control warning/failure exit behavior
- `--quiet` suppress console output (still writes `--output` file)

### Baseline workflow

```bash
# Record the current findings as a baseline
mcp-guard --write-baseline .mcp-guard-baseline.json install scan ./testdata/install/risky.json

# Ignore those known findings on later runs
mcp-guard --baseline .mcp-guard-baseline.json install scan ./testdata/install/risky.json
```

### Ignore and suppression

```bash
# Ignore known findings from an ignore file
mcp-guard --ignore-file ./examples/mcp-guard-ignore.json install scan ./testdata/install/risky.json

# Allow a limited number of relevant findings during CI rollout
mcp-guard --risk-budget 4 install scan ./testdata/install/risky.json
```

Inline suppression is currently supported for local JSON inputs through a top-level `mcpGuard.suppressions` block.

### Current scope

`registry lint` currently performs a minimal endpoint/metadata/CORS check.
`install scan` currently parses a local JSON install profile and flags obvious risky patterns.
`identity check` currently compares local JSON inputs for `id` / `name` / `version` drift.
`auth check` currently inspects local JSON auth config for transport and token-handling risks.
`diff` currently compares local JSON inputs for structural changes in description, tools, install, and auth.
