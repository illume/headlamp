# Type Alias: WorkloadClass

```ts
type WorkloadClass: 
  | typeof Pod
  | typeof DaemonSet
  | typeof ReplicaSet
  | typeof StatefulSet
  | typeof Job
  | typeof CronJob
  | typeof Deployment;
```

## Defined in

[src/lib/k8s/Workload.ts:26](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/Workload.ts#L26)
