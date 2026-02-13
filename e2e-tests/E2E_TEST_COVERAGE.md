# E2E Test Coverage Checklist

This document tracks the end-to-end (e2e) test coverage for all pages in Headlamp. It provides a comprehensive checklist of pages that have been tested and those that still need testing.

## Current Test Files

### Web Mode Tests (`/e2e-tests/tests/`)
- `headlamp.spec.ts` - Main Headlamp functionality tests
- `namespaces.spec.ts` - Namespace creation and deletion
- `podsPage.spec.ts` - Pod-related tests
- `pluginSetting.spec.ts` - Plugin settings page tests
- `multiCluster.spec.ts` - Multi-cluster functionality
- `dynamicCluster.spec.ts` - Dynamic cluster configuration
- `incluster-api.spec.ts` - In-cluster API tests
- `workloads.spec.ts` - Workloads pages (new)
- `nodes.spec.ts` - Nodes pages (new)
- `storage.spec.ts` - Storage pages (new)
- `config.spec.ts` - Configuration pages (new)
- `network.spec.ts` - Network pages (new)
- `autoscaling.spec.ts` - Autoscaling pages (new)
- `crds.spec.ts` - Custom Resources pages (new)
- `rbac-other.spec.ts` - RBAC and other resources pages (new)
- `gateway-api.spec.ts` - Gateway API resources pages (new)

### App Mode Tests (`/app/e2e-tests/tests/`)
- `namespaces.spec.ts` - Namespace operations in app mode
- `clusterRename.spec.ts` - Cluster renaming functionality

## E2E Test Coverage Checklist

### Home & Navigation
- [x] e2e-tests: home-page: Add test for cluster chooser (tested in `multiCluster.spec.ts`)
- [x] e2e-tests: cluster-overview: Add test for cluster overview page (tested in `headlamp.spec.ts`)
- [x] e2e-tests: 404-page: Add test for 404 not found page (tested in `headlamp.spec.ts`)
- [ ] e2e-tests: advanced-search: Add test for advanced search functionality
- [ ] e2e-tests: global-search: Add test for global search with hotkey (partially tested in `headlamp.spec.ts`)
- [ ] e2e-tests: activity-view: Add test for activity/events view panel

### Cluster Resources
- [x] e2e-tests: namespaces-list: Add test for namespaces list page (tested in `namespaces.spec.ts`)
- [x] e2e-tests: namespace-details: Add test for namespace details page (tested in `namespaces.spec.ts`)
- [x] e2e-tests: namespace-create: Add test for namespace creation (tested in `namespaces.spec.ts`)
- [x] e2e-tests: namespace-delete: Add test for namespace deletion (tested in `namespaces.spec.ts`)
- [x] e2e-tests: nodes-list: Add test for nodes list page (tested in `nodes.spec.ts`)
- [ ] e2e-tests: node-details: Add test for node details page (**SKIPPED** in `nodes.spec.ts` - CI timeout issues)

### Storage
- [x] e2e-tests: storage-classes-list: Add test for storage classes list page (tested in `storage.spec.ts`)
- [ ] e2e-tests: storage-class-details: Add test for storage class details page
- [x] e2e-tests: persistent-volumes-list: Add test for persistent volumes list page (tested in `storage.spec.ts`)
- [ ] e2e-tests: persistent-volume-details: Add test for persistent volume details page
- [x] e2e-tests: persistent-volume-claims-list: Add test for PVC list page (tested in `storage.spec.ts`)
- [ ] e2e-tests: persistent-volume-claim-details: Add test for PVC details page

### Workloads
- [ ] e2e-tests: workloads-overview: Add test for workloads overview page (**SKIPPED** in `workloads.spec.ts` - CI timeout issues)
- [x] e2e-tests: pods-list: Add test for pods list page (tested in `podsPage.spec.ts`)
- [x] e2e-tests: pod-details: Add test for pod details page (tested in `podsPage.spec.ts`)
- [x] e2e-tests: pod-logs: Add test for pod logs view with search hotkey (tested in `podsPage.spec.ts`)
- [ ] e2e-tests: pod-shell: Add test for pod shell/exec functionality
- [x] e2e-tests: deployments-list: Add test for deployments list page (tested in `workloads.spec.ts`)
- [ ] e2e-tests: deployment-details: Add test for deployment details page
- [ ] e2e-tests: deployment-scale: Add test for deployment scaling
- [x] e2e-tests: daemonsets-list: Add test for daemonsets list page (tested in `workloads.spec.ts`)
- [ ] e2e-tests: daemonset-details: Add test for daemonset details page
- [x] e2e-tests: statefulsets-list: Add test for statefulsets list page (tested in `workloads.spec.ts`)
- [ ] e2e-tests: statefulset-details: Add test for statefulset details page
- [x] e2e-tests: replicasets-list: Add test for replicasets list page (tested in `workloads.spec.ts`)
- [ ] e2e-tests: replicaset-details: Add test for replicaset details page
- [x] e2e-tests: jobs-list: Add test for jobs list page (tested in `workloads.spec.ts`)
- [ ] e2e-tests: job-details: Add test for job details page
- [x] e2e-tests: cronjobs-list: Add test for cronjobs list page (tested in `workloads.spec.ts`)
- [ ] e2e-tests: cronjob-details: Add test for cronjob details page

