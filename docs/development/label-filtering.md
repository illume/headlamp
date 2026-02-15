# Label Filtering in List Views

## Overview

Headlamp now supports filtering resources by labels in all list views. This feature allows users to filter Kubernetes resources using label selectors, similar to `kubectl get pods -l app=nginx`.

## Usage

### Basic Filtering

In any resource list view (Pods, Deployments, Services, etc.), you'll find a "Label Selector" input field next to the namespace filter.

**Examples:**
- Filter by single label: `app=nginx`
- Filter by multiple labels: `app=nginx,env=production`
- Filter with operators: `app=nginx,env in (prod,staging),tier!=backend`

### Label Selector Syntax

The label selector supports the same syntax as Kubernetes label selectors:

#### Equality-based requirements:
- `key=value` - Match resources with label key equal to value
- `key!=value` - Match resources with label key not equal to value

#### Set-based requirements:
- `key in (value1,value2)` - Match resources where key is one of the values
- `key notin (value1,value2)` - Match resources where key is not one of the values
- `key` - Match resources that have the label key
- `!key` - Match resources that don't have the label key

### Persistence

Label selector filters are persisted per cluster in two ways:
1. **localStorage** - The filter is saved in browser storage and restored when you return to the cluster
2. **URL** - The filter is reflected in the URL query parameter, allowing you to share filtered views

### Clearing Filters

Click the "X" button in the label selector input to clear the filter.

## Implementation Details

### Components

- **LabelSelectorInput** (`frontend/src/components/common/LabelSelectorInput.tsx`)
  - Text input component for entering label selectors
  - Supports Enter key and blur events to apply filter
  - Displays clear button when value is present
  - Persists to URL and localStorage

- **SectionFilterHeader** (`frontend/src/components/common/SectionFilterHeader.tsx`)
  - Integrates label selector alongside namespace filter
  - Can be disabled per-view with `noLabelFilter` prop

### State Management

- **Redux filterSlice** (`frontend/src/redux/filterSlice.ts`)
  - Manages `labelSelector` state
  - `setLabelSelectorFilter(labelSelector: string)` action
  - `useLabelSelector()` hook for accessing the current filter

- **Storage** (`frontend/src/lib/storage.ts`)
  - `getSavedLabelSelector(cluster?: string)` - Load saved filter
  - `saveLabelSelector(labelSelector: string, cluster?: string)` - Save filter

### API Integration

Label selectors are passed to the Kubernetes API via the `labelSelector` query parameter:

```typescript
const { items } = Pod.useList({
  namespace: useNamespaces(),
  labelSelector: useLabelSelector(),
});
```

For views using `ResourceTable` with `resourceClass`, label filtering is automatically applied.

## Testing

Comprehensive tests are included:

- **Storage tests** (`frontend/src/lib/storage.test.ts`) - 13 tests for persistence
- **Redux tests** (`frontend/src/redux/filterSlice.test.ts`) - 12 tests for state management  
- **Component tests** (`frontend/src/components/common/LabelSelectorInput.test.tsx`) - 11 tests for UI

Run tests with:
```bash
npm run frontend:test
```

## Examples

### Filter Pods by App Label
```
app=nginx
```

### Filter Production Pods
```
env=production
```

### Filter Multiple Labels
```
app=nginx,env=production,version=v1.0
```

### Complex Filtering
```
app in (nginx,apache),env=production,tier!=backend
```
