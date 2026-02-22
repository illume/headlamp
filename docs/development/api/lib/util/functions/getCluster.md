# Function: getCluster()

```ts
function getCluster(urlPath?: string): string | null
```

Get the currently selected cluster name.

If more than one cluster is selected it will return:
 - On details pages: the cluster of the currently viewed resource
 - On any other page: one of the selected clusters

To get all currently selected clusters please use getSelectedClusters

## Parameters

| Parameter | Type |
| ------ | ------ |
| `urlPath`? | `string` |

## Returns

`string` \| `null`

The current cluster name, or null if not in a cluster context.

## Defined in

[src/lib/cluster.ts:46](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/cluster.ts#L46)
