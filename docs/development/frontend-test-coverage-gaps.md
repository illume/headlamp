# Frontend Test Coverage Gaps & Required Tests

**Generated:** 2026-02-08  
**Current Coverage:** 55.24% statements | 47.36% branches | 51.42% functions | 55.54% lines  
**Existing Storybooks:** 174 files  
**Target Coverage:** 65%+

This document outlines missing frontend tests and storybooks that need to be written to improve test coverage, with a focus on error states and loading states.

---

## Issues by Category

### Critical: Priority Components Needing Tests

These components have low test coverage (under 20%) or specific gaps requiring immediate attention with comprehensive storybooks.

#### Settings Components

- [ ] ColorPicker (4.34% coverage) in `frontend/src/components/App/Settings/ColorPicker.tsx` - Create ColorPicker.stories.tsx with default state, custom color input mode, invalid color validation error state, color selection callback, and already selected color highlighted
- [ ] IconPicker (5.88% coverage) in `frontend/src/components/App/Settings/IconPicker.tsx` - Create IconPicker.stories.tsx with icon grid display, icon search/filter, selected icon highlight, icon selection callback, and empty search results state
- [ ] SettingsCluster (0% coverage) in `frontend/src/components/App/Settings/SettingsCluster.tsx` - Create SettingsCluster.stories.tsx with cluster settings form, save success state, save error state, loading state during save, and validation errors
- [ ] SettingsClusters (0% coverage) in `frontend/src/components/App/Settings/SettingsClusters.tsx` - Create SettingsClusters.stories.tsx with cluster list display, empty cluster list, add cluster action, and delete cluster confirmation

#### Authentication & Cluster Management

- [ ] Auth (18.18% coverage) in `frontend/src/components/account/Auth.tsx` - Enhance existing AuthToken.stories.tsx with token input form, login loading state, invalid token error state with network error feedback, timeout error state, and success redirect
- [ ] AuthChooser (4.1% coverage) in `frontend/src/components/authchooser/index.tsx` - Enhance AuthChooser.stories.tsx with multiple auth methods display, auth method selection, loading state during auth flow, authentication failure error, and redirect after success
- [ ] KubeConfigLoader (7.92% coverage) in `frontend/src/components/cluster/KubeConfigLoader.tsx` - Create KubeConfigLoader.stories.tsx with file upload drag-and-drop, file parsing loading state, invalid YAML error state, duplicate cluster error state, large file parsing timeout, and success with cluster list
- [ ] AddCluster (0% coverage) in `frontend/src/components/App/CreateCluster/AddCluster.tsx` - Create AddCluster.stories.tsx with empty form state, form validation errors, cluster connection test loading, connection test success/failure, and save cluster success

#### Common Resource Components

- [ ] LogsButton (0.61% coverage) in `frontend/src/components/common/Resource/LogsButton.tsx` - Create LogsButton.stories.tsx with button enabled state, button disabled state when no logs available, loading logs spinner, and logs viewer opened
- [ ] PortForward (4.86% coverage) in `frontend/src/components/common/Resource/PortForward.tsx` - Create PortForward.stories.tsx with port forward form, connection pending loading state, connection established success, connection failed error state, and port already in use error
- [ ] UploadDialog (3.89% coverage) in `frontend/src/components/common/Resource/UploadDialog.tsx` - Create UploadDialog.stories.tsx with empty upload dialog, file selected state, upload progress loading bar, upload success, and upload error for network/file size/invalid format issues
- [ ] DeleteMultipleButton (0% coverage) in `frontend/src/components/common/Resource/DeleteMultipleButton.tsx` - Create DeleteMultipleButton.stories.tsx with button enabled showing selection count, button disabled with no selection, batch delete confirmation dialog, delete progress indicator, and partial failure error state
- [ ] ResourceTableColumnChooser (0% coverage) in `frontend/src/components/common/Resource/ResourceTableColumnChooser.tsx` - Create ResourceTableColumnChooser.stories.tsx with column list checkboxes, select/deselect columns, reset to defaults action, and save preferences
- [ ] ResourceTableMultiActions (0% coverage) in `frontend/src/components/common/Resource/ResourceTableMultiActions.tsx` - Create ResourceTableMultiActions.stories.tsx with multi-action dropdown menu, actions disabled with no selection, bulk action confirmation, and bulk action error states
- [ ] Terminal (5.14% coverage) in `frontend/src/components/common/Terminal.tsx` - Create Terminal.stories.tsx with terminal connected and ready, terminal connection loading, terminal connection failed error, terminal with command output, and terminal disconnected state

