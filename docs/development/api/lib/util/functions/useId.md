# Function: useId()

```ts
function useId(prefix: string): undefined | string
```

Creates a unique ID, with the given prefix.
If UNDER_TEST is set to true, it will return the same ID every time, so snapshots do not get invalidated.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `prefix` | `string` | `''` |

## Returns

`undefined` \| `string`

## Defined in

[src/lib/util.ts:452](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/util.ts#L452)
