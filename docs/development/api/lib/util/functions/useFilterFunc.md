# Function: useFilterFunc()

```ts
function useFilterFunc<T>(matchCriteria?: string[]): (item: T, search?: string) => boolean
```

Get a function to filter kube resources based on the current global filter state.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `T` *extends* [`KubeObjectInterface`](../../k8s/KubeObject/interfaces/KubeObjectInterface.md) \| [`KubeEvent`](../../k8s/event/interfaces/KubeEvent.md) \| `object` | [`KubeObjectInterface`](../../k8s/KubeObject/interfaces/KubeObjectInterface.md) \| [`KubeEvent`](../../k8s/event/interfaces/KubeEvent.md) |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `matchCriteria`? | `string`[] | The JSONPath criteria to match. |

## Returns

`Function`

A filter function that can be used to filter a list of items.

### Parameters

| Parameter | Type |
| ------ | ------ |
| `item` | `T` |
| `search`? | `string` |

### Returns

`boolean`

## Defined in

[src/lib/util.ts:181](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/util.ts#L181)
