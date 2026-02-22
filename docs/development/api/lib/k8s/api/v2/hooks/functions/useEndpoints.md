# Function: useEndpoints()

```ts
function useEndpoints(
   endpoints: KubeObjectEndpoint[], 
   cluster: string, 
   namespace?: string): object
```

Checks and returns an endpoint that works from the list

## Parameters

| Parameter | Type |
| ------ | ------ |
| `endpoints` | [`KubeObjectEndpoint`](../../KubeObjectEndpoint/interfaces/KubeObjectEndpoint.md)[] |
| `cluster` | `string` |
| `namespace`? | `string` |

## Returns

`object`

### endpoint

```ts
endpoint: undefined | KubeObjectEndpoint;
```

### error

```ts
error: null | ApiError;
```

## Params

endpoints - List of possible endpoints

## Defined in

[src/lib/k8s/api/v2/hooks.ts:246](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v2/hooks.ts#L246)
