# Function: registerMapSource()

```ts
function registerMapSource(source: GraphSource): void
```

Registers a new graph source in the store.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `source` | [`GraphSource`](../type-aliases/GraphSource.md) | The graph source to be registered. |

## Returns

`void`

## Example

```tsx
const mySource = {
  id: 'my-source',
  label: 'Sample source',
  useData() {
    return {
      nodes: [{ id: 'my-node', type: 'kubeObject', data: { resource: myCustomResource } }],
      edges: []
    };
  }
}

registerMapSource(mySource);
```

## Defined in

[src/plugin/registry.tsx:824](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/plugin/registry.tsx#L824)
