# Function: testAuth()

```ts
function testAuth(cluster: string, namespace: string): Promise<any>
```

Test authentication for the given cluster.
Will throw an error if the user is not authenticated.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `cluster` | `string` | `''` |
| `namespace` | `string` | `'default'` |

## Returns

`Promise`\<`any`\>

## Defined in

[src/lib/k8s/api/v1/clusterApi.ts:35](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/clusterApi.ts#L35)
