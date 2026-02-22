# Function: clusterRequest()

```ts
function clusterRequest(
   path: string, 
   params: ClusterRequestParams, 
queryParams?: QueryParameters): Promise<any>
```

Sends a request to the backend. If the cluster is required in the params parameter, it will
be used as a request to the respective Kubernetes server.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `path` | `string` | The path to the API endpoint. |
| `params` | [`ClusterRequestParams`](../interfaces/ClusterRequestParams.md) | Optional parameters for the request. |
| `queryParams`? | [`QueryParameters`](../../queryParameters/interfaces/QueryParameters.md) | Optional query parameters for the k8s request. |

## Returns

`Promise`\<`any`\>

A Promise that resolves to the JSON response from the API server.

## Throws

An ApiError if the response status is not ok.

## Defined in

[src/lib/k8s/api/v1/clusterRequests.ts:122](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/clusterRequests.ts#L122)