#### Search & Navigation

- [ ] GlobalSearchContent (0% coverage) in `frontend/src/components/globalSearch/GlobalSearchContent.tsx` - Create GlobalSearchContent.stories.tsx with empty search state, search loading spinner, search results list, no results found, and search error state

#### Notifications

- [ ] NotificationList (0% coverage) in `frontend/src/components/App/Notifications/List/List.tsx` - Enhance List.stories.tsx with empty notification list, multiple notifications, notification types (info/warning/error/success), dismiss notification action, and clear all notifications

---

### Medium Coverage Components (20-60%)

These components have moderate test coverage but are missing critical error and loading state tests.

#### Common Resource Components

- [ ] DeleteButton (42.85% coverage) in `frontend/src/components/common/Resource/DeleteButton.tsx` - Create DeleteButton.stories.tsx with delete confirmation dialog, delete in progress loading state, delete success feedback, and delete error state with retry option
- [ ] ScaleButton (27.5% coverage) in `frontend/src/components/common/Resource/ScaleButton.tsx` - Enhance ScaleButton.stories.tsx with scale input form, scale validation for min replicas, scale in progress loading, scale success feedback, and scale error state
- [ ] EditButton (35.71% coverage) in `frontend/src/components/common/Resource/EditButton.tsx` - Create EditButton.stories.tsx with edit button states, unsaved changes warning, save in progress loading, and save error with error message
- [ ] CreateResourceButton (coverage unknown - estimate 40%) in `frontend/src/components/common/CreateResourceButton.tsx` - Enhance CreateResourceButton.stories.tsx with button states, resource creation dialog, validation errors, and creation success/failure
- [ ] CopyButton (coverage unknown - estimate 50%) in `frontend/src/components/common/Resource/CopyButton.tsx` - Enhance CopyButton.stories.tsx with copy success feedback, copy failure error, and clipboard permission denied state
- [ ] ViewButton (coverage unknown - estimate 45%) in `frontend/src/components/common/Resource/ViewButton.tsx` - Enhance ViewButton.stories.tsx with view dialog opening, loading resource data, and resource load error
- [ ] RestartButton (coverage unknown - estimate 50%) in `frontend/src/components/common/Resource/RestartButton.tsx` - Enhance RestartButton.stories.tsx with restart confirmation, restart in progress, restart success, and restart failure states
- [ ] RestartMultipleButton (coverage unknown - estimate 40%) in `frontend/src/components/common/Resource/RestartMultipleButton.tsx` - Enhance RestartMultipleButton.stories.tsx with bulk restart confirmation, progress indicator, and partial failure handling

#### Search Components

- [ ] GlobalSearch (coverage unknown - estimate 50%) in `frontend/src/components/globalSearch/GlobalSearch.tsx` - Enhance GlobalSearch.stories.tsx with search input interactions, keyboard shortcuts, search suggestions, and result navigation
- [ ] AdvancedSearch (54.26% coverage) in `frontend/src/components/advancedSearch/AdvancedSearch.tsx` - Enhance AdvancedSearch.stories.tsx with advanced filter options, filter validation, search execution loading, and search error states
- [ ] SearchSettings (40% coverage) in `frontend/src/components/advancedSearch/SearchSettings.tsx` - Enhance SearchSettings.stories.tsx with search preferences form, save settings success/error, and reset to defaults

#### Settings Components with Higher Coverage

- [ ] DrawerModeSettings (83.33% branch coverage needs improvement) in `frontend/src/components/App/Settings/DrawerModeSettings.tsx` - Create DrawerModeSettings.stories.tsx with drawer mode selection error states and preference save failures
- [ ] NodeShellSettings (73.68% coverage) in `frontend/src/components/App/Settings/NodeShellSettings.tsx` - Enhance NodeShellSettings.stories.tsx with shell configuration errors and validation failures
- [ ] PodDebugSettings (70.83% coverage) in `frontend/src/components/App/Settings/PodDebugSettings.tsx` - Enhance PodDebugSettings.stories.tsx with debug configuration errors and save failures
- [ ] SettingsButton (66.66% coverage) in `frontend/src/components/App/Settings/SettingsButton.tsx` - Add tests for button disabled states and click handler edge cases

