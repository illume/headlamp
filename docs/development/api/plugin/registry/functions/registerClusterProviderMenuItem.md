# Function: registerClusterProviderMenuItem()

```ts
function registerClusterProviderMenuItem(item: MenuItemComponent): void
```

Register a new cluster action menu item.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `item` | `MenuItemComponent` | The item to add to the cluster action menu. |

## Returns

`void`

## Example

```tsx
import { registerClusterProviderMenuItem } from '@kinvolk/headlamp-plugin/lib';
import { MenuItem, ListItemText } from '@mui/material';
registerClusterProviderMenuItem(({cluster, setOpenConfirmDialog, handleMenuClose}) => {
 const isMinikube =
  cluster.meta_data?.extensions?.context_info?.provider === 'minikube.sigs.k8s.io';
  if (!isElectron() !! !isMinikube) {
    return null;
  }
  return (
    <MenuItem
      onClick={() => {
       setOpenConfirmDialog('deleteMinikube');
       handleMenuClose();
      }}
    >
      <ListItemText>{t('translation|Delete')}</ListItemText>
    </MenuItem>
  );
)}
```

## Defined in

[src/plugin/registry.tsx:889](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/plugin/registry.tsx#L889)
