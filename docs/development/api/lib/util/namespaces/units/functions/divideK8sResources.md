# Function: divideK8sResources()

```ts
function divideK8sResources(
   a: string, 
   b: string, 
   resourceType: "cpu" | "memory"): number
```

Divides two Kubernetes resource quantities.
Useful for computing resource field references with divisors.

## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `a` | `string` | `undefined` | The dividend resource string (e.g., "1Gi", "500m") |
| `b` | `string` | `undefined` | The divisor resource string (e.g., "1Mi", "1") |
| `resourceType` | `"cpu"` \| `"memory"` | `'memory'` | The type of resource ('cpu' or 'memory'). Defaults to 'memory'. |

## Returns

`number`

The result of dividing a by b

## Defined in

[src/lib/units.ts:105](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/units.ts#L105)
