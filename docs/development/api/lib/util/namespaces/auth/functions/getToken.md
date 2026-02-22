# Function: getToken()

```ts
function getToken(cluster: string): undefined | string
```

Retrieves the authentication token for a given cluster.
If a custom getToken method is defined in the Redux store, it will be used.
Otherwise, the token is retrieved from local storage.

Important! This will only work if plugins have overriden getToken function!
By default tokens are stored in httpOnly cookies and not available from JS

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `cluster` | `string` | The name of the cluster. |

## Returns

`undefined` \| `string`

The authentication token for the specified cluster, or undefined if not set.

## Defined in

[src/lib/auth.ts:37](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/auth.ts#L37)
