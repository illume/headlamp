# E2E Test Coverage Checklist

This document tracks the end-to-end (e2e) test coverage for all pages in Headlamp. It provides a comprehensive checklist of pages that have been tested and those that still need testing.

## Test Status Legend

- ✅ **Tested** - Page has high-level e2e tests
- ⚠️ **Partially Tested** - Page has some tests but coverage is incomplete
- ❌ **Not Tested** - Page needs e2e tests

## Current Test Files

### Web Mode Tests (`/e2e-tests/tests/`)
- `headlamp.spec.ts` - Main Headlamp functionality tests
- `namespaces.spec.ts` - Namespace creation and deletion
- `podsPage.spec.ts` - Pod-related tests
- `pluginSetting.spec.ts` - Plugin settings page tests
- `multiCluster.spec.ts` - Multi-cluster functionality
- `dynamicCluster.spec.ts` - Dynamic cluster configuration
- `incluster-api.spec.ts` - In-cluster API tests

### App Mode Tests (`/app/e2e-tests/tests/`)
- `namespaces.spec.ts` - Namespace operations in app mode
- `clusterRename.spec.ts` - Cluster renaming functionality

## Page Coverage by Category

### Home & Navigation
| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Home/Cluster Chooser | `/` | ✅ | Tested in `multiCluster.spec.ts` |
| Cluster Overview | `/c/:cluster/` | ✅ | Tested in `headlamp.spec.ts` |
| 404 Not Found | `*` | ✅ | Tested in `headlamp.spec.ts` |
| Advanced Search | `/advanced-search` | ❌ | Not tested |
| Activity | N/A | ❌ | Not tested |

### Cluster Resources
| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Namespaces List | `/namespaces` | ✅ | Tested in `namespaces.spec.ts` |
| Namespace Details | `/namespaces/:name` | ✅ | Tested in `namespaces.spec.ts` |
| Nodes List | `/nodes` | ❌ | Not tested |
| Node Details | `/nodes/:name` | ❌ | Not tested |

### Storage
| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Storage Classes List | `/storage/classes` | ❌ | Not tested |
| Storage Class Details | `/storage/classes/:name` | ❌ | Not tested |
| Persistent Volumes List | `/storage/persistentvolumes` | ❌ | Not tested |
| Persistent Volume Details | `/storage/persistentvolumes/:name` | ❌ | Not tested |
| Persistent Volume Claims List | `/storage/persistentvolumeclaims` | ❌ | Not tested |
| PVC Details | `/storage/persistentvolumeclaims/:namespace/:name` | ❌ | Not tested |

### Workloads
| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Workloads Overview | `/workloads` | ❌ | Not tested |
| Pods List | `/pods` | ⚠️ | Partially tested in `podsPage.spec.ts` |
| Pod Details | `/pods/:namespace/:name` | ⚠️ | Log functionality tested in `podsPage.spec.ts` |
| Deployments List | `/deployments` | ❌ | Not tested |
| Deployment Details | `/deployments/:namespace/:name` | ❌ | Not tested |
| DaemonSets List | `/daemonsets` | ❌ | Not tested |
| DaemonSet Details | `/daemonsets/:namespace/:name` | ❌ | Not tested |
| StatefulSets List | `/statefulsets` | ❌ | Not tested |
| StatefulSet Details | `/statefulsets/:namespace/:name` | ❌ | Not tested |
| ReplicaSets List | `/replicasets` | ❌ | Not tested |
| ReplicaSet Details | `/replicasets/:namespace/:name` | ❌ | Not tested |
| Jobs List | `/jobs` | ❌ | Not tested |
| Job Details | `/jobs/:namespace/:name` | ❌ | Not tested |
| CronJobs List | `/cronjobs` | ❌ | Not tested |
| CronJob Details | `/cronjobs/:namespace/:name` | ❌ | Not tested |

### Network
| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Services List | `/services` | ✅ | Tested in `headlamp.spec.ts` |
| Service Details | `/services/:namespace/:name` | ✅ | Tested in `headlamp.spec.ts` |
| Endpoints List | `/endpoints` | ❌ | Not tested |
| Endpoint Details | `/endpoints/:namespace/:name` | ❌ | Not tested |
| EndpointSlices List | `/endpointslices` | ❌ | Not tested |
| EndpointSlice Details | `/endpointslices/:namespace/:name` | ❌ | Not tested |
| Ingresses List | `/ingresses` | ❌ | Not tested |
| Ingress Details | `/ingresses/:namespace/:name` | ❌ | Not tested |
| IngressClasses List | `/ingressclasses` | ❌ | Not tested |
| IngressClass Details | `/ingressclasses/:name` | ❌ | Not tested |
| Network Policies List | `/networkpolicies` | ❌ | Not tested |
| Network Policy Details | `/networkpolicies/:namespace/:name` | ❌ | Not tested |

