# Function: clusterFetch()

```ts
function clusterFetch(url: string | URL, init: RequestInit & object): Promise<Response>
```

A wrapper around Fetch function
Allows sending requests to a particular cluster

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `url` | `string` \| `URL` | URL path |
| `init` | `RequestInit` & `object` | same as second parameter of the Fetch function |

## Returns

`Promise`\<`Response`\>

fetch Response

## Defined in

[src/lib/k8s/api/v2/fetch.ts:75](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v2/fetch.ts#L75)
