# Function: combineClusterListErrors()

```ts
function combineClusterListErrors(...args: (null | object)[]): object | null
```

Combines errors per cluster.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| ...`args` | (`null` \| `object`)[] | The list of errors per cluster to join. |

## Returns

`object` \| `null`

The joint list of errors, or null if there are no errors.

## Defined in

[src/lib/util.ts:234](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/util.ts#L234)
