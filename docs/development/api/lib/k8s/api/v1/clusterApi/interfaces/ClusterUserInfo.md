# Interface: ClusterUserInfo

User info returned from SelfSubjectReview or derived from cluster config

## Properties

### extra?

```ts
optional extra: Record<string, string[]>;
```

Extra info about the user

#### Defined in

[src/lib/k8s/api/v1/clusterApi.ts:56](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/clusterApi.ts#L56)

***

### groups?

```ts
optional groups: string[];
```

Groups the user belongs to

#### Defined in

[src/lib/k8s/api/v1/clusterApi.ts:54](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/clusterApi.ts#L54)

***

### uid?

```ts
optional uid: string;
```

UID of the authenticated user

#### Defined in

[src/lib/k8s/api/v1/clusterApi.ts:52](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/clusterApi.ts#L52)

***

### username?

```ts
optional username: string;
```

Username of the authenticated user

#### Defined in

[src/lib/k8s/api/v1/clusterApi.ts:50](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/clusterApi.ts#L50)
