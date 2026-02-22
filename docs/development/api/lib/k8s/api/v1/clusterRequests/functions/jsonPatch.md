# Function: jsonPatch()

```ts
function jsonPatch(
   url: string, 
   operations: object[], 
   autoLogoutOnAuthError: boolean, 
options: ClusterRequestParams): Promise<any>
```

Performs a JSON Patch (RFC 6902) request.
This is different from the merge patch above - it uses 'application/json-patch+json'
content type and expects an array of patch operations.

## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `url` | `string` | `undefined` | The URL to patch. |
| `operations` | `object`[] | `undefined` | Array of JSON Patch operations (e.g., [{op: 'replace', path: '/spec/template', value: {...}}]). |
| `autoLogoutOnAuthError` | `boolean` | `true` | Whether to automatically log out on auth errors. |
| `options` | [`ClusterRequestParams`](../interfaces/ClusterRequestParams.md) | `{}` | Additional request options. |

## Returns

`Promise`\<`any`\>

A Promise that resolves to the patched resource.

## Defined in

[src/lib/k8s/api/v1/clusterRequests.ts:275](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/clusterRequests.ts#L275)
