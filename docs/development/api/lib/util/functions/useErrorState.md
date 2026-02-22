# Function: useErrorState()

```ts
function useErrorState(dependentSetter?: (...args: any) => void): readonly [null | ApiError, Dispatch<SetStateAction<null | ApiError>>]
```

## Parameters

| Parameter | Type |
| ------ | ------ |
| `dependentSetter`? | (...`args`: `any`) => `void` |

## Returns

readonly [`null` \| [`ApiError`](../../k8s/api/v2/ApiError/classes/ApiError.md), `Dispatch`\<`SetStateAction`\<`null` \| [`ApiError`](../../k8s/api/v2/ApiError/classes/ApiError.md)\>\>]

## Defined in

[src/lib/util.ts:196](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/util.ts#L196)
