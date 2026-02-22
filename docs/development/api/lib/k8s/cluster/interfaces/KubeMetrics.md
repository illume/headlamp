# Interface: KubeMetrics

## Properties

### metadata

```ts
metadata: KubeMetadata;
```

#### Defined in

[src/lib/k8s/cluster.ts:530](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/cluster.ts#L530)

***

### status

```ts
status: object;
```

#### capacity

```ts
capacity: object;
```

#### capacity.cpu

```ts
cpu: string;
```

#### capacity.memory

```ts
memory: string;
```

#### Defined in

[src/lib/k8s/cluster.ts:535](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/cluster.ts#L535)

***

### usage

```ts
usage: object;
```

#### cpu

```ts
cpu: string;
```

#### memory

```ts
memory: string;
```

#### Defined in

[src/lib/k8s/cluster.ts:531](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/cluster.ts#L531)
