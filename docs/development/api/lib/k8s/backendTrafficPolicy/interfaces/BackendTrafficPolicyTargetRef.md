# Interface: BackendTrafficPolicyTargetRef

BackendTrafficPolicyTargetRef defines a backend object that the policy applies to
(Service, ServiceImport, or implementation‑specific backendRef).

## See

[https://gateway-api.sigs.k8s.io/api-types/backendtrafficpolicy](https://gateway-api.sigs.k8s.io/api-types/backendtrafficpolicy)

## Properties

### group

```ts
group: string;
```

#### Defined in

[src/lib/k8s/backendTrafficPolicy.ts:26](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/backendTrafficPolicy.ts#L26)

***

### kind

```ts
kind: string;
```

#### Defined in

[src/lib/k8s/backendTrafficPolicy.ts:27](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/backendTrafficPolicy.ts#L27)

***

### name

```ts
name: string;
```

#### Defined in

[src/lib/k8s/backendTrafficPolicy.ts:28](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/backendTrafficPolicy.ts#L28)

***

### sectionName?

```ts
optional sectionName: string;
```

#### Defined in

[src/lib/k8s/backendTrafficPolicy.ts:29](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/backendTrafficPolicy.ts#L29)
