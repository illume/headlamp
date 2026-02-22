# Function: matchLabelsSimplifier()

```ts
function matchLabelsSimplifier(matchLabels: undefined | object, isEqualSeperator: boolean): string[] | ""
```

Simplifies a matchLabels object into an array of string expressions.

## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `matchLabels` | `undefined` \| `object` | `undefined` | the matchLabels object from a LabelSelector. |
| `isEqualSeperator` | `boolean` | `false` | whether to use "=" as the separator instead of ":". |

## Returns

`string`[] \| `""`

an array of simplified label strings, or an empty string.

## Defined in

[src/lib/k8s/index.ts:247](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/index.ts#L247)
