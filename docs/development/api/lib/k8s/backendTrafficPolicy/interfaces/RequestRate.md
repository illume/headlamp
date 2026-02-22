# Interface: RequestRate

RequestRate expresses “X requests per Y time‑interval”.

## Properties

### count?

```ts
optional count: number;
```

Number of requests allowed within the interval.

#### Defined in

[src/lib/k8s/backendTrafficPolicy.ts:48](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/backendTrafficPolicy.ts#L48)

***

### interval?

```ts
optional interval: string;
```

Duration string (e.g. "1s") that forms the divisor of the rate.

#### Defined in

[src/lib/k8s/backendTrafficPolicy.ts:50](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/backendTrafficPolicy.ts#L50)
