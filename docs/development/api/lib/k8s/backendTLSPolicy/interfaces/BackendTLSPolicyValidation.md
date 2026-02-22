# Interface: BackendTLSPolicyValidation

BackendTLSPolicyValidation defines TLS validation settings such as trusted CA and SAN.

## See

[https://gateway-api.sigs.k8s.io/api-types/backendtlspolicy/#structure](https://gateway-api.sigs.k8s.io/api-types/backendtlspolicy/#structure)

## Properties

### caCertificateRefs

```ts
caCertificateRefs: object[];
```

#### Defined in

[src/lib/k8s/backendTLSPolicy.ts:37](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/backendTLSPolicy.ts#L37)

***

### hostname

```ts
hostname: string;
```

#### Defined in

[src/lib/k8s/backendTLSPolicy.ts:42](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/backendTLSPolicy.ts#L42)
