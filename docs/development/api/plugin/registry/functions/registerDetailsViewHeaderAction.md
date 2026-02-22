# Function: registerDetailsViewHeaderAction()

```ts
function registerDetailsViewHeaderAction(headerAction: HeaderActionType): void
```

Add a component into the details view header.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `headerAction` | `HeaderActionType` | The action (link) to put in the app bar. |

## Returns

`void`

## Example

```tsx
import { ActionButton } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { registerDetailsViewHeaderAction } from '@kinvolk/headlamp-plugin/lib';

function IconAction() {
  return (
    <ActionButton
     description="Launch"
     icon="mdi:comment-quote"
     onClick={() => console.log('Hello from IconAction!')}
   />
  )
}

registerDetailsViewHeaderAction(IconAction);
```

## Defined in

[src/plugin/registry.tsx:442](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/plugin/registry.tsx#L442)
