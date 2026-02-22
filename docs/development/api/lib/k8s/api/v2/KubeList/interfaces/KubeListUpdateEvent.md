# Interface: KubeListUpdateEvent\<T\>

## Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* [`KubeObjectInterface`](../../../../KubeObject/interfaces/KubeObjectInterface.md) |

## Properties

### object

```ts
object: T;
```

#### Defined in

[src/lib/k8s/api/v2/KubeList.ts:31](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v2/KubeList.ts#L31)

***

### type

```ts
type: "ADDED" | "MODIFIED" | "DELETED" | "ERROR";
```

#### Defined in

[src/lib/k8s/api/v2/KubeList.ts:30](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v2/KubeList.ts#L30)
