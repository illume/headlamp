# Function: setToken()

```ts
function setToken(cluster: string, token: null | string): Promise<void> | Promise<boolean>
```

Sets or updates the token for a given cluster using cookie-based storage.
The token is stored securely in an HttpOnly cookie on the backend.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `cluster` | `string` | The name of the cluster. |
| `token` | `null` \| `string` | The authentication token to set. Pass null to clear the token. |

## Returns

`Promise`\<`void`\> \| `Promise`\<`boolean`\>

## Throws

When cluster name is invalid or backend request fails

## Defined in

[src/lib/auth.ts:108](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/auth.ts#L108)
