# Test Coverage Quality Report: May 28, 2025 → Present

**Baseline commit:** `2a35da948` (May 28, 2025)
**Report generated:** May 18, 2026

---

## Summary

| Area | Baseline | Current | Change |
|------|----------|---------|--------|
| Backend test files | 22 | 44 | **+22 (+100%)** |
| Backend test lines | 8,017 | 17,483 | **+9,466 (+118%)** |
| Backend coverage (statements) | 62.0% | 61.7% | −0.3% (more code under measurement) |
| Backend functions covered | 199 | 355 | **+156 (+78%)** |
| Frontend test files | 47 | 87 | **+40 (+85%)** |
| Frontend test lines | 6,805 | 15,791 | **+8,986 (+132%)** |
| Frontend coverage (statements) | — | 28.1% | 4,562 statements covered |
| Storybook files | 562 | 746 | **+184 (net, +33%)** |
| Storybook story states (exports) | 390 | 579 | **+189 (+48%)** |
| Charts test cases | 20 | 62 | **+42 (+210%)** |
| App test files | 3 | 9 | **+6 (+200%)** |
| E2E test files | 6 | 8 | **+2 (+33%)** |
| GitHub workflows | 22 | 24 | **+5 new, −3 removed (net +2)** |
| Plugins test files | 8 | 8 | 2 moved (net 0) |

---

## Backend (`backend/`)

Test files doubled from **22 → 44** (+22 new files), and test lines of code more than doubled from **8,017 → 17,483** (+9,466 lines, +118%).

### New test files added

| File | Area covered |
|------|-------------|
| `pkg/auth/auth_test.go` | Authentication logic |
| `pkg/auth/cookies_fuzz_test.go` | Cookie handling (fuzz) |
| `pkg/auth/cookies_test.go` | Cookie handling |
| `pkg/helm/handler_test.go` | Helm API handler |
| `pkg/helm/release_internal_test.go` | Helm release internals |
| `pkg/helm/repository_internal_test.go` | Helm repository internals |
| `pkg/k8cache/authErrResp_test.go` | Cache auth error responses |
| `pkg/k8cache/authorization_test.go` | Cache authorization |
| `pkg/k8cache/cacheInvalidation_test.go` | Cache invalidation |
| `pkg/k8cache/cacheStore_test.go` | Cache store |
| `pkg/k8cache/eviction_test.go` | Cache eviction |
| `pkg/k8cache/export_test.go` | Cache exports |
| `pkg/k8cache/registry_cleanup_test.go` | Cache registry cleanup |
| `pkg/k8cache/responseCapture_test.go` | Response capture |
| `pkg/kubeconfig/export_test.go` | Kubeconfig exports |
| `pkg/kubeconfig/useragent_test.go` | User-agent handling |
| `pkg/portforward/handler_unit_test.go` | Port-forward handler |
| `pkg/serviceproxy/connection_test.go` | Service proxy connections |
| `pkg/serviceproxy/handler_test.go` | Service proxy handler |
| `pkg/serviceproxy/http_test.go` | Service proxy HTTP |
| `pkg/serviceproxy/service_test.go` | Service proxy service |
| `pkg/spa/embeddedSPAHandler_test.go` | Embedded SPA handler |
| `pkg/spa/spaHandler_test.go` | SPA handler |

Key areas with significant new coverage:
- **k8cache** — 7 new test files covering authorization, cache invalidation, eviction, and response capture
- **serviceproxy** — 4 new test files (entirely new test coverage)
- **helm** — 3 new test files covering handler and internals
- **auth** — 3 new test files including fuzz testing

### Backend coverage report (`go test -cover`)

Overall backend statement coverage: **62.0% (baseline) → 61.7% (current)**

The slight total decrease is due to newly added packages bringing large amounts of previously-untested code under coverage measurement. The absolute number of covered functions increased significantly: **199 → 355 functions covered** (+78%).