#### Activity Feed

- [ ] Activity (30.06% coverage) in `frontend/src/components/activity/Activity.tsx` - Enhance Activity.stories.tsx with different active/inactive activity window states, collapsed vs expanded activity panel, multiple activity views/tabs, and window management interactions

#### Advanced Search

- [ ] ApiResourcePicker (30.64% coverage) in `frontend/src/components/advancedSearch/ApiResourcePicker.tsx` - Enhance ApiResourcePicker.stories.tsx with empty API resources list, search/filter behavior, filtered API resources display, and resource selection interactions/callbacks

#### Plugin Settings

- [ ] PluginSettings (47.43% coverage) in `frontend/src/components/App/PluginSettings/PluginSettings.tsx` - Enhance PluginSettings.stories.tsx with form submit loading state, form submit success state, form submit error state, validation errors, and plugin enable/disable actions
- [ ] PluginSettingsDetails (27.27% coverage) in `frontend/src/components/App/PluginSettings/PluginSettingsDetails.tsx` - Enhance PluginSettingsDetails.stories.tsx with plugin details loading spinner, plugin details loaded, plugin loading error, and plugin configuration form

#### Notifications

- [ ] Notifications (33.33% coverage) in `frontend/src/components/App/Notifications/Notifications.tsx` - Enhance Notifications.stories.tsx with empty notifications state, loading notifications state, notifications list with various types, and error loading notifications
- [ ] OauthPopup (20% coverage) in `frontend/src/components/oidcauth/OauthPopup.tsx` - Enhance OauthPopup.stories.tsx with OAuth flow loading state, authentication success, timeout errors, and connection failures

#### Settings Components

- [ ] ClusterNameEditor (32.87% coverage) in `frontend/src/components/App/Settings/ClusterNameEditor.tsx` - Enhance ClusterNameEditor.stories.tsx with edit cluster name form, name validation error state, save success feedback, and save error state
- [ ] NumRowsInput (54.23% coverage) in `frontend/src/components/App/Settings/NumRowsInput.tsx` - Create unit tests or story for input validation, min/max value constraints, and invalid number error state
- [ ] ShortcutsSettings (44.44% coverage) in `frontend/src/components/App/Settings/ShortcutsSettings.tsx` - Enhance ShortcutsSettings.stories.tsx with shortcut conflict detection, shortcut editing, save shortcuts success/error, and reset to defaults

#### Pod Components

- [ ] PodDebugTerminal (38.05% coverage) in `frontend/src/components/pod/PodDebugTerminal.tsx` - Enhance PodDebugTerminal.stories.tsx with debug terminal connecting, debug terminal connected, connection establishment error, and debug commands execution
- [ ] PodDebugAction (coverage unknown - estimate 30%) in `frontend/src/components/pod/PodDebugAction.tsx` - Create PodDebugAction.stories.tsx with debug action button, container selection, debug session starting loading, and debug connection error

#### Cluster & Home Components

- [ ] ClusterTable (75.51% coverage) in `frontend/src/components/App/Home/ClusterTable.tsx` - Enhance ClusterTable.stories.tsx with cluster table loading, empty clusters list, cluster actions menu, and cluster connection error states
- [ ] ClusterContextMenu (43.24% coverage) in `frontend/src/components/App/Home/ClusterContextMenu.tsx` - Add tests for context menu actions, action availability conditions, and action error states
- [ ] RecentClusters (64.1% coverage) in `frontend/src/components/App/Home/RecentClusters.tsx` - Enhance RecentClusters.stories.tsx with empty recent clusters, loading recent clusters, and recent cluster actions

#### Charts & Visualization

