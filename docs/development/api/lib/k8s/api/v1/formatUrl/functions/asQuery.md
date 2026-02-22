# Function: asQuery()

```ts
function asQuery(queryParams?: QueryParameters): string
```

Converts k8s queryParams to a URL query string.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `queryParams`? | [`QueryParameters`](../../queryParameters/interfaces/QueryParameters.md) | The k8s API query parameters to convert. |

## Returns

`string`

The query string (starting with '?'), or empty string.

## Defined in

[src/lib/k8s/api/v1/formatUrl.ts:51](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/formatUrl.ts#L51)
