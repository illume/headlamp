# Function: useCluster()

```ts
function useCluster(): null | string
```

Get the currently selected cluster name.

If more than one cluster is selected it will return:
 - On details pages: the cluster of the currently viewed resource
 - On any other page: one of the selected clusters

To get all currently selected clusters please use [useSelectedClusters](useSelectedClusters.md)

## Returns

`null` \| `string`

currently selected cluster

## Defined in

[src/lib/k8s/index.ts:144](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/index.ts#L144)
