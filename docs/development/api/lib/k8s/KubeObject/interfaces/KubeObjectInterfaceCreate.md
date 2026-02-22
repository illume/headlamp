# Interface: KubeObjectInterfaceCreate

KubeObjectInterfaceCreate is a version of KubeObjectInterface for creating objects
where uid, creationTimestamp, etc. are optional

## Extends

- `Omit`\<[`KubeObjectInterface`](KubeObjectInterface.md), `"metadata"`\>

## Properties

### metadata

```ts
metadata: KubeMetadataCreate;
```

#### Defined in

[src/lib/k8s/KubeObject.ts:739](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/KubeObject.ts#L739)
