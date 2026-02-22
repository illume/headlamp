# Interface: KubeWebhookClientConfig

## Properties

### caBundle

```ts
caBundle: string;
```

#### Defined in

[src/lib/k8s/mutatingWebhookConfiguration.ts:30](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/mutatingWebhookConfiguration.ts#L30)

***

### service?

```ts
optional service: object;
```

#### name

```ts
name: string;
```

#### namespace

```ts
namespace: string;
```

#### path?

```ts
optional path: string;
```

#### port?

```ts
optional port: number;
```

#### Defined in

[src/lib/k8s/mutatingWebhookConfiguration.ts:32](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/mutatingWebhookConfiguration.ts#L32)

***

### url?

```ts
optional url: string;
```

#### Defined in

[src/lib/k8s/mutatingWebhookConfiguration.ts:31](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/mutatingWebhookConfiguration.ts#L31)
