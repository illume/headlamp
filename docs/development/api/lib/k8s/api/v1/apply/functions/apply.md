# Function: apply()

```ts
function apply<T>(body: T, clusterName?: string): Promise<T>
```

Applies the provided body to the Kubernetes API.

Tries to POST, and if there's a conflict it does a PUT to the api endpoint.

Overloads:
- When called with a KubeObjectInterfaceCreate body, the parameter type is the create type.
- Otherwise it accepts a full KubeObjectInterface.

## Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* [`KubeObjectInterfaceCreate`](../../../../KubeObject/interfaces/KubeObjectInterfaceCreate.md) |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `body` | `T` | The kubernetes object body to apply. |
| `clusterName`? | `string` | The cluster to apply the body to. By default uses the current cluster (URL defined). |

## Returns

`Promise`\<`T`\>

The response from the kubernetes API server.

## Defined in

[src/lib/k8s/api/v1/apply.ts:38](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/apply.ts#L38)
