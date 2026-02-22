# Function: filterGeneric()

```ts
function filterGeneric<T>(
   item: T, 
   search?: string, 
   matchCriteria?: string[]): boolean
```

Filters a generic item based on the filter state.

The item is considered to match if any of the matchCriteria (described as JSONPath)
matches the filter.search contents. Case matching is insensitive.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `T` *extends* `object` | `object` |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `item` | `T` | The item to filter. |
| `search`? | `string` | - |
| `matchCriteria`? | `string`[] | The JSONPath criteria to match. |

## Returns

`boolean`

## Defined in

[src/redux/filterSlice.ts:91](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/filterSlice.ts#L91)
