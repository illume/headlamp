# Function: getVersion()

```ts
function getVersion(clusterName: string): Promise<StringDict>
```

Gets the version of the cluster given by the parameter.

## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `clusterName` | `string` | `''` | the name of the cluster to query, or the currently selected cluster. |

## Returns

`Promise`\<[`StringDict`](../cluster/interfaces/StringDict.md)\>

a promise that resolves to a dictionary containing version info.

## Defined in

[src/lib/k8s/index.ts:186](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/index.ts#L186)
