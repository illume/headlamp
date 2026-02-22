# Function: getKubeObjectCategory()

```ts
function getKubeObjectCategory(resource: KubeObject<any>): ResourceCategory
```

Get category of the given kubernetes object

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `resource` | [`KubeObject`](../../KubeObject/classes/KubeObject.md)\<`any`\> | Kubernetes object |

## Returns

[`ResourceCategory`](../interfaces/ResourceCategory.md)

resource category

## Defined in

[src/lib/k8s/ResourceCategory.tsx:98](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/ResourceCategory.tsx#L98)
