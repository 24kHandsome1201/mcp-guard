# Architecture

This document describes the current metadata-related layering after the addition of the `packages/metadata` package.

## Layers

### Core types

`packages/core` owns shared metadata result types:
- `MetadataSourceRef`
- `NormalizedMetadata`
- `MetadataProviderResult`

These types are stable contracts for producer and consumer packages.

### Metadata providers

`packages/metadata` owns provider interfaces and source-specific loading.

Current provider:
- `serverCardProvider`: loads a local JSON Server Card style document and returns normalized metadata plus warnings

Provider contract:
- load raw metadata from one source
- preserve source identity
- normalize into a reusable shared shape
- emit warnings for missing but non-fatal fields

### Normalization

Normalization is intentionally separate from command logic.

Current normalization behavior:
- lowercases identity `id`
- preserves original raw metadata
- extracts common fields such as `name`, `version`, `description`, `endpoints`, `auth`, and `install`
- keeps missing-field handling non-fatal and explainable via `warnings`

## Intended Consumers

This layer exists so later checks can reuse one metadata shape rather than each command parsing its own source-specific JSON.

Planned consumers:
- deeper `registry lint`
- deeper `identity check`
- trust scoring

## Trust Scoring

The metadata layer now also owns a minimal trust-scoring step.

Current trust model:
- uses a fixed signal set for identity, version, HTTPS endpoint, repository, homepage, and auth issuer presence
- computes a bounded score and maps it into a stable band: `low`, `guarded`, `moderate`, `strong`
- emits trust findings separately from the summary so policy can disable or re-severity individual trust rules

Policy interaction:
- trust rules use normal policy rule ids such as `trust.endpoint-https-missing`
- policy can disable a signal-backed finding or change its severity
- the trust summary itself remains descriptive; policy affects the surfaced findings

## Current Limits

- only a minimal local JSON Server Card provider exists today
- provider output is available for reuse but existing commands are not yet rewritten to depend on it
- no caching or remote fetch abstraction exists yet
