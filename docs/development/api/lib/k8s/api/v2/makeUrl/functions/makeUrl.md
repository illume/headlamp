# Function: makeUrl()

```ts
function makeUrl(urlParts: string | any[], query: Record<string, any>): string
```

Formats URL path

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `urlParts` | `string` \| `any`[] | parts of the path, will be separated by / |
| `query` | `Record`\<`string`, `any`\> | query parameters object |

## Returns

`string`

Formatted URL path

## Example

```ts
makeUrl(["my", "path", 5], { name: "hello" })
// returns "/my/path/5?name=hello"
```

## Defined in

[src/lib/k8s/api/v2/makeUrl.ts:31](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v2/makeUrl.ts#L31)