### Gateway API
| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Gateways List | `/gateways` | ❌ | Not tested |
| Gateway Details | `/gateways/:namespace/:name` | ❌ | Not tested |
| HTTPRoutes List | `/httproutes` | ❌ | Not tested |
| HTTPRoute Details | `/httproutes/:namespace/:name` | ❌ | Not tested |
| GRPCRoutes List | `/grpcroutes` | ❌ | Not tested |
| GRPCRoute Details | `/grpcroutes/:namespace/:name` | ❌ | Not tested |
| GatewayClasses List | `/gatewayclasses` | ❌ | Not tested |
| GatewayClass Details | `/gatewayclasses/:name` | ❌ | Not tested |
| ReferenceGrants List | `/referencegrants` | ❌ | Not tested |
| ReferenceGrant Details | `/referencegrant/:namespace/:name` | ❌ | Not tested |
| BackendTLSPolicies List | `/backendtlspolicies` | ❌ | Not tested |
| BackendTLSPolicy Details | `/backendtlspolicy/:namespace/:name` | ❌ | Not tested |
| BackendTrafficPolicies List | `/backendtrafficpolicies` | ❌ | Not tested |
| BackendTrafficPolicy Details | `/backendtrafficpolicy/:namespace/:name` | ❌ | Not tested |

### Config & Storage
| Page | Route | Status | Notes |
|------|-------|--------|-------|
| ConfigMaps List | `/configmaps` | ❌ | Not tested |
| ConfigMap Details | `/configmaps/:namespace/:name` | ❌ | Not tested |
| Secrets List | `/secrets` | ❌ | Not tested |
| Secret Details | `/secrets/:namespace/:name` | ❌ | Not tested |
| Resource Quotas List | `/resourcequotas` | ❌ | Not tested |
| Resource Quota Details | `/resourcequotas/:namespace/:name` | ❌ | Not tested |
| Limit Ranges List | `/limitranges` | ❌ | Not tested |
| Limit Range Details | `/limitranges/:namespace/:name` | ❌ | Not tested |

### Security & Access Control
| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Service Accounts List | `/serviceaccounts` | ⚠️ | Navigation tested in `headlamp.spec.ts` |
| Service Account Details | `/serviceaccounts/:namespace/:name` | ❌ | Not tested |
| Roles List | `/roles` | ⚠️ | Navigation tested in `headlamp.spec.ts` |
| Role Details | `/roles/:namespace/:name` | ❌ | Not tested |
| ClusterRole Details | `/clusterroles/:name` | ❌ | Not tested |
| RoleBindings List | `/rolebindings` | ❌ | Not tested |
| RoleBinding Details | `/rolebinding/:namespace/:name` | ❌ | Not tested |
| ClusterRoleBinding Details | `/clusterrolebinding/:name` | ❌ | Not tested |

### Autoscaling
| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Horizontal Pod Autoscalers List | `/horizontalpodautoscalers` | ❌ | Not tested |
| HPA Details | `/horizontalpodautoscalers/:namespace/:name` | ❌ | Not tested |
| Vertical Pod Autoscalers List | `/verticalpodautoscalers` | ❌ | Not tested |
| VPA Details | `/verticalpodautoscalers/:namespace/:name` | ❌ | Not tested |
| Pod Disruption Budgets List | `/poddisruptionbudgets` | ❌ | Not tested |
| PDB Details | `/poddisruptionbudgets/:namespace/:name` | ❌ | Not tested |

### Other Resources
| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Priority Classes List | `/priorityclasses` | ❌ | Not tested |
| Priority Class Details | `/priorityclasses/:name` | ❌ | Not tested |
| Runtime Classes List | `/runtimeclasses` | ❌ | Not tested |
| Runtime Class Details | `/runtimeclasses/:name` | ❌ | Not tested |
| Leases List | `/leases` | ❌ | Not tested |
| Lease Details | `/leases/:namespace/:name` | ❌ | Not tested |
| Mutating Webhook Configurations List | `/mutatingwebhookconfigurations` | ❌ | Not tested |
| Mutating Webhook Configuration Details | `/mutatingwebhookconfigurations/:name` | ❌ | Not tested |
| Validating Webhook Configurations List | `/validatingwebhookconfigurations` | ❌ | Not tested |
| Validating Webhook Configuration Details | `/validatingwebhookconfigurations/:name` | ❌ | Not tested |

