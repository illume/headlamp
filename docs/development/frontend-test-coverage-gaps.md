# Frontend Test Coverage Gaps & Required Tests

**Generated:** 2026-02-08  
**Current Coverage:** 55.24% statements | 47.36% branches | 51.42% functions | 55.54% lines  
**Existing Storybooks:** 174 files  
**Target Coverage:** 65%+

This document outlines missing frontend tests and storybooks that need to be written to improve test coverage, with a focus on error states and loading states.

---

## Issues by Category

### Critical: Zero/Near-Zero Coverage Components (0-10%)

These components have <10% test coverage and require immediate attention with comprehensive storybooks.

#### Settings Components

- [ ] **ColorPicker** (4.34% coverage): `frontend/src/components/App/Settings/ColorPicker.tsx` - Create `ColorPicker.stories.tsx` with the following stories:
  - Default state with preset colors
  - Custom color input mode
  - Invalid color validation error state
  - Color selection callback
  - Already selected color highlighted

- [ ] **IconPicker** (5.88% coverage): `frontend/src/components/App/Settings/IconPicker.tsx` - Create `IconPicker.stories.tsx` with the following stories:
  - Icon grid display
  - Icon search/filter
  - Selected icon highlight
  - Icon selection callback
  - Empty search results state

- [ ] **SettingsCluster** (0% coverage): `frontend/src/components/App/Settings/SettingsCluster.tsx` - Create `SettingsCluster.stories.tsx` with the following stories:
  - Cluster settings form
  - Save success state
  - Save error state
  - Loading state during save
  - Validation errors

- [ ] **SettingsClusters** (0% coverage): `frontend/src/components/App/Settings/SettingsClusters.tsx` - Create `SettingsClusters.stories.tsx` with the following stories:
  - Cluster list display
  - Empty cluster list
  - Add cluster action
  - Delete cluster confirmation

#### Authentication & Cluster Management

- [ ] **Auth** (18.18% coverage): `frontend/src/components/account/Auth.tsx` - Create `Auth.stories.tsx` with the following stories:
  - Token input form
  - Login loading state (missing)
  - Invalid token error state (network error feedback missing)
  - Timeout error state
  - Success redirect

- [ ] **AuthChooser** (4.1% coverage): `frontend/src/components/authchooser/index.tsx` - Enhance existing `AuthChooser.stories.tsx` with:
  - Multiple auth methods display
  - Auth method selection
  - Loading state during auth flow
  - Authentication failure error
  - Redirect after success

- [ ] **KubeConfigLoader** (7.92% coverage): `frontend/src/components/cluster/KubeConfigLoader.tsx` - Create `KubeConfigLoader.stories.tsx` with the following stories:
  - File upload drag-and-drop
  - File parsing loading state (uses `<Loader>` but story missing)
  - Invalid YAML error state
  - Duplicate cluster error state
  - Large file parsing timeout
  - Success with cluster list

- [ ] **AddCluster** (0% coverage): `frontend/src/components/App/CreateCluster/AddCluster.tsx` - Create `AddCluster.stories.tsx` with the following stories:
  - Empty form state
  - Form validation errors
  - Cluster connection test loading
  - Connection test success/failure
  - Save cluster success

#### Common Resource Components

- [ ] **LogsButton** (0.61% coverage): `frontend/src/components/common/Resource/LogsButton.tsx` - Create `LogsButton.stories.tsx` with the following stories:
  - Button enabled state
  - Button disabled state (no logs available)
  - Loading logs spinner
  - Logs viewer opened

- [ ] **PortForward** (4.86% coverage): `frontend/src/components/common/Resource/PortForward.tsx` - Create `PortForward.stories.tsx` with the following stories:
  - Port forward form
  - Connection pending loading state (missing)
  - Connection established success
  - Connection failed error state
  - Port already in use error

- [ ] **UploadDialog** (3.89% coverage): `frontend/src/components/common/Resource/UploadDialog.tsx` - Create `UploadDialog.stories.tsx` with the following stories:
  - Empty upload dialog
  - File selected state
  - Upload progress loading bar
  - Upload success
  - Upload error (network, file size, invalid format)

- [ ] **DeleteMultipleButton** (0% coverage): `frontend/src/components/common/Resource/DeleteMultipleButton.tsx` - Create `DeleteMultipleButton.stories.tsx` with the following stories:
  - Button enabled with selection count
  - Button disabled (no selection)
  - Batch delete confirmation dialog
  - Delete progress indicator
  - Partial failure error state (some deletions failed)