| Package | Baseline | Current | Notes |
|---------|----------|---------|-------|
| `cmd` | 59.2% | 59.7% | +0.5% |
| `pkg/auth` | — (no tests) | 83.6% | **NEW** — entirely new test suite |
| `pkg/cache` | 96.0% | 96.0% | Maintained |
| `pkg/config` | 80.7% | 83.9% | +3.2% |
| `pkg/exec` | 86.4% | 86.4% | Maintained |
| `pkg/helm` | had tests | 34.3%* | *Some tests require network access |
| `pkg/k8cache` | 75.0% | 75.0% | Maintained (7 new test files added) |
| `pkg/kubeconfig` | — (build failed) | 61.6% | **NEW** — new tests + refactored code |
| `pkg/logger` | 13.0% | 50.0% | **+37%** |
| `pkg/plugins` | 76.8% | 78.3% | +1.5% |
| `pkg/portforward` | had tests | 46.3% | Refactored with new unit tests |
| `pkg/serviceproxy` | — (no tests) | 74.4% | **NEW** — entirely new test suite |
| `pkg/spa` | 74.2% | 74.2% | Maintained |
| `pkg/telemetry` | 67.9% | 68.5% | +0.6% |
| `pkg/utils` | 100.0% | 100.0% | Maintained |

---

## Frontend (`frontend/src/`)

Test files grew from **47 → 87** (+40 new files), and test lines of code more than doubled from **6,805 → 15,791** (+8,986 lines, +132%).

### New test files added (41 files)

Key areas with new coverage:
- **Components:** `AppContainer`, `PluginSettings`, `RouteSwitcher`, `ColorPicker`, `IconPicker`, `TopBar`, `ClusterBadge`, `Auth`, `Activity`, `ClusterChooser`, `ConfirmButton`, `Label`, `LogsButton`, `UploadDialog`, `Terminal`, `CustomResourceDetails`, `CustomResourceInstancesList`, `Diagnostics`, `PodDetails`, `PodLogViewer`, `PortForward`, `ProjectDeleteDialog`, `WorkloadDetails`
- **Utilities:** `inferTypes`, `searchWithQuery`, `logSeverityFilter`, `projectUtils`, `graphModel`, `tableSettings`
- **Library/API:** `apiDiscovery`, `hooks`, `multiplexer`, `pod`
- **Redux:** `configSlice.storage`, `shortcutsSlice`, `uiSlice`
- **Plugin system:** `runPlugin`
- **Stateless:** `deleteClusterKubeconfig`, `index`, `updateStatelessClusterKubeconfig`
- **Hooks:** `useShortcut`

### Frontend coverage report (`vitest --coverage`)

Current frontend coverage (Istanbul, excluding storybook story files):

| Metric | Current | Covered / Total |
|--------|---------|-----------------|
| **Statements** | **28.1%** | 4,562 / 16,227 |
| **Branches** | **21.1%** | 2,299 / 10,875 |
| **Functions** | **21.1%** | 1,050 / 4,976 |
| **Lines** | **28.2%** | 4,362 / 15,465 |

> **Note:** A direct baseline comparison is not available because the baseline test files cannot be run against the current dependency tree (API changes in newer packages cause build/test failures). However, the baseline had only **47 test files** (vs 87 now) and **6,805 lines of test code** (vs 15,791 now), so the tested surface area has more than doubled. The 930 unit tests and 542 storybook snapshot tests (1,472 total) exercise a meaningful portion of the codebase.

---

## Storybook (Frontend)

| Metric | Baseline | Current | Change |
|--------|----------|---------|--------|
| Story files | 562 | 746 | **+221 added, −37 removed (net +184, +33%)** |
| Story states (exported stories) | 390 | 579 | **+189 (+48%)** |

The number of individual story states (visual test scenarios) grew by nearly 50%, meaning both more components are now covered by Storybook **and** existing components have more state variations tested.

---

## Charts (`charts/`)

Chart test cases grew from **20 → 62** (+42, **+210%**).

### New test cases added (21 scenarios, each with input + expected output)

