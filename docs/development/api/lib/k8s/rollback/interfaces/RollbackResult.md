# Interface: RollbackResult

Result of a rollback operation on a workload resource.

## See

[kubectl rollback implementation](https://github.com/kubernetes/kubectl/blob/master/pkg/polymorphichelpers/rollback.go)

## Properties

### message

```ts
message: string;
```

#### Defined in

[src/lib/k8s/rollback.ts:24](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/rollback.ts#L24)

***

### previousRevision?

```ts
optional previousRevision: number;
```

#### Defined in

[src/lib/k8s/rollback.ts:25](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/rollback.ts#L25)

***

### success

```ts
success: boolean;
```

#### Defined in

[src/lib/k8s/rollback.ts:23](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/rollback.ts#L23)
