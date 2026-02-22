# Function: apiDiscovery()

```ts
function apiDiscovery(clusters: string[]): Promise<ApiResource[]>
```

Discovers available API resources from Kubernetes clusters.
- Only resources that support the 'list' verb are included in the results

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `clusters` | `string`[] | An array of cluster names to discover API resources from |

## Returns

`Promise`\<[`ApiResource`](../../ApiResource/interfaces/ApiResource.md)[]\>

list of API resources

## Defined in

[src/lib/k8s/api/v2/apiDiscovery.tsx:133](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v2/apiDiscovery.tsx#L133)
