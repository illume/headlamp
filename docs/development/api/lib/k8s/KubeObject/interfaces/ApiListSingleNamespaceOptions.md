# Interface: ApiListSingleNamespaceOptions

## Properties

### cluster?

```ts
optional cluster: string;
```

The cluster to get the object from. By default uses the current cluster being viewed.

#### Defined in

[src/lib/k8s/KubeObject.ts:761](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/KubeObject.ts#L761)

***

### namespace?

```ts
optional namespace: string;
```

The namespace to get the object from.

#### Defined in

[src/lib/k8s/KubeObject.ts:757](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/KubeObject.ts#L757)

***

### queryParams?

```ts
optional queryParams: QueryParameters;
```

The parameters to be passed to the API endpoint.

#### Defined in

[src/lib/k8s/KubeObject.ts:759](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/KubeObject.ts#L759)
