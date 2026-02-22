# Type Alias: Workload

```ts
type Workload: 
  | Pod
  | DaemonSet
  | ReplicaSet
  | StatefulSet
  | Job
  | CronJob
  | Deployment;
```

## Defined in

[src/lib/k8s/Workload.ts:25](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/Workload.ts#L25)
