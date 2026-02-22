# Function: logout()

```ts
function logout(cluster: string): Promise<void>
```

Logs out the user by clearing the authentication token for the specified cluster.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `cluster` | `string` | The name of the cluster to log out from. |

## Returns

`Promise`\<`void`\>

## Throws

When logout request fails

## Defined in

[src/lib/auth.ts:131](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/auth.ts#L131)
