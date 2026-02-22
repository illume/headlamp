# Interface: HTTPRouteRule

HTTPRouteRule defines semantics for matching an HTTP request based on conditions (matches), processing it (filters), and forwarding the request to an API object (backendRefs).

## See

 - [https://gateway-api.sigs.k8s.io/reference/spec/#gateway.networking.k8s.io/v1.HTTPRouteRule](https://gateway-api.sigs.k8s.io/reference/spec/#gateway.networking.k8s.io/v1.HTTPRouteRule) Gateway API reference for HTTPRouteRule
 - [https://gateway-api.sigs.k8s.io/api-types/httproute/#rules](https://gateway-api.sigs.k8s.io/api-types/httproute/#rules) Gateway API definition for HTTPRouteRule

## Indexable

 \[`key`: `string`\]: `any`

## Properties

### backendRefs?

```ts
optional backendRefs: any[];
```

#### Defined in

[src/lib/k8s/httpRoute.ts:30](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/httpRoute.ts#L30)

***

### matches?

```ts
optional matches: any[];
```

#### Defined in

[src/lib/k8s/httpRoute.ts:31](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/httpRoute.ts#L31)

***

### name?

```ts
optional name: string;
```

#### Defined in

[src/lib/k8s/httpRoute.ts:29](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/httpRoute.ts#L29)