- [ ] Charts in node (coverage unknown - estimate 40%) in `frontend/src/components/node/Charts.tsx` - Create node Charts.stories.tsx with node metrics charts, loading state for metrics, error loading metrics, and empty metrics state
- [ ] Charts in workload (coverage unknown - estimate 40%) in `frontend/src/components/workload/Charts.tsx` - Create workload Charts.stories.tsx with workload metrics visualization, loading state, error state, and time range selector
- [ ] WorkloadOverview (coverage unknown - estimate 45%) in `frontend/src/components/workload/Overview.tsx` - Enhance Overview.stories.tsx with workload summary loading, workload metrics display, and error loading workload data
- [ ] ClusterOverview (53.57% coverage) in `frontend/src/components/cluster/Overview.tsx` - Enhance Overview.stories.tsx with loading states during metrics fetch, cluster health display, and metrics fetch error

---

### Very Low Coverage Components (Under 10%)

These components have very low test coverage and should be moved to critical priority after initial triage.

#### Node Management

- [ ] NodeDetails (9.27% coverage) in `frontend/src/components/node/Details.tsx` - Create NodeDetails.stories.tsx with node details loading skeleton, node details loaded, metrics loading state, node metrics loaded, and error loading node details
- [ ] NodeShellAction (0% coverage) in `frontend/src/components/node/NodeShellAction.tsx` - Create NodeShellAction.stories.tsx with shell action button, connection loading state, connection failed error, and shell terminal opened
- [ ] NodeShellTerminal (1.11% coverage) in `frontend/src/components/node/NodeShellTerminal.tsx` - Create NodeShellTerminal.stories.tsx with terminal connecting state, terminal connected, connection timeout error, terminal disconnected error, and terminal with command history

#### Project Management

- [ ] ProjectDetails (7.14% coverage) in `frontend/src/components/project/ProjectDetails.tsx` - Enhance ProjectDetails.stories.tsx with project details loading state for async resource loading, project details loaded, error loading project, and project resources tabs
- [ ] ProjectDeleteButton (0% coverage) in `frontend/src/components/project/ProjectDeleteButton.tsx` - Create ProjectDeleteButton.stories.tsx with delete button enabled, delete confirmation dialog, delete in progress, and delete error state
- [ ] ProjectDeleteDialog (0% coverage) in `frontend/src/components/project/ProjectDeleteDialog.tsx` - Create ProjectDeleteDialog.stories.tsx with confirmation dialog with warnings, delete button states, and deletion error feedback

#### Resource Glance Components

- [ ] DeploymentGlance (0% coverage) in `frontend/src/components/workload/DeploymentGlance.tsx` - Create DeploymentGlance.stories.tsx with glance card showing deployment status, loading state, error state, and multiple deployments
- [ ] EndpointsGlance (0% coverage) in `frontend/src/components/endpoints/EndpointsGlance.tsx` - Create EndpointsGlance.stories.tsx with endpoints overview, loading state, error state, and multiple endpoints
- [ ] HorizontalPodAutoscalerGlance (0% coverage) in `frontend/src/components/horizontalPodAutoscaler/HPAGlance.tsx` - Create HPAGlance.stories.tsx with HPA metrics display, loading state, error state, and scaling status
- [ ] PodGlance (0% coverage) in `frontend/src/components/pod/PodGlance.tsx` - Create PodGlance.stories.tsx with pod status overview, loading state, error state, and pod phase indicators
- [ ] ReplicaSetGlance (0% coverage) in `frontend/src/components/replicaset/ReplicaSetGlance.tsx` - Create ReplicaSetGlance.stories.tsx with replica set status, loading state, error state, and replica counts
- [ ] ServiceGlance (0% coverage) in `frontend/src/components/service/ServiceGlance.tsx` - Create ServiceGlance.stories.tsx with service overview, loading state, error state, and service endpoints

---

### Common Components Needing Enhancement

