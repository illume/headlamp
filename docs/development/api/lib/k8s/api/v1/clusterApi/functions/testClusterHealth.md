# Function: testClusterHealth()

```ts
function testClusterHealth(cluster?: string): Promise<any[]>
```

Checks cluster health
Will throw an error if the cluster is not healthy.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `cluster`? | `string` |

## Returns

`Promise`\<`any`[]\>

## Defined in

[src/lib/k8s/api/v1/clusterApi.ts:108](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/clusterApi.ts#L108)
