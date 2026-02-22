# Function: put()

```ts
function put(
   url: string, 
   json: Partial<KubeObjectInterface>, 
   autoLogoutOnAuthError: boolean, 
requestOptions: ClusterRequestParams): Promise<any>
```

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `url` | `string` | `undefined` |
| `json` | `Partial`\<[`KubeObjectInterface`](../../../../KubeObject/interfaces/KubeObjectInterface.md)\> | `undefined` |
| `autoLogoutOnAuthError` | `boolean` | `true` |
| `requestOptions` | [`ClusterRequestParams`](../interfaces/ClusterRequestParams.md) | `{}` |

## Returns

`Promise`\<`any`\>

## Defined in

[src/lib/k8s/api/v1/clusterRequests.ts:295](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/clusterRequests.ts#L295)
