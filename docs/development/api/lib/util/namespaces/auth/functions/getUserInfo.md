# Function: getUserInfo()

```ts
function getUserInfo(cluster: string): any
```

Retrieves the user information encoded in the authentication token for a given cluster.

Important! This will only work if plugins have overriden getToken function!
By default tokens are stored in httpOnly cookies and not available from JS

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `cluster` | `string` | The name of the cluster. |

## Returns

`any`

The decoded user information from the token's payload.

## Defined in

[src/lib/auth.ts:52](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/auth.ts#L52)
