# Function: registerDetailsViewSection()

```ts
function registerDetailsViewSection(viewSection: DetailsViewSectionType): void
```

Append a component to the details view for a given resource.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `viewSection` | [`DetailsViewSectionType`](../type-aliases/DetailsViewSectionType.md) | The section to add on different view screens. |

## Returns

`void`

## Example

```tsx
import {
  registerDetailsViewSection,
  DetailsViewSectionProps
} from '@kinvolk/headlamp-plugin/lib';

registerDetailsViewSection(({ resource }: DetailsViewSectionProps) => {
  if (resource.kind === 'Pod') {
    return (
      <SectionBox title="A very fine section title">
        The body of our Section for {resource.kind}
      </SectionBox>
    );
  }
  return null;
});
```

## Defined in

[src/plugin/registry.tsx:575](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/plugin/registry.tsx#L575)
