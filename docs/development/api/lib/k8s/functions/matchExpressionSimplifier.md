# Function: matchExpressionSimplifier()

```ts
function matchExpressionSimplifier(matchExpressions: undefined | object[]): string[] | ""
```

Simplifies a matchExpressions array into an array of string representations.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `matchExpressions` | `undefined` \| `object`[] | the matchExpressionss array from a LabelSelector. |

## Returns

`string`[] \| `""`

an array of simplified expression strings, or an empty string.

## Defined in

[src/lib/k8s/index.ts:273](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/index.ts#L273)