- [ ] **ResourceTableColumnChooser** (0% coverage): `frontend/src/components/common/Resource/ResourceTableColumnChooser.tsx` - Create `ResourceTableColumnChooser.stories.tsx` with the following stories:
  - Column list with checkboxes
  - Select/deselect columns
  - Reset to defaults action
  - Save preferences

- [ ] **ResourceTableMultiActions** (0% coverage): `frontend/src/components/common/Resource/ResourceTableMultiActions.tsx` - Create `ResourceTableMultiActions.stories.tsx` with the following stories:
  - Multi-action dropdown menu
  - Actions disabled (no selection)
  - Bulk action confirmation
  - Bulk action error states

- [ ] **Terminal** (5.14% coverage): `frontend/src/components/common/Terminal.tsx` - Create `Terminal.stories.tsx` with the following stories:
  - Terminal connected and ready
  - Terminal connection loading
  - Terminal connection failed error
  - Terminal with command output
  - Terminal disconnected state

#### Search & Navigation

- [ ] **GlobalSearchContent** (0% coverage): `frontend/src/components/globalSearch/GlobalSearchContent.tsx` - Create `GlobalSearchContent.stories.tsx` with the following stories:
  - Empty search state
  - Search loading spinner (missing)
  - Search results list
  - No results found
  - Search error state

#### Notifications

- [ ] **NotificationList** (0% coverage): `frontend/src/components/App/Notifications/List/List.tsx` - Enhance existing `List.stories.tsx` with:
  - Empty notification list
  - Multiple notifications
  - Notification types (info, warning, error, success)
  - Dismiss notification action
  - Clear all notifications

---

### Low Coverage Components (10-50%)

These components have some test coverage but are missing critical error and loading state tests.

#### Activity Feed

- [ ] **Activity** (30.06% coverage): `frontend/src/components/activity/Activity.tsx` - Enhance existing `Activity.stories.tsx` with:
  - Loading skeleton during data fetch (missing)
  - Empty activity feed state (lines 53-143 uncovered)
  - Activity feed with various event types
  - Real-time update animation
  - Error loading activity data

#### Advanced Search

- [ ] **ApiResourcePicker** (30.64% coverage): `frontend/src/components/advancedSearch/ApiResourcePicker.tsx` - Enhance existing `ApiResourcePicker.stories.tsx` with:
  - Loading skeleton during API fetch (missing)
  - Empty API resources list
  - Filtered API resources
  - API fetch error state (lines 80-184 uncovered)
  - Resource selection callback

#### Plugin Settings

- [ ] **PluginSettings** (47.43% coverage): `frontend/src/components/App/PluginSettings/PluginSettings.tsx` - Enhance existing `PluginSettings.stories.tsx` with:
  - Form submit loading state
  - Form submit success state (lines 185-210 uncovered)
  - Form submit error state (lines 391-457 uncovered)
  - Validation errors
  - Plugin enable/disable actions

- [ ] **PluginSettingsDetails** (27.27% coverage): `frontend/src/components/App/PluginSettings/PluginSettingsDetails.tsx` - Enhance existing `PluginSettingsDetails.stories.tsx` with:
  - Plugin details loading spinner (missing)
  - Plugin details loaded
  - Plugin loading error (lines 43-68, 196-216 uncovered)
  - Plugin configuration form

#### Notifications

- [ ] **Notifications** (33.33% coverage): `frontend/src/components/App/Notifications/Notifications.tsx` - Enhance existing `Notifications.stories.tsx` with:
  - Empty notifications state (lines 53-143 uncovered)
  - Loading notifications state
  - Notifications list with various types
  - Error loading notifications (lines 183-207 uncovered)

#### Settings Components

- [ ] **ClusterNameEditor** (32.87% coverage): `frontend/src/components/App/Settings/ClusterNameEditor.tsx` - Enhance existing `ClusterNameEditor.stories.tsx` with:
  - Edit cluster name form
  - Name validation error state (lines 81-106 uncovered)
  - Save success feedback
  - Save error state (lines 140-188 uncovered)

- [ ] **NumRowsInput** (54.23% coverage): `frontend/src/components/App/Settings/NumRowsInput.tsx` - Create unit tests or story for:
  - Input validation (lines 40-41, 47 uncovered)
  - Min/max value constraints (lines 76-77, 81, 85 uncovered)
  - Invalid number error state (lines 106-140 uncovered)

#### Resource Action Buttons

- [ ] **DeleteButton** (42.85% coverage): `frontend/src/components/common/Resource/DeleteButton.tsx` - Create enhanced stories for:
  - Delete confirmation dialog
  - Delete in progress loading state
  - Delete success feedback
  - Delete error state with retry option

