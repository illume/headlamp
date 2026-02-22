# Function: registerClusterChooser()

```ts
function registerClusterChooser(chooser: ClusterChooserType): void
```

Use a custom cluster chooser button

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `chooser` | [`ClusterChooserType`](../type-aliases/ClusterChooserType.md) | is a React Component that takes one required props `clickHandler` which is the action handler that happens when the custom chooser button component click event occurs |

## Returns

`void`

## Example

```tsx
import { ClusterChooserProps, registerClusterChooser } from '@kinvolk/headlamp-plugin/lib';

registerClusterChooser(({ clickHandler, cluster }: ClusterChooserProps) => {
  return <button onClick={clickHandler}>my chooser Current cluster: {cluster}</button>;
})
```

## See

[Cluster Chooser example](http://github.com/kinvolk/headlamp/plugins/examples/cluster-chooser/)

## Defined in

[src/plugin/registry.tsx:664](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/plugin/registry.tsx#L664)
