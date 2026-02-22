# Function: makeListRequests()

```ts
function makeListRequests(
   clusters: string[], 
   getAllowedNamespaces: (cluster: null | string) => string[], 
   isResourceNamespaced: boolean, 
   requestedNamespaces: string[]): object[]
```

Creates multiple requests to list Kube objects
Handles multiple clusters, namespaces and allowed namespaces

## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `clusters` | `string`[] | `undefined` | list of clusters |
| `getAllowedNamespaces` | (`cluster`: `null` \| `string`) => `string`[] | `undefined` | function to get allowed namespaces for a cluster |
| `isResourceNamespaced` | `boolean` | `undefined` | if the resource is namespaced |
| `requestedNamespaces` | `string`[] | `[]` | requested namespaces(optional) |

## Returns

`object`[]

list of requests for clusters and appropriate namespaces

## Defined in

[src/lib/k8s/api/v2/useKubeObjectList.ts:414](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v2/useKubeObjectList.ts#L414)
