# Function: getResourceMetrics()

```ts
function getResourceMetrics(
   item: Node, 
   metrics: KubeMetrics[], 
   resourceType: "cpu" | "memory"): any[]
```

## Parameters

| Parameter | Type |
| ------ | ------ |
| `item` | [`Node`](../../k8s/node/classes/Node.md) |
| `metrics` | [`KubeMetrics`](../../k8s/cluster/interfaces/KubeMetrics.md)[] |
| `resourceType` | `"cpu"` \| `"memory"` |

## Returns

`any`[]

## Defined in

[src/lib/util.ts:153](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/util.ts#L153)
