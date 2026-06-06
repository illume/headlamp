# Vendored Skills (Real-World Test Fixtures)

These are real SKILL.md files copied from public open-source repositories,
used as e2e test fixtures to verify that the skill loader handles
real-world skill formats correctly.

All vendored repos are Kubernetes-related to match Headlamp's domain.

## Sources

| Directory                | Source Repository                                                          | License    | Vendored From Commit |
| ------------------------ | -------------------------------------------------------------------------- | ---------- | -------------------- |
| `kubeshark/`             | [kubeshark/kubeshark](https://github.com/kubeshark/kubeshark)              | Apache-2.0 | `9396e64b9b48`       |
| `helmfile/`              | [helmfile/helmfile](https://github.com/helmfile/helmfile)                  | MIT        | `41d815aa5b3f`       |
| `openshift-lightspeed/`  | [openshift/lightspeed-service](https://github.com/openshift/lightspeed-service) | Apache-2.0 | `051de6bb294b`  |

## Why vendor?

Vendoring avoids network dependencies in tests and ensures reproducible
results regardless of upstream changes. Each directory mirrors the
original repo's `skills/` layout.

## Updating

To update a vendored skill, copy the new SKILL.md from the upstream repo
and update the commit hash in the table above.
