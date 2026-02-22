# Function: flattenClusterListItems()

```ts
function flattenClusterListItems<T>(...args: (null | object)[]): T[] | null
```

This function joins a list of items per cluster into a single list of items.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| ...`args` | (`null` \| `object`)[] | The list of objects per cluster to join. |

## Returns

`T`[] \| `null`

The joined list of items, or null if there are no items.

## Defined in

[src/lib/util.ts:218](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/util.ts#L218)
