# Function: registerOverviewChartsProcessor()

```ts
function registerOverviewChartsProcessor(processor: OverviewChartsProcessor): void
```

Add a processor for the overview charts section. Allowing the addition or modification of charts.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `processor` | [`OverviewChartsProcessor`](../interfaces/OverviewChartsProcessor.md) | The processor to add. Returns the new charts to be displayed. |

## Returns

`void`

## Example

```tsx
import { registerOverviewChartsProcessor } from '@kinvolk/headlamp-plugin/lib';

registerOverviewChartsProcessor(function addFailedPodsChart(charts) {
  return [
    ...charts,
    {
      id: 'failed-pods',
      component: () => <FailedPodsChart />
    }
  ];
});
```

## Defined in

[src/plugin/registry.tsx:799](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/plugin/registry.tsx#L799)
