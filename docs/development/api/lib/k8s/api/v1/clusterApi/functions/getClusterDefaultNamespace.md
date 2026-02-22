# Function: getClusterDefaultNamespace()

```ts
function getClusterDefaultNamespace(cluster: string, checkSettings?: boolean): string
```

getClusterDefaultNamespace gives the default namespace for the given cluster.

If the checkSettings parameter is true (default), it will check the cluster settings first.
Otherwise it will just check the cluster config. This means that if one needs the default
namespace that may come from the kubeconfig, call this function with the checkSettings parameter as false.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `cluster` | `string` | The cluster name. |
| `checkSettings`? | `boolean` | Whether to check the settings for the default namespace (otherwise it just checks the cluster config). Defaults to true. |

## Returns

`string`

The default namespace for the given cluster.

## Defined in

[src/lib/k8s/api/v1/clusterApi.ts:221](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/clusterApi.ts#L221)
