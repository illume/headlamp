# Function: makeCustomResourceClass()

## makeCustomResourceClass(args, isNamespaced)

```ts
function makeCustomResourceClass(args: [string, string, string][], isNamespaced: boolean): KubeObjectClass
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `args` | [`string`, `string`, `string`][] |
| `isNamespaced` | `boolean` |

### Returns

[`KubeObjectClass`](../../KubeObject/type-aliases/KubeObjectClass.md)

### Deprecated

Use the version of the function that receives an object as its argument.

### Defined in

[src/lib/k8s/crd.ts:153](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/crd.ts#L153)

## makeCustomResourceClass(args)

```ts
function makeCustomResourceClass(args: CRClassArgs): KubeObjectClass
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `args` | [`CRClassArgs`](../interfaces/CRClassArgs.md) |

### Returns

[`KubeObjectClass`](../../KubeObject/type-aliases/KubeObjectClass.md)

### Defined in

[src/lib/k8s/crd.ts:157](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/crd.ts#L157)
