# Interface: ListResponse\<K\>

Object representing a List of Kube object
with information about which cluster and namespace it came from

## Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* [`KubeObject`](../../../../KubeObject/classes/KubeObject.md) |

## Properties

### cluster

```ts
cluster: string;
```

Cluster of the list

#### Defined in

[src/lib/k8s/api/v2/useKubeObjectList.ts:84](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v2/useKubeObjectList.ts#L84)

***

### list

```ts
list: KubeList<K>;
```

KubeList with items

#### Defined in

[src/lib/k8s/api/v2/useKubeObjectList.ts:82](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v2/useKubeObjectList.ts#L82)

***

### namespace?

```ts
optional namespace: string;
```

If the list only has items from one namespace

#### Defined in

[src/lib/k8s/api/v2/useKubeObjectList.ts:86](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v2/useKubeObjectList.ts#L86)
