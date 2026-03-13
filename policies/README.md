# policies

This directory stores example policies used by the policy engine.

## base.yaml

Conservative default profile for local use and initial adoption.

## strict.yaml

Stricter profile that escalates risky install, identity, auth, and diff changes.

## enterprise.yaml

Enterprise-oriented profile that treats transport, identity, install, and auth changes as high-scrutiny issues.

## ci-friendly.yaml

Rollout-oriented profile that keeps parsing and transport issues strong while softening some review-only signals.
