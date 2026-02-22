# Interface: ContainerState

## Properties

### running

```ts
running: object;
```

#### startedAt

```ts
startedAt: string;
```

#### Defined in

[src/lib/k8s/cluster.ts:544](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/cluster.ts#L544)

***

### terminated

```ts
terminated: object;
```

#### containerID

```ts
containerID: string;
```

#### exitCode

```ts
exitCode: number;
```

#### finishedAt

```ts
finishedAt: string;
```

#### message?

```ts
optional message: string;
```

#### reason

```ts
reason: string;
```

#### signal?

```ts
optional signal: number;
```

#### startedAt

```ts
startedAt: string;
```

#### Defined in

[src/lib/k8s/cluster.ts:547](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/cluster.ts#L547)

***

### waiting

```ts
waiting: object;
```

#### message?

```ts
optional message: string;
```

#### reason

```ts
reason: string;
```

#### Defined in

[src/lib/k8s/cluster.ts:556](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/cluster.ts#L556)