### Network
- [x] e2e-tests: services-list: Add test for services list page (tested in `headlamp.spec.ts`)
- [x] e2e-tests: service-details: Add test for service details page (tested in `headlamp.spec.ts`)
- [x] e2e-tests: endpoints-list: Add test for endpoints list page (tested in `network.spec.ts`)
- [ ] e2e-tests: endpoint-details: Add test for endpoint details page
- [ ] e2e-tests: endpointslices-list: Add test for endpoint slices list page (**SKIPPED** in `network.spec.ts` - CI timeout issues)
- [ ] e2e-tests: endpointslice-details: Add test for endpoint slice details page
- [x] e2e-tests: ingresses-list: Add test for ingresses list page (tested in `network.spec.ts`)
- [ ] e2e-tests: ingress-details: Add test for ingress details page
- [ ] e2e-tests: ingress-classes-list: Add test for ingress classes list page (**SKIPPED** in `network.spec.ts` - CI timeout issues)
- [ ] e2e-tests: ingress-class-details: Add test for ingress class details page
- [x] e2e-tests: network-policies-list: Add test for network policies list page (tested in `network.spec.ts`)
- [ ] e2e-tests: network-policy-details: Add test for network policy details page

### Gateway API
- [ ] e2e-tests: gateways-list: Add test for gateways list page (**SKIPPED** in `gateway-api.spec.ts` - CI failures)
- [ ] e2e-tests: gateway-details: Add test for gateway details page
- [ ] e2e-tests: httproutes-list: Add test for HTTP routes list page (**SKIPPED** in `gateway-api.spec.ts` - CI failures)
- [ ] e2e-tests: httproute-details: Add test for HTTP route details page
- [ ] e2e-tests: grpcroutes-list: Add test for gRPC routes list page (**SKIPPED** in `gateway-api.spec.ts` - CI failures)
- [ ] e2e-tests: grpcroute-details: Add test for gRPC route details page
- [ ] e2e-tests: gateway-classes-list: Add test for gateway classes list page (**SKIPPED** in `gateway-api.spec.ts` - CI failures)
- [ ] e2e-tests: gateway-class-details: Add test for gateway class details page
- [ ] e2e-tests: reference-grants-list: Add test for reference grants list page
- [ ] e2e-tests: reference-grant-details: Add test for reference grant details page
- [ ] e2e-tests: backend-tls-policies-list: Add test for backend TLS policies list page
- [ ] e2e-tests: backend-tls-policy-details: Add test for backend TLS policy details page
- [ ] e2e-tests: backend-traffic-policies-list: Add test for backend traffic policies list page
- [ ] e2e-tests: backend-traffic-policy-details: Add test for backend traffic policy details page

### Config & Storage
- [x] e2e-tests: configmaps-list: Add test for config maps list page (tested in `config.spec.ts`)
- [ ] e2e-tests: configmap-details: Add test for config map details page
- [ ] e2e-tests: configmap-create: Add test for creating config map
- [ ] e2e-tests: configmap-edit: Add test for editing config map
- [x] e2e-tests: secrets-list: Add test for secrets list page (tested in `config.spec.ts`)
- [ ] e2e-tests: secret-details: Add test for secret details page
- [ ] e2e-tests: secret-create: Add test for creating secret
- [x] e2e-tests: resource-quotas-list: Add test for resource quotas list page (tested in `config.spec.ts`)
- [ ] e2e-tests: resource-quota-details: Add test for resource quota details page
- [x] e2e-tests: limit-ranges-list: Add test for limit ranges list page (tested in `config.spec.ts`)
- [ ] e2e-tests: limit-range-details: Add test for limit range details page

