# Function: hasToken()

```ts
function hasToken(cluster: string): boolean
```

Checks whether an authentication token exists for the given cluster.

Important! This will only work if plugins have overriden getToken function!
By default tokens are stored in httpOnly cookies and not available from JS

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `cluster` | `string` | The name of the cluster. |

## Returns

`boolean`

True if a token exists, false otherwise.

## Defined in

[src/lib/auth.ts:68](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/auth.ts#L68)
