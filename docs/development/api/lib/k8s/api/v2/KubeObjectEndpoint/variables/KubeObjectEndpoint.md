# Variable: KubeObjectEndpoint

```ts
KubeObjectEndpoint: object;
```

## Type declaration

### toUrl()

```ts
toUrl: (endpoint: KubeObjectEndpoint, namespace?: string) => string;
```

Formats endpoints information into a URL path

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `endpoint` | [`KubeObjectEndpoint`](../interfaces/KubeObjectEndpoint.md) | Kubernetes resource endpoint definition |
| `namespace`? | `string` | Namespace, optional |

#### Returns

`string`

Formatted URL path

## Defined in

[src/lib/k8s/api/v2/KubeObjectEndpoint.ts:17](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v2/KubeObjectEndpoint.ts#L17)