### Security & Access Control (RBAC)
- [x] e2e-tests: service-accounts-list: Add test for service accounts list page (partially tested in `headlamp.spec.ts`)
- [ ] e2e-tests: service-account-details: Add test for service account details page
- [x] e2e-tests: roles-list: Add test for roles list page (partially tested in `headlamp.spec.ts`)
- [ ] e2e-tests: role-details: Add test for role details page
- [ ] e2e-tests: cluster-role-details: Add test for cluster role details page
- [x] e2e-tests: role-bindings-list: Add test for role bindings list page (tested in `rbac-other.spec.ts`)
- [ ] e2e-tests: role-binding-details: Add test for role binding details page
- [ ] e2e-tests: cluster-role-binding-details: Add test for cluster role binding details page

### Autoscaling
- [x] e2e-tests: horizontal-pod-autoscalers-list: Add test for HPAs list page (tested in `autoscaling.spec.ts`)
- [ ] e2e-tests: horizontal-pod-autoscaler-details: Add test for HPA details page
- [x] e2e-tests: vertical-pod-autoscalers-list: Add test for VPAs list page (tested in `autoscaling.spec.ts`)
- [ ] e2e-tests: vertical-pod-autoscaler-details: Add test for VPA details page
- [x] e2e-tests: pod-disruption-budgets-list: Add test for PDBs list page (tested in `autoscaling.spec.ts`)
- [ ] e2e-tests: pod-disruption-budget-details: Add test for PDB details page

### Other Resources
- [x] e2e-tests: priority-classes-list: Add test for priority classes list page (tested in `rbac-other.spec.ts`)
- [ ] e2e-tests: priority-class-details: Add test for priority class details page
- [x] e2e-tests: runtime-classes-list: Add test for runtime classes list page (tested in `rbac-other.spec.ts`)
- [ ] e2e-tests: runtime-class-details: Add test for runtime class details page
- [x] e2e-tests: leases-list: Add test for leases list page (tested in `rbac-other.spec.ts`)
- [ ] e2e-tests: lease-details: Add test for lease details page
- [x] e2e-tests: mutating-webhook-configs-list: Add test for mutating webhook configurations list page (tested in `rbac-other.spec.ts`)
- [ ] e2e-tests: mutating-webhook-config-details: Add test for mutating webhook configuration details page
- [ ] e2e-tests: validating-webhook-configs-list: Add test for validating webhook configurations list page (**SKIPPED** in `gateway-api.spec.ts` - CI failures)
- [ ] e2e-tests: validating-webhook-config-details: Add test for validating webhook configuration details page

### Custom Resources
- [ ] e2e-tests: crds-list: Add test for CRDs list page (**SKIPPED** in `crds.spec.ts` - CI timeout issues)
- [ ] e2e-tests: crd-details: Add test for CRD details page
- [ ] e2e-tests: custom-resources-list: Add test for custom resources list page
- [ ] e2e-tests: custom-resource-details: Add test for custom resource details page
- [ ] e2e-tests: cr-instances-list: Add test for CR instances list page (**SKIPPED** in `crds.spec.ts` - CI timeout issues)

### Settings & Configuration
- [ ] e2e-tests: settings-general: Add test for general settings page
- [x] e2e-tests: settings-cluster: Add test for cluster settings page (tested in `clusterRename.spec.ts` app mode)
- [ ] e2e-tests: settings-clusters: Add test for clusters settings page
- [x] e2e-tests: settings-plugins: Add test for plugin settings page (tested in `pluginSetting.spec.ts`)
- [x] e2e-tests: settings-plugin-details: Add test for plugin details page (tested in `pluginSetting.spec.ts`)

### Authentication & User Management
- [x] e2e-tests: token-login: Add test for token login (tested in multiple tests)
- [x] e2e-tests: logout: Add test for logout functionality (tested in `headlamp.spec.ts`)
- [ ] e2e-tests: oidc-auth: Add test for OIDC authentication flow
- [x] e2e-tests: login-page: Add test for login page (tested in multiple tests)

### App-Specific Features
- [ ] e2e-tests: port-forwards-list: Add test for port forwards list page (app mode only)
- [ ] e2e-tests: port-forward-create: Add test for creating port forward (app mode only)
- [ ] e2e-tests: load-kubeconfig: Add test for loading kubeconfig (app mode only)
- [ ] e2e-tests: add-cluster: Add test for adding cluster (app mode only)
- [x] e2e-tests: cluster-rename: Add test for renaming cluster (tested in `clusterRename.spec.ts` app mode)

