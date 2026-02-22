# Function: streamResultsForCluster()

```ts
function streamResultsForCluster(
   url: string, 
   params: StreamResultsParams, 
queryParams?: QueryParameters): Promise<() => void>
```

## Parameters

| Parameter | Type |
| ------ | ------ |
| `url` | `string` |
| `params` | [`StreamResultsParams`](../interfaces/StreamResultsParams.md) |
| `queryParams`? | [`QueryParameters`](../../queryParameters/interfaces/QueryParameters.md) |

## Returns

`Promise`\<() => `void`\>

## Defined in

[src/lib/k8s/api/v1/streamingApi.ts:141](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/streamingApi.ts#L141)
