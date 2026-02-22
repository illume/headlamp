# Function: backendFetch()

```ts
function backendFetch(url: string | URL, init: RequestInit): Promise<Response>
```

Simple wrapper around Fetch function
Sends a request to the backend

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `url` | `string` \| `URL` | URL path |
| `init` | `RequestInit` | options parameter for the Fetch function |

## Returns

`Promise`\<`Response`\>

fetch Response

## Defined in

[src/lib/k8s/api/v2/fetch.ts:38](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v2/fetch.ts#L38)
