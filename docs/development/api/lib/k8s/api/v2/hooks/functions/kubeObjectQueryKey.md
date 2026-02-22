# Function: kubeObjectQueryKey()

```ts
function kubeObjectQueryKey(__namedParameters: object): (
  | undefined
  | null
  | string
  | QueryParameters
  | KubeObjectEndpoint)[]
```

## Parameters

| Parameter | Type |
| ------ | ------ |
| `__namedParameters` | `object` |
| `__namedParameters.cluster` | `string` |
| `__namedParameters.endpoint`? | `null` \| [`KubeObjectEndpoint`](../../KubeObjectEndpoint/interfaces/KubeObjectEndpoint.md) |
| `__namedParameters.name` | `string` |
| `__namedParameters.namespace`? | `string` |
| `__namedParameters.queryParams`? | [`QueryParameters`](../../../v1/queryParameters/interfaces/QueryParameters.md) |

## Returns

(
  \| `undefined`
  \| `null`
  \| `string`
  \| [`QueryParameters`](../../../v1/queryParameters/interfaces/QueryParameters.md)
  \| [`KubeObjectEndpoint`](../../KubeObjectEndpoint/interfaces/KubeObjectEndpoint.md))[]

## Defined in

[src/lib/k8s/api/v2/hooks.ts:84](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v2/hooks.ts#L84)
