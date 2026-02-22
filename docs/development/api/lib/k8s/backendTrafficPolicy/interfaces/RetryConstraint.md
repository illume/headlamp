# Interface: RetryConstraint

RetryConstraint dynamically constrains client‑side retries using a
percentage‑based budget and a safety‑net minimum rate.

## Properties

### budget?

```ts
optional budget: BudgetDetails;
```

#### Defined in

[src/lib/k8s/backendTrafficPolicy.ts:58](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/backendTrafficPolicy.ts#L58)

***

### minRetryRate?

```ts
optional minRetryRate: RequestRate;
```

#### Defined in

[src/lib/k8s/backendTrafficPolicy.ts:59](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/backendTrafficPolicy.ts#L59)