- [ ] **ScaleButton** (27.5% coverage): `frontend/src/components/common/Resource/ScaleButton.tsx` - Create enhanced stories for:
  - Scale input form
  - Scale validation (e.g., min replicas)
  - Scale in progress loading
  - Scale success feedback
  - Scale error state

- [ ] **EditButton** (35.71% coverage): `frontend/src/components/common/Resource/EditButton.tsx` - Create enhanced stories for:
  - Edit button states
  - Unsaved changes warning
  - Save in progress loading
  - Save error with error message

#### Node Management

- [ ] **NodeDetails** (9.27% coverage): `frontend/src/components/node/Details.tsx` - Create `NodeDetails.stories.tsx` with:
  - Node details loading skeleton (missing)
  - Node details loaded
  - Metrics loading state
  - Node metrics loaded
  - Error loading node details

- [ ] **NodeShellAction** (0% coverage): `frontend/src/components/node/NodeShellAction.tsx` - Create `NodeShellAction.stories.tsx` with:
  - Shell action button
  - Connection loading state
  - Connection failed error (missing)
  - Shell terminal opened

- [ ] **NodeShellTerminal** (1.11% coverage): `frontend/src/components/node/NodeShellTerminal.tsx` - Create `NodeShellTerminal.stories.tsx` with:
  - Terminal connecting state
  - Terminal connected
  - Connection timeout error (missing)
  - Terminal disconnected error
  - Terminal with command history

#### Pod Components

- [ ] **PodDebugTerminal** (38.05% coverage): `frontend/src/components/pod/PodDebugTerminal.tsx` - Enhance existing `PodDebugTerminal.stories.tsx` with:
  - Debug terminal connecting (missing)
  - Debug terminal connected
  - Connection establishment error (missing)
  - Debug commands execution

#### Project Management

- [ ] **ProjectDetails** (7.14% coverage): `frontend/src/components/project/ProjectDetails.tsx` - Enhance existing `ProjectDetails.stories.tsx` with:
  - Project details loading state (async resource loading)
  - Project details loaded
  - Error loading project
  - Project resources tabs

- [ ] **ProjectDeleteButton** (0% coverage): `frontend/src/components/project/ProjectDeleteButton.tsx` - Create `ProjectDeleteButton.stories.tsx` with:
  - Delete button enabled
  - Delete confirmation dialog
  - Delete in progress
  - Delete error state

- [ ] **ProjectDeleteDialog** (0% coverage): `frontend/src/components/project/ProjectDeleteDialog.tsx` - Create `ProjectDeleteDialog.stories.tsx` with:
  - Confirmation dialog with warnings
  - Delete button states
  - Deletion error feedback

#### Resource Glance Components

All resource glance components are missing storybooks. These should show quick overview cards of resources:

- [ ] **DeploymentGlance** (0% coverage): `frontend/src/components/workload/DeploymentGlance.tsx` - Create `DeploymentGlance.stories.tsx` with:
  - Glance card with deployment status
  - Loading state
  - Error state
  - Multiple deployments

- [ ] **EndpointsGlance** (0% coverage): `frontend/src/components/endpoints/EndpointsGlance.tsx` - Create `EndpointsGlance.stories.tsx` with similar states

- [ ] **HorizontalPodAutoscalerGlance** (0% coverage): `frontend/src/components/horizontalPodAutoscaler/HPAGlance.tsx` - Create `HPAGlance.stories.tsx` with similar states

- [ ] **PodGlance** (0% coverage): `frontend/src/components/pod/PodGlance.tsx` - Create `PodGlance.stories.tsx` with similar states

- [ ] **ReplicaSetGlance** (0% coverage): `frontend/src/components/replicaset/ReplicaSetGlance.tsx` - Create `ReplicaSetGlance.stories.tsx` with similar states

- [ ] **ServiceGlance** (0% coverage): `frontend/src/components/service/ServiceGlance.tsx` - Create `ServiceGlance.stories.tsx` with similar states

---

### Branch Coverage Issues (<30% branches)

These components need additional test scenarios to cover conditional branches.

#### Layout & Navigation

- [ ] **Layout** (15.21% branch coverage): `frontend/src/components/App/Layout.tsx` - Enhance existing `Layout.stories.tsx` with:
  - Modal open/close branches (lines 102-123 uncovered)
  - Drawer open/close branches (lines 141-181 uncovered)
  - Different layout configurations

