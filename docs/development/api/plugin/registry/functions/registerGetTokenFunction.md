# Function: registerGetTokenFunction()

```ts
function registerGetTokenFunction(override: (cluster: string) => undefined | string): void
```

Override headlamp getToken method

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `override` | (`cluster`: `string`) => `undefined` \| `string` | The getToken override method to use. |

## Returns

`void`

## Example

```ts
registerGetTokenFunction(() => {
// set token logic here
});
```

## Defined in

[src/plugin/registry.tsx:698](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/plugin/registry.tsx#L698)
