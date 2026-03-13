# Roadmap

This roadmap reflects the current repository state after the implemented v0 core slice.

## Implemented

- shared core result model and exit codes
- policy loading and merging
- terminal, JSON, Markdown, and SARIF reporters
- CLI shell with global flags
- `registry lint`
- `install scan`
- `identity check`
- `auth check`
- `diff`
- baseline file support
- GitHub Action wrapper

## Near-term Next Steps

1. Expand built-in policy coverage so every implemented rule has explicit defaults in `base.yaml` and `strict.yaml`.
2. Add policy-level ignore support for stable suppression without a separate baseline file.
3. Improve registry validation depth beyond endpoint/version/CORS.
4. Extend install parsing beyond the current JSON fixture shape.
5. Add richer diff semantics for tool names and parameter surfaces.

## Later Follow-ups

1. GitHub Action polish such as annotations or SARIF upload helpers.
2. More complete SARIF properties and rule metadata catalogs.
3. Contributor docs for adding new checks and fixtures.
4. Broader examples for real MCP client config formats.