- [ ] **TopBar** (53.65% branch coverage): `frontend/src/components/App/TopBar.tsx` - Enhance existing `TopBar.stories.tsx` with:
  - Menu dropdown branches (lines 98-140 uncovered)
  - Context menu actions (lines 212-238 uncovered)
  - User menu interactions

- [ ] **RouteSwitcher** (30% branch coverage): `frontend/src/components/App/RouteSwitcher.tsx` - Enhance existing `RouteSwitcher.stories.tsx` with:
  - Different route conditions (lines 137-138, 185-190 uncovered)
  - Route guards
  - Fallback routes

- [ ] **ClusterContextMenu** (44.44% branch coverage): `frontend/src/components/App/Home/ClusterContextMenu.tsx` - Create unit tests or stories for:
  - Context menu actions (lines 60-74, 123-193 uncovered)
  - Action availability conditions
  - Action error states

---

### Missing Error Boundaries & Error Handling

Components that need error boundary wrappers or better error handling patterns.

#### High Priority

- [ ] **Auth.tsx**: Add loading state UI during authentication attempt (currently just relies on promise, no visual feedback)

- [ ] **KubeConfigLoader.tsx**: Add timeout handling for large file parsing (has error state but no timeout mechanism)

- [ ] **OauthPopup.tsx** (20% coverage): Add error boundary and error state story for OAuth failures

- [ ] **PortForward.tsx**: Add specific error messages for different failure types (connection refused, port in use, etc.)

- [ ] **Terminal.tsx**: Add reconnection logic and error state for connection failures

#### Component Error State Patterns

All components loading async data should follow this pattern:

```typescript
// 1. Loading State
<Loader title="Loading..." />

// 2. Error State
<AlertNotification message={errorMessage} severity="error" />

// 3. Empty State
<EmptyContent>No data available</EmptyContent>
```

**Components missing these patterns:**

- [ ] Activity.tsx - No loading skeleton
- [ ] ApiResourcePicker.tsx - No loading skeleton
- [ ] GlobalSearchContent.tsx - No loading state
- [ ] NodeDetails.tsx - No loading skeleton
- [ ] ProjectDetails.tsx - No loading skeleton
- [ ] All *Glance.tsx components - No error states

---

### Testing Recommendations

#### Priority 1 (Critical - Week 1)

Focus on components with <10% coverage that have significant user interaction:

1. ✅ ColorPicker.tsx - Color validation and selection
2. ✅ Auth.tsx - Authentication flow with errors
3. ✅ KubeConfigLoader.tsx - File loading with errors and timeouts
4. ✅ Notifications.tsx - Notification states

#### Priority 2 (High - Week 2)

Components with critical operations that need error handling:

5. ✅ DeleteMultipleButton.tsx - Batch operations with partial failures
6. ✅ ScaleButton.tsx - Validation and error states
7. ✅ ApiResourcePicker.tsx - Loading and error states
8. ✅ Activity.tsx - Loading and empty states

#### Priority 3 (Medium - Week 3-4)

Advanced features and terminal components:

9. ✅ NodeShellTerminal.tsx - Connection states and errors
10. ✅ PodDebugTerminal.tsx - Debug session states
11. ✅ PortForward.tsx - Port forwarding workflow
12. ✅ ProjectDetails.tsx - Project management flows

#### Priority 4 (Low - Ongoing)

Resource glance components and remaining coverage:

13. ✅ All *Glance.tsx components - Quick overview cards
14. ✅ Branch coverage improvements for Layout, TopBar, RouteSwitcher

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
export const ErrorState = () => (
  <AlertNotification 
    message="Failed to load cluster configuration. Please check your connection."
    severity="error"
  />
);
```

#### Empty State Pattern

Guide users on what to do:

```typescript
export const EmptyState = () => (
  <EmptyContent
    icon={mdiCloudOffOutline}
    message="No clusters configured"
    actionButton={<Button>Add Cluster</Button>}
  />
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
# Run all tests with coverage
cd frontend && npm test -- --coverage --run

# Run specific test file
cd frontend && npm test -- --run src/components/App/Settings/ColorPicker.test.tsx

# View coverage report
open frontend/coverage/index.html
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

- Story files should be named `ComponentName.stories.tsx` and placed in the same directory as the component
- Each story should represent a meaningful state or use case of the component
- Focus on error states and loading states, as these are often missed in manual testing
- Use MSW (Mock Service Worker) to mock API calls in stories when needed
- Storybook stories serve as both documentation and smoke tests via `storybook.test.tsx`

---

**Last Updated:** 2026-02-08  
**Document Status:** Initial version - requires periodic updates as coverage improves
