# Function: useClustersVersion()

```ts
function useClustersVersion(clusters: Cluster[]): [object, object]
```

Hook to get the version of the clusters given by the parameter.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `clusters` | [`Cluster`](../cluster/interfaces/Cluster.md)[] |  |

## Returns

[`object`, `object`]

a map with cluster -> version-info, and a map with cluster -> error.

## Defined in

[src/lib/k8s/index.ts:350](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/index.ts#L350)