- [ ] Dialog (coverage unknown - estimate 60%) in `frontend/src/components/common/Dialog.tsx` - Enhance Dialog.stories.tsx with modal open/close states, dialog with form content, confirmation dialogs, and error dialogs
- [ ] ConfirmDialog (coverage unknown - estimate 55%) in `frontend/src/components/common/ConfirmDialog.tsx` - Enhance ConfirmDialog.stories.tsx with confirmation message variants, confirm/cancel actions, and async confirmation with loading
- [ ] ErrorPage (coverage unknown - estimate 50%) in `frontend/src/components/common/ErrorPage/ErrorPage.tsx` - Enhance ErrorPage.stories.tsx with different error types (404/500/403), error messages, and retry actions
- [ ] LogViewer (coverage unknown - estimate 45%) in `frontend/src/components/common/LogViewer.tsx` - Enhance LogViewer.stories.tsx with log content display, log filtering, log auto-refresh, and log loading error
- [ ] InnerTable (coverage unknown - estimate 50%) in `frontend/src/components/common/InnerTable.tsx` - Enhance InnerTable.stories.tsx with table with data, empty table, loading table, and table pagination
- [ ] SimpleTable (coverage unknown - estimate 55%) in `frontend/src/components/common/SimpleTable.tsx` - Enhance SimpleTable.stories.tsx with simple table layout, sorting, filtering, and empty state
- [ ] NameValueTable (coverage unknown - estimate 60%) in `frontend/src/components/common/NameValueTable/NameValueTable.tsx` - Enhance NameValueTable.stories.tsx with key-value pairs display, expandable rows, and copy value action

#### Layout & Navigation

- [ ] Layout (41.89% statements, 15.21% branch coverage) in `frontend/src/components/App/Layout.tsx` - Enhance Layout.stories.tsx with modal open/close branches, drawer open/close branches, and different layout configurations
- [ ] TopBar (55.55% statements, 53.65% branch coverage) in `frontend/src/components/App/TopBar.tsx` - Enhance TopBar.stories.tsx with menu dropdown branches, context menu actions, and user menu interactions
- [ ] RouteSwitcher (66.66% statements, 30% branch coverage) in `frontend/src/components/App/RouteSwitcher.tsx` - Enhance RouteSwitcher.stories.tsx with different route conditions, route guards, and fallback routes
- [ ] NavigationTabs (68.14% coverage) in `frontend/src/components/Sidebar/NavigationTabs.tsx` - Enhance NavigationTabs.stories.tsx with tab selection, tab badges, disabled tabs, and tab navigation
- [ ] Chooser (58.51% coverage) in `frontend/src/components/cluster/Chooser.tsx` - Enhance Chooser.stories.tsx with cluster selection dialog, multi-cluster display, cluster search, and cluster selection error

---

### Branch Coverage Issues (Low branch coverage)

These components need additional test scenarios to cover conditional branches.

- [ ] Layout (15.21% branch coverage) in `frontend/src/components/App/Layout.tsx` - Add tests for modal/drawer conditional branches and different layout states
- [ ] ColorPicker (0% branch coverage) in `frontend/src/components/App/Settings/ColorPicker.tsx` - Add tests covering all validation branches, custom color branch, and preset color selection branches
- [ ] IconPicker (0% branch coverage) in `frontend/src/components/App/Settings/IconPicker.tsx` - Add tests covering icon selection branches, search filtering branches, and empty results branches
- [ ] Terminal (1.65% branch coverage) in `frontend/src/components/common/Terminal.tsx` - Add tests for terminal command branches, connection state branches, and error handling branches

---

### Additional Components Needing Coverage

#### Dialog & Modal Components

- [ ] UpdatePopup (needs coverage) in `frontend/src/components/common/ReleaseNotes/UpdatePopup.tsx` - Enhance UpdatePopup.stories.tsx with update available notification, update checking, and update error states
- [ ] ReleaseNotesModal (needs coverage) in `frontend/src/components/common/ReleaseNotes/ReleaseNotesModal.tsx` - Enhance ReleaseNotesModal.stories.tsx with release notes content, loading release notes, and release notes fetch error
- [ ] VersionDialog (85.71% coverage) in `frontend/src/components/App/VersionDialog.tsx` - Enhance VersionDialog.stories.tsx with version information display and update check status

#### Form & Input Components

- [ ] NamespacesAutocomplete (needs coverage) in `frontend/src/components/common/NamespacesAutocomplete.tsx` - Enhance NamespacesAutocomplete.stories.tsx with namespace suggestions, loading namespaces, empty namespaces, and namespace selection
- [ ] TimezoneSelect (needs coverage) in `frontend/src/components/common/TimezoneSelect/TimezoneSelect.tsx` - Enhance TimezoneSelect.stories.tsx with timezone dropdown, timezone search, and timezone selection

