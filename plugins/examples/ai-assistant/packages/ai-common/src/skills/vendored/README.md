# Vendored Skills (Real-World Test Fixtures)

These are real SKILL.md files copied from public open-source repositories,
used as e2e test fixtures to verify that the skill loader handles
real-world skill formats correctly.

## Sources

| Directory            | Source Repository                              | License   | Vendored From Commit |
| -------------------- | ---------------------------------------------- | --------- | -------------------- |
| `tldraw/`            | [tldraw/tldraw](https://github.com/tldraw/tldraw) | Apache-2.0 | `2ef85109f888` |
| `upstash-ratelimit/` | [upstash/ratelimit-js](https://github.com/upstash/ratelimit-js) | MIT | `589cc3e234bc` |
| `arthas/`            | [alibaba/arthas](https://github.com/alibaba/arthas) | Apache-2.0 | `6bc2284ec3f9` |

## Why vendor?

Vendoring avoids network dependencies in tests and ensures reproducible
results regardless of upstream changes. Each directory mirrors the
original repo's `skills/` layout.

## Updating

To update a vendored skill, copy the new SKILL.md from the upstream repo
and update the commit hash in the table above.