### Major Features

#### Resource Map / Visualization
- [ ] e2e-tests: resource-map-view: Add test for resource map/graph visualization page
- [ ] e2e-tests: resource-map-navigation: Add test for navigating resources in map view
- [ ] e2e-tests: resource-map-filters: Add test for filtering resources in map view
- [ ] e2e-tests: resource-map-zoom: Add test for zoom and pan controls in map view

#### Projects (OpenShift-style)
- [ ] e2e-tests: projects-list: Add test for projects list (if applicable)
- [ ] e2e-tests: project-create-yaml: Add test for creating project from YAML
- [ ] e2e-tests: project-details: Add test for project details page
- [ ] e2e-tests: project-resources: Add test for viewing project resources

#### Activity / Events
- [ ] e2e-tests: activity-panel: Add test for activity/events panel visibility
- [ ] e2e-tests: activity-filtering: Add test for filtering events by resource type
- [ ] e2e-tests: activity-realtime: Add test for real-time event updates
- [ ] e2e-tests: activity-details: Add test for viewing event details

#### Notifications
- [ ] e2e-tests: notifications-list: Add test for notifications list page
- [ ] e2e-tests: notifications-read: Add test for marking notifications as read
- [ ] e2e-tests: notifications-clear: Add test for clearing notifications

#### Multi-Cluster Features
- [x] e2e-tests: cluster-chooser: Add test for cluster chooser (tested in `multiCluster.spec.ts`)
- [x] e2e-tests: multi-cluster-switch: Add test for switching between clusters (tested in `multiCluster.spec.ts`)
- [x] e2e-tests: cluster-status: Add test for cluster status display (tested in `multiCluster.spec.ts`)

#### Dynamic Clusters
- [x] e2e-tests: dynamic-cluster-config: Add test for dynamic cluster configuration (tested in `dynamicCluster.spec.ts`)
- [x] e2e-tests: dynamic-cluster-kubeconfig: Add test for storing kubeconfig in IndexDB (tested in `dynamicCluster.spec.ts`)

#### Plugins
- [x] e2e-tests: plugins-list: Add test for plugins list (tested in `pluginSetting.spec.ts`)
- [x] e2e-tests: plugin-enable-disable: Add test for enabling/disabling plugins (app mode)
- [x] e2e-tests: plugin-settings: Add test for plugin-specific settings (tested in `pluginSetting.spec.ts`)
- [ ] e2e-tests: plugin-custom-routes: Add test for custom routes added by plugins
- [ ] e2e-tests: plugin-sidebar-items: Add test for custom sidebar items added by plugins

#### Editor / YAML Management
- [ ] e2e-tests: yaml-editor: Add test for YAML editor functionality
- [ ] e2e-tests: resource-create-yaml: Add test for creating resources from YAML
- [ ] e2e-tests: resource-edit-yaml: Add test for editing resources via YAML editor
- [ ] e2e-tests: yaml-validation: Add test for YAML syntax validation

#### Pagination & Tables
- [x] e2e-tests: table-pagination: Add test for table pagination (tested in `headlamp.spec.ts`)
- [ ] e2e-tests: table-sorting: Add test for table column sorting
- [ ] e2e-tests: table-filtering: Add test for table filtering
- [ ] e2e-tests: rows-per-page: Add test for changing rows per page

#### Accessibility & Hotkeys
- [x] e2e-tests: global-search-hotkey: Add test for global search hotkey (/) (tested in `headlamp.spec.ts`)
- [x] e2e-tests: log-search-hotkey: Add test for log search hotkey (Ctrl+Shift+F) (tested in `podsPage.spec.ts`)
- [ ] e2e-tests: cluster-chooser-hotkey: Add test for cluster chooser hotkey (Ctrl+Shift+L)
- [x] e2e-tests: accessibility-checks: Add accessibility checks for pages (tested in multiple files)

## Summary Statistics

**Total Test Items:** 175+

**Completed Tests:** 45
**Remaining Tests:** 130+

**Test Coverage:** ~26% (45/175)

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

1. Update this checklist with the new test items using the format: `- [ ] e2e-tests: feature-name: Add test for ...`
2. Add corresponding e2e tests
3. Mark the checkbox as completed: `- [x]`
4. Update the summary statistics

---

**Last Updated:** 2026-01-19
**Maintained by:** Headlamp Development Team