#### List Components

- [ ] ObjectEventList (needs coverage) in `frontend/src/components/common/ObjectEventList.tsx` - Enhance ObjectEventList.stories.tsx with event list display, loading events, empty events, and event filtering

#### Resource Map

- [ ] SelectionBreadcrumbs (needs coverage) in `frontend/src/components/resourceMap/SelectionBreadcrumbs.tsx` - Create SelectionBreadcrumbs.stories.tsx with breadcrumb navigation, resource hierarchy, and breadcrumb click actions

---

### Missing Error State Handling

Components that need error boundary wrappers or better error handling patterns:

- [ ] Auth.tsx - Add loading state UI during authentication attempt (currently no visual feedback during promise resolution)
- [ ] KubeConfigLoader.tsx - Add timeout handling for large file parsing (has error state management but no timeout mechanism)
- [ ] OauthPopup.tsx - Add error boundary and comprehensive error state story for OAuth failures
- [ ] PortForward.tsx - Add specific error messages for different failure types (connection refused, port in use, permission denied)
- [ ] Terminal.tsx - Add reconnection logic and comprehensive error state for connection failures
- [ ] Activity.tsx - Add loading skeleton pattern (currently no loading indicator)
- [ ] ApiResourcePicker.tsx - Add loading skeleton pattern (currently no loading indicator)
- [ ] GlobalSearchContent.tsx - Add loading state (currently 0% coverage)
- [ ] NodeDetails.tsx - Add loading skeleton pattern (currently no loading indicator)
- [ ] ProjectDetails.tsx - Add loading skeleton pattern for async operations (currently no loading indicator)
- [ ] All Glance components - Add error state patterns (currently 0% coverage on error handling)

---

### Additional Kubernetes Resource Components

#### Role-Based Access Control (RBAC)

- [ ] RoleBindingDetails (0% coverage) in `frontend/src/components/role/BindingDetails.tsx` - Create BindingDetails.stories.tsx with role binding details display, subjects list, role reference, and loading/error states
- [ ] RoleBindingList (0% coverage) in `frontend/src/components/role/BindingList.tsx` - Create BindingList.stories.tsx with role bindings table, filtering by namespace, empty bindings list, and loading/error states
- [ ] RoleDetails (0% coverage) in `frontend/src/components/role/Details.tsx` - Create RoleDetails.stories.tsx with role permissions display, rules table, resource access details, and loading/error states
- [ ] RoleList (0% coverage) in `frontend/src/components/role/List.tsx` - Create RoleList.stories.tsx with roles table, cluster roles vs namespace roles, filtering, and loading/error states

#### Storage Components

- [ ] StorageClassDetails (needs coverage) in `frontend/src/components/storage/ClassDetails.tsx` - Enhance ClassDetails.stories.tsx with storage class parameters, provisioner details, reclaim policy, and volume binding mode
- [ ] VolumeDetails (needs coverage) in `frontend/src/components/storage/VolumeDetails.tsx` - Enhance VolumeDetails.stories.tsx with volume status, capacity information, access modes, and volume claim binding

#### Network Components

- [ ] EndpointDetails (needs coverage) in `frontend/src/components/endpoints/EndpointDetails.tsx` - Enhance EndpointDetails.stories.tsx with endpoint subsets, addresses and ports, loading state, and connection error
- [ ] EndpointSliceDetails (needs coverage) in `frontend/src/components/endpointSlices/EndpointSliceDetails.tsx` - Enhance EndpointSliceDetails.stories.tsx with endpoint slice information, address types, and port mappings

#### Workload Components

- [ ] DaemonSetList (needs coverage) in `frontend/src/components/daemonset/List.tsx` - Enhance DaemonSetList.stories.tsx with daemon set table, desired vs current pods, node selector display, and update strategy
- [ ] DeploymentList (needs coverage) in `frontend/src/components/deployments/List.tsx` - Enhance DeploymentList.stories.tsx with deployment table, replica status, deployment strategies, and rollout status
- [ ] StatefulSetDetails (needs coverage) in `frontend/src/components/statefulset/Details.tsx` - Enhance StatefulSetDetails.stories.tsx with stateful set configuration, persistent volume claims, update strategy, and pod management
- [ ] ReplicaSetList (needs coverage) in `frontend/src/components/replicaset/List.tsx` - Enhance ReplicaSetList.stories.tsx with replica set table, owner references, replica counts, and pod template
- [ ] JobList (needs coverage) in `frontend/src/components/job/JobList.tsx` - Enhance JobList.stories.tsx with job table, completion status, parallelism configuration, and job duration

