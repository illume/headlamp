# Function: filterResource()

```ts
function filterResource(
   item: KubeObjectInterface | KubeEvent, 
   filter: FilterState, 
   search?: string, 
   matchCriteria?: string[]): boolean
```

Filters a resource based on the filter state.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `item` | [`KubeObjectInterface`](../../k8s/KubeObject/interfaces/KubeObjectInterface.md) \| [`KubeEvent`](../../k8s/event/interfaces/KubeEvent.md) | The item to filter. |
| `filter` | `FilterState` | The filter state. |
| `search`? | `string` | - |
| `matchCriteria`? | `string`[] | The JSONPath criteria to match. |

## Returns

`boolean`

True if the item matches the filter, false otherwise.

## Defined in

[src/redux/filterSlice.ts:44](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/filterSlice.ts#L44)
