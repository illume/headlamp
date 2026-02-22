# Function: deleteCluster()

```ts
function deleteCluster(
   cluster: string, 
   removeKubeConfig?: boolean, 
   clusterID?: string, 
   kubeconfigOrigin?: string, 
originalName?: string): Promise<object>
```

deleteCluster sends call to backend remove a cluster from the config.

Note: Currently, the use for the optional clusterID is only for the clusterID for non-dynamic clusters.
It is not needed or used for dynamic clusters.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `cluster` | `string` |  |
| `removeKubeConfig`? | `boolean` | Whether to remove the kubeconfig file associated with the cluster |
| `clusterID`? | `string` |  |
| `kubeconfigOrigin`? | `string` | - |
| `originalName`? | `string` | - |

## Returns

`Promise`\<`object`\>

### clusters

```ts
clusters: ConfigState["clusters"];
```

## Defined in

[src/lib/k8s/api/v1/clusterApi.ts:165](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/clusterApi.ts#L165)
