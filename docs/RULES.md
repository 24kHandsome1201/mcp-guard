# Rules

This document lists the currently implemented finding types in the v0 codebase.

## Registry Lint

Command:
- `registry lint <endpoint>`

Implemented rules:
- `registry.endpoint-reachable`: endpoint URL invalid, unreachable, timeout, or non-OK response
- `registry.metadata-version`: metadata is not valid JSON, is not an object, or is missing `version`
- `registry.schema-invalid`: metadata shape is wrong for fields such as `name` or `endpoints`
- `registry.content-type`: response does not advertise `application/json`
- `registry.cors-header`: `Access-Control-Allow-Origin` header is missing

Current diagnostics:
- `details.classification` distinguishes `invalid-url`, `http-status`, `network`, `timeout`, `invalid-json`, `schema`, `content-type`, and `cors`
- schema findings include `details.path`, `details.expected`, and `details.actual` where relevant

## Install Scan

Command:
- `install scan <path>`

Supported input shapes:
- top-level `{ "command": "...", "args": [], "env": {} }`
- nested `{ "install": { ... } }`
- YAML with the same top-level or nested `install` shape
- `package.json` style `{ "mcp": { "install": { ... } } }`

Implemented rules:
- `install.parse-config`: file cannot be read or parsed into the expected JSON shape
- `install.command-risk`: install command uses risky patterns such as `sudo`, shell pipe, direct network fetch, or temporary-path references

Current output behavior:
- environment variables are extracted into report metadata
- common secret-like keys and values are redacted to `[REDACTED]`
- metadata and finding details include `redactedEnvKeys` when values were hidden

## Identity Check

Command:
- `identity check <input-a> <input-b> [input-c ...]`

Supported identity fields:
- `id` or `canonicalId`
- `name` or `displayName`
- `version`

Normalization and precedence:
- `id` is compared case-insensitively
- `name` is compared after trimming, lowercasing, and collapsing repeated whitespace
- `version` is compared after trimming and removing a leading `v`
- source precedence is: `registry` > `manifest` > `server` / `server-card` > `local-config` > fallback file source

Implemented rules:
- `identity.parse-input`: file cannot be read or parsed as JSON object input
- `identity.missing-field`: a compared source is missing one of the tracked identity fields
- `identity.drift`: a lower-precedence source mismatches the chosen baseline
- `identity.conflict`: top-precedence sources disagree
- `identity.stale`: a lower-precedence version appears older than the chosen baseline

Current drift categories:
- `missing`
- `mismatch`
- `conflict`
- `stale`

## Auth Check

Command:
- `auth check <path>`

Supported input shape:
- top-level auth fields or nested `{ "auth": { ... } }`

Implemented rules:
- `auth.parse-config`: auth config cannot be parsed into the expected shape
- `auth.https-required`: `issuer` or `tokenUrl` uses `http://`
- `auth.audience-missing`: neither `audience` nor `resource` is configured
- `auth.inline-token`: token material appears inline via `token`, `accessToken`, or `Authorization` header
- `auth.resource-https-required`: `resource` uses `http://`
- `auth.token-passthrough`: config forwards caller token material via passthrough fields or placeholder auth headers

Current auth classifications:
- `config-parse`
- `config-issue`
- `protocol-risk`
- `token-handling`

## Diff

Command:
- `diff <old> <new>`

Implemented rules:
- `diff.parse-input`: one of the inputs cannot be parsed as JSON object metadata
- `diff.description-changed`: `description` changed
- `diff.tools-changed`: tool count changed
- `diff.tool-params-changed`: a tool keeps the same name but changes its `inputSchema`
- `diff.install-changed`: `install` structure changed
- `diff.auth-changed`: `auth` structure changed
- `diff.tool-description-ambiguous`: tools in the new surface have missing, vague, overly short, or overlapping descriptions

Current diff risk levels:
- `low`: description-only drift
- `medium`: description ambiguity
- `high`: tool surface, tool params, install, and auth changes

Current diff summary:
- report metadata includes `diffRisk.overallRisk`
- report metadata includes `diffRisk.changedAreas`
- findings include `details.riskLevel`

## Notes

- The current rules are intentionally deterministic and structural.
- Ambiguity lint currently focuses on obvious missing, vague, short, and overlapping descriptions.
