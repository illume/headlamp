# Interface: GatewayListener

Listener embodies the concept of a logical endpoint where a Gateway accepts network connections.

## See

[https://gateway-api.sigs.k8s.io/reference/spec/#gateway.networking.k8s.io/v1.Listener](https://gateway-api.sigs.k8s.io/reference/spec/#gateway.networking.k8s.io/v1.Listener) Gateway API reference for Listener

## Indexable

 \[`key`: `string`\]: `any`

## Properties

### hostname

```ts
hostname: string;
```

#### Defined in

[src/lib/k8s/gateway.ts:40](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/gateway.ts#L40)

***

### name

```ts
name: string;
```

#### Defined in

[src/lib/k8s/gateway.ts:41](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/gateway.ts#L41)

***

### port

```ts
port: number;
```

#### Defined in

[src/lib/k8s/gateway.ts:43](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/gateway.ts#L43)

***

### protocol

```ts
protocol: string;
```

#### Defined in

[src/lib/k8s/gateway.ts:42](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/gateway.ts#L42)
