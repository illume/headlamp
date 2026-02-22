# Function: post()

```ts
function post(
   url: string, 
   json: object | JSON | KubeObjectInterface, 
   autoLogoutOnAuthError: boolean, 
options: ClusterRequestParams): Promise<any>
```

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `url` | `string` | `undefined` |
| `json` | `object` \| `JSON` \| [`KubeObjectInterface`](../../../../KubeObject/interfaces/KubeObjectInterface.md) | `undefined` |
| `autoLogoutOnAuthError` | `boolean` | `true` |
| `options` | [`ClusterRequestParams`](../interfaces/ClusterRequestParams.md) | `{}` |

## Returns

`Promise`\<`any`\>

## Defined in

[src/lib/k8s/api/v1/clusterRequests.ts:225](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/clusterRequests.ts#L225)
