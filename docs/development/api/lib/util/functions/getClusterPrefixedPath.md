# Function: getClusterPrefixedPath()

```ts
function getClusterPrefixedPath(path?: null | string): string
```

## Parameters

| Parameter | Type |
| ------ | ------ |
| `path`? | `null` \| `string` |

## Returns

`string`

A path prefixed with cluster path, and the given path.

The given path does not start with a /, it will be added.

## Defined in

[src/lib/cluster.ts:27](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/cluster.ts#L27)