| Test case | What it validates |
|-----------|-------------------|
| `azure-oidc-with-validators` | Azure OIDC configuration with validators |
| `host-users-override` | Host users override configuration |
| `httproute-enabled` | HTTPRoute gateway API support |
| `ingress-multi-backend` | Multi-backend ingress configuration |
| `me-user-info-url-directly` | User info URL direct configuration |
| `me-user-info-url` | User info URL configuration |
| `namespace-override-oidc-create-secret` | Namespace override with OIDC secret creation |
| `namespace-override` | Namespace override |
| `non-azure-oidc` | Non-Azure OIDC configuration |
| `oidc-pkce` | OIDC PKCE flow |
| `pod-disruption` | Pod disruption budget |
| `readonly-root-filesystem-*` (5 variants) | Read-only root filesystem scenarios |
| `security-context` | Security context configuration |
| `service-extra-ports` | Extra service ports |
| `tls-added` | TLS configuration |
| `topology-spread-constraints` | Topology spread constraints |
| `topology-spread-constraints-custom-selector` | Custom topology selector |

---

## GitHub Workflows (`.github/workflows/`)

**Net change:** 22 → 24 workflows (+5 new, −3 removed)

### New workflows added
| Workflow | Purpose |
|----------|---------|
| `app-artifacts-embedded.yml` | App build with embedded artifacts |
| `backend-embed-test.yml` | Backend embed testing |
| `build-other-arch.yml` | Multi-architecture builds |
| `nightly-build.yml` | Nightly automated builds |
| `push-chocolatey-pkg.yml` | Chocolatey package publishing |

### Workflows removed
| Workflow | Reason |
|----------|--------|
| `pr-to-update-homebrew.yml` | Consolidated/removed |
| `pr-to-update-minikube.yml` | Consolidated/removed |
| `pr-to-update-winget.yml` | Consolidated/removed |

---

## App (`app/`)

Test files tripled from **3 → 9** (+6 new files, **+200%**).

### New test files added
| File | Area covered |
|------|-------------|
| `e2e-tests/tests/clusterRename.spec.ts` | Cluster rename E2E test |
| `electron/mcp/MCPClient.test.ts` | MCP client unit tests |
| `electron/mcp/MCPSettings.test.ts` | MCP settings unit tests |
| `electron/mcp/MCPToolStateStore.test.ts` | MCP tool state store tests |
| `electron/runCmd.test.ts` | Command execution tests |
| `electron/settings.test.ts` | Settings management tests |

---

## E2E Tests (`e2e-tests/`)

E2E test specs grew from **6 → 8** (+2 new files, +33%).

### New E2E tests
| File | What it tests |
|------|---------------|
| `tests/incluster-api.spec.ts` | In-cluster API functionality |
| `tests/prometheusPlugin.spec.ts` | Prometheus plugin integration |

---

## Plugins (`plugins/`)

The plugins test count remained at **8 files** (net), but 2 test files were relocated from `plugins/headlamp-plugin/plugin-management/` to `plugins/pluginctl/src/`:

- `multi-plugin-management.test.js` — moved to pluginctl
- `plugin-management.test.js` — moved to pluginctl

This reflects an architectural change consolidating plugin management tooling into the `pluginctl` package.

> **Note on headlamp-k8s/plugins repo:** This report covers only the `illume/headlamp` repository. The `headlamp-k8s/plugins` repository is a separate repo and its test coverage changes are not tracked here.

---

## Key Takeaways

1. **Backend testing more than doubled** — The most dramatic improvement, with entirely new test suites for k8cache (7 files), serviceproxy (4 files), helm (3 files), and auth (3 files including fuzz tests).

2. **Frontend testing more than doubled** — 40 new test files covering components, utilities, API layers, Redux slices, and the plugin system.

3. **Storybook grew by ~50%** — 189 new story states providing visual regression coverage for UI components.

4. **Charts testing tripled** — 21 new Helm template test scenarios covering security, networking, OIDC, and topology features.

5. **App testing tripled** — New MCP (Model Context Protocol) testing and E2E tests for desktop app features.

6. **CI/CD matured** — 5 new workflows for multi-arch builds, nightly builds, embedded testing, and package publishing; 3 outdated workflows removed.