### Custom Resources
| Page | Route | Status | Notes |
|------|-------|--------|-------|
| CRDs List | `/crds` | ❌ | Not tested |
| CRD Details | `/crds/:name` | ❌ | Not tested |
| Custom Resources List | `/customresources/:crd` | ❌ | Not tested |
| Custom Resource Details | `/customresources/:crd/:namespace/:crName` | ❌ | Not tested |
| CR Instances List | `/crs` | ❌ | Not tested |

### Settings & Configuration
| Page | Route | Status | Notes |
|------|-------|--------|-------|
| General Settings | `/settings/general` | ❌ | Not tested |
| Cluster Settings | `/settings/cluster` | ⚠️ | Tested in app mode (`clusterRename.spec.ts`) |
| Clusters Settings | `/settings/clusters` | ❌ | Not tested |
| Plugin Settings | `/settings/plugins` | ✅ | Tested in `pluginSetting.spec.ts` |
| Plugin Details | `/settings/plugins/:name/:type?` | ✅ | Tested in `pluginSetting.spec.ts` |

### Authentication & User Management
| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Token Login | `/token` | ✅ | Tested via authentication in multiple tests |
| OIDC Auth | `/auth` | ❌ | Not tested |
| Login | `/login` | ✅ | Tested via authentication in multiple tests |

### App-Specific Features
| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Port Forwards | `/portforwards` | ❌ | Not tested (app mode only) |
| Load KubeConfig | `/load-kube-config` | ❌ | Not tested (app mode only) |
| Add Cluster | `/add-cluster` | ❌ | Not tested (app mode only) |

### Visualization
| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Resource Map | `/map` | ❌ | Not tested |

### Projects (OpenShift-style)
| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Project Create YAML | `/project/create-yaml` | ❌ | Not tested |
| Project Details | `/project/:name` | ❌ | Not tested |

### Notifications
| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Notifications List | `/notifications` | ❌ | Not tested |

## Summary Statistics

**Total Pages:** 130+

**Tested:** 11 (✅)
- Home/Cluster Chooser
- Cluster Overview
- 404 Page
- Namespaces List & Details
- Services List & Details
- Plugin Settings & Details
- Token/Login

**Partially Tested:** 5 (⚠️)
- Pods List & Details (logs functionality)
- Service Accounts List (navigation only)
- Roles List (navigation only)
- Cluster Settings (app mode only)

**Not Tested:** 114+ (❌)

**Test Coverage:** ~12% (16/130)

## Priority Areas for Testing

### High Priority (Core Functionality)
1. Workloads pages (Deployments, DaemonSets, StatefulSets, Jobs, CronJobs)
2. Storage pages (PVs, PVCs, StorageClasses)
3. Nodes List & Details
4. ConfigMaps & Secrets
5. Resource Quotas & Limit Ranges
6. Complete Pod testing (not just logs)

### Medium Priority (Common Use Cases)
1. Network resources (Ingresses, Network Policies, Endpoints)
2. RBAC resources (complete Role & RoleBinding tests)
3. Autoscaling resources (HPAs, VPAs, PDBs)
4. Settings pages (General Settings, Clusters Settings)
5. Custom Resources (CRDs and CR instances)

### Low Priority (Advanced/Less Common)
1. Gateway API resources
2. Webhook Configurations
3. Runtime Classes & Priority Classes
4. Leases
5. Resource Map visualization
6. Projects (OpenShift-specific)

## Testing Guidelines

When adding new e2e tests for pages:

1. **High-level smoke tests** - Verify page loads and displays expected content
2. **Navigation** - Test that navigation to the page works correctly
3. **Basic interaction** - Test one or two core interactions (e.g., list, view details)
4. **Accessibility** - Use `a11y()` checks where appropriate
5. **Error handling** - Test 404 cases and permission-denied scenarios
6. **Consistency** - Follow patterns from existing tests in `headlampPage.ts`

## Test Naming Convention

Use descriptive test names that clearly indicate what is being tested:

```typescript
test('resource-type list page should load and display items', async ({ page }) => {
  // Test implementation
});

test('resource-type details page should show resource information', async ({ page }) => {
  // Test implementation
});
```

## Contributing

When adding new pages or features to Headlamp:

1. Update this checklist with the new page
2. Add corresponding e2e tests
3. Mark the page as ✅ Tested in this document
4. Update the summary statistics

---

**Last Updated:** 2026-01-19
**Maintained by:** Headlamp Development Team
