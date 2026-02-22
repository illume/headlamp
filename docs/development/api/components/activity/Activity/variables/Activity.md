# Variable: Activity

```ts
Activity: object;
```

## Type declaration

### close()

Closes activity

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |

#### Returns

`void`

### launch()

Launches new Activity

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `activity` | [`Activity`](../interfaces/Activity.md) |

#### Returns

`void`

### reset()

#### Returns

`void`

### update()

Update existing activity with a partial changes

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |
| `diff` | `Partial`\<[`Activity`](../interfaces/Activity.md)\> |

#### Returns

`void`

## Defined in

[src/components/activity/Activity.tsx:67](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/components/activity/Activity.tsx#L67)
