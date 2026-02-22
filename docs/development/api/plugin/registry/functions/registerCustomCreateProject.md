# Function: registerCustomCreateProject()

```ts
function registerCustomCreateProject(customCreateProject: CustomCreateProject): void
```

Register a new way to create Headlamp 'Projects'

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `customCreateProject` | `CustomCreateProject` | Definition for custom creator |

## Returns

`void`

## Example

```tsx
registerCustomCreateProject({
  id: "custom-create",
  name: "Create Helm Project",
  description: "Create new project from Helm chart",
  Component: ({onBack}) => <div>
    Create project
    <input name="helm-chart-id" />
    <button>Create</button>
    <button onClick={onBack}>Back</button>
  </div>,
})
```

## Defined in

[src/plugin/registry.tsx:1080](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/plugin/registry.tsx#L1080)