#### Gateway API Components

- [ ] GatewayDetails (needs coverage) in `frontend/src/components/gateway/GatewayDetails.tsx` - Enhance GatewayDetails.stories.tsx with gateway configuration, listeners, addresses, and gateway status
- [ ] HTTPRouteDetails (needs coverage) in `frontend/src/components/gateway/HTTPRouteDetails.tsx` - Enhance HTTPRouteDetails.stories.tsx with route rules, hostname matches, path matching, and backend references
- [ ] GRPCRouteDetails (needs coverage) in `frontend/src/components/gateway/GRPCRouteDetails.tsx` - Enhance GRPCRouteDetails.stories.tsx with gRPC route rules, service matching, and backend configuration

#### Policy & Configuration

- [ ] NetworkPolicyDetails (needs coverage) in `frontend/src/components/networkpolicy/Details.tsx` - Enhance NetworkPolicyDetails.stories.tsx with policy rules, ingress/egress rules, pod selector, and namespace selector
- [ ] LimitRangeDetails (needs coverage) in `frontend/src/components/limitRange/Details.tsx` - Enhance LimitRangeDetails.stories.tsx with resource limits, default limits, and limit types
- [ ] ResourceQuotaDetails (needs coverage) in `frontend/src/components/resourceQuota/resourceQuotaDetails.tsx` - Enhance resourceQuotaDetails.stories.tsx with quota limits, used resources, and quota scope
- [ ] PodDisruptionBudgetDetails (needs coverage) in `frontend/src/components/podDisruptionBudget/pdbDetails.tsx` - Enhance pdbDetails.stories.tsx with disruption policy, min available, max unavailable, and current status

#### Security & Admission

- [ ] MutatingWebhookConfigDetails (needs coverage) in `frontend/src/components/webhookconfiguration/MutatingWebhookConfigDetails.tsx` - Enhance MutatingWebhookConfigDetails.stories.tsx with webhook rules, client configuration, admission policy, and failure policy
- [ ] ValidatingWebhookConfigDetails (needs coverage) in `frontend/src/components/webhookconfiguration/ValidatingWebhookConfigDetails.tsx` - Enhance ValidatingWebhookConfigDetails.stories.tsx with validation rules, webhook configuration, match policy, and timeout configuration
- [ ] PriorityClassDetails (needs coverage) in `frontend/src/components/priorityClass/priorityClassDetails.tsx` - Enhance priorityClassDetails.stories.tsx with priority value, global default flag, preemption policy, and description

#### Autoscaling Components

- [ ] HPADetails (needs coverage) in `frontend/src/components/horizontalPodAutoscaler/HPADetails.tsx` - Enhance HPADetails.stories.tsx with scaling metrics, current/desired replicas, scaling policy, and metric targets
- [ ] VPADetails (needs coverage) in `frontend/src/components/verticalPodAutoscaler/VPADetails.tsx` - Enhance VPADetails.stories.tsx with resource recommendations, update policy, target reference, and recommendation status

#### Configuration & Secrets

- [ ] ConfigMapDetails (needs coverage) in `frontend/src/components/configmap/Details.tsx` - Enhance ConfigMapDetails.stories.tsx with config data display, binary data handling, immutable flag, and data size limits
- [ ] SecretDetails (needs coverage) in `frontend/src/components/secret/Details.tsx` - Enhance SecretDetails.stories.tsx with secret data (masked), secret type, immutable flag, and secret usage in pods

#### Service & Networking

- [ ] ServiceDetails (needs coverage) in `frontend/src/components/service/ServiceDetails.tsx` - Enhance ServiceDetails.stories.tsx with service type (ClusterIP/NodePort/LoadBalancer), port configuration, selector, and endpoint status
- [ ] IngressDetails (needs coverage) in `frontend/src/components/ingress/Details.tsx` - Enhance IngressDetails.stories.tsx with ingress rules, TLS configuration, backend services, and ingress class

