# Interface: KubeEvent

## Indexable

 \[`otherProps`: `string`\]: `any`

## Properties

### involvedObject

```ts
involvedObject: object;
```

#### apiVersion

```ts
apiVersion: string;
```

#### fieldPath

```ts
fieldPath: string;
```

#### kind

```ts
kind: string;
```

#### name

```ts
name: string;
```

#### namespace

```ts
namespace: string;
```

#### resourceVersion

```ts
resourceVersion: string;
```

#### uid

```ts
uid: string;
```

#### Defined in

[src/lib/k8s/event.ts:32](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/event.ts#L32)

***

### message

```ts
message: string;
```

#### Defined in

[src/lib/k8s/event.ts:30](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/event.ts#L30)

***

### metadata

```ts
metadata: KubeMetadata;
```

#### Defined in

[src/lib/k8s/event.ts:31](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/event.ts#L31)

***

### reason

```ts
reason: string;
```

#### Defined in

[src/lib/k8s/event.ts:29](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/event.ts#L29)

***

### type

```ts
type: string;
```

#### Defined in

[src/lib/k8s/event.ts:28](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/event.ts#L28)
