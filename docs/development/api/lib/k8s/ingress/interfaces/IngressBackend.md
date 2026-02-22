# Interface: IngressBackend

## Properties

### resource?

```ts
optional resource: object;
```

#### apiVersion

```ts
apiVersion: string;
```

#### kind

```ts
kind: string;
```

#### name

```ts
name: string;
```

#### Defined in

[src/lib/k8s/ingress.ts:54](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/ingress.ts#L54)

***

### service?

```ts
optional service: object;
```

#### name

```ts
name: string;
```

#### port

```ts
port: object;
```

#### port.name?

```ts
optional name: string;
```

#### port.number?

```ts
optional number: number;
```

#### Defined in

[src/lib/k8s/ingress.ts:47](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/ingress.ts#L47)