---

### Testing Recommendations

#### Priority 1 (Critical - Week 1)

Focus on components with under 20% coverage that have significant user interaction:

- [ ] ColorPicker.tsx - Color validation and selection
- [ ] Auth.tsx - Authentication flow with errors
- [ ] KubeConfigLoader.tsx - File loading with errors and timeouts
- [ ] Notifications.tsx - Notification states

#### Priority 2 (High - Week 2)

Components with critical operations that need error handling:

- [ ] DeleteMultipleButton.tsx - Batch operations with partial failures
- [ ] ScaleButton.tsx - Validation and error states
- [ ] ApiResourcePicker.tsx - Loading and error states
- [ ] Activity.tsx - Loading and empty states

#### Priority 3 (Medium - Week 3-4)

Advanced features and terminal components:

- [ ] NodeShellTerminal.tsx - Connection states and errors
- [ ] PodDebugTerminal.tsx - Debug session states
- [ ] PortForward.tsx - Port forwarding workflow
- [ ] ProjectDetails.tsx - Project management flows

#### Priority 4 (Low - Ongoing)

Resource glance components and remaining coverage:

- [ ] All *Glance.tsx components - Quick overview cards
- [ ] Branch coverage improvements for Layout, TopBar, RouteSwitcher

---

### Testing Patterns & Best Practices

#### Error Boundary Wrapper

For components that might throw errors:

```typescript
export const WithErrorBoundary = () => (
  <ErrorBoundary>
    <ComponentThatMightError />
  </ErrorBoundary>
);
```

#### Loading State Pattern

Use the Loader component or skeleton screens:

```typescript
export const LoadingState = () => (
  <Loader title="Loading resources..." />
);
```

#### Error State Pattern

Provide clear error messages:

```typescript
import { Alert } from '@mui/material';

export const ErrorState = () => (
  <Alert severity="error">
    Failed to load cluster configuration. Please check your connection.
  </Alert>
);
```

#### Empty State Pattern

Guide users on what to do:

```typescript
export const EmptyState = () => (
  <EmptyContent>
    <div style={{ textAlign: 'center' }}>
      <p>No clusters configured.</p>
      <Button variant="contained" color="primary">
        Add Cluster
      </Button>
    </div>
  </EmptyContent>
);
```

---

### Coverage Goals

**Current Baseline:**
- Statements: 55.24%
- Branches: 47.36%
- Functions: 51.42%
- Lines: 55.54%

**Target Coverage (After implementing above tests):**
- Statements: 65%+ (increase by ~10%)
- Branches: 55%+ (increase by ~8%)
- Functions: 60%+ (increase by ~9%)
- Lines: 65%+ (increase by ~10%)

**Milestone Tracking:**
- Priority 1 completed: +3% coverage
- Priority 2 completed: +5% coverage
- Priority 3 completed: +2% coverage
- All priorities completed: Target achieved

---

### How to Run Tests

```bash
# Run all tests with coverage (from repo root)
npm run frontend:test

# Run specific test file (from repo root)
cd frontend && npm test -- --run src/components/App/Settings/ColorPicker.test.tsx

# View coverage report (macOS) - from repo root
open frontend/coverage/index.html

# View coverage report (Linux) - from repo root
xdg-open frontend/coverage/index.html

# View coverage report (Windows) - from repo root
start frontend/coverage/index.html
```

### How to Run Storybook

```bash
# Start storybook server
npm run frontend:storybook

# Build storybook for documentation
npm run frontend:build:storybook
```

---

### Notes

- Story files should be named `ComponentName.stories.tsx`. Prefer colocating stories in the same directory as the component, but some components instead use a `ComponentName.stories/` directory (for example, `frontend/src/components/common/Chart.stories/*`).
- Each story should represent a meaningful state or use case of the component
- Focus on error states and loading states, as these are often missed in manual testing
- Use MSW (Mock Service Worker) to mock API calls in stories when needed
- Storybook stories serve as both documentation and smoke tests via `frontend/src/storybook.test.tsx` (run with `cd frontend && npm test`)

---

**Last Updated:** 2026-02-08  
**Document Status:** Initial version - requires periodic updates as coverage improves
