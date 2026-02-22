# Function: registerProjectDetailsTab()

```ts
function registerProjectDetailsTab(projectDetailsTab: ProjectDetailsTab): void
```

Register a new tab in the project details view.

This allows plugins to add custom tabs to the project details page,
extending the information displayed about a project.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `projectDetailsTab` | `ProjectDetailsTab` | The tab configuration to register |

## Returns

`void`

## Example

```tsx
registerProjectDetailsTab({
  id: 'custom-metrics',
  label: 'Metrics',
  component: ({ project }) => <ProjectMetrics project={project} />
});
```

## Defined in

[src/plugin/registry.tsx:1106](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/plugin/registry.tsx#L1106)
