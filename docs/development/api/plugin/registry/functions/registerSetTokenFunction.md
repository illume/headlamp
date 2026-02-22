# Function: registerSetTokenFunction()

```ts
function registerSetTokenFunction(override: (cluster: string, token: null | string) => void): void
```

Override headlamp setToken method

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `override` | (`cluster`: `string`, `token`: `null` \| `string`) => `void` | The setToken override method to use. |

## Returns

`void`

## Example

```ts
registerSetTokenFunction((cluster: string, token: string | null) => {
// set token logic here
});
```

## Defined in

[src/plugin/registry.tsx:680](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/plugin/registry.tsx#L680)
