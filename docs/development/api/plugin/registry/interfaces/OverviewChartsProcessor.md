# Interface: OverviewChartsProcessor

## Properties

### id?

```ts
optional id: string;
```

#### Defined in

[src/redux/overviewChartsSlice.ts:26](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/overviewChartsSlice.ts#L26)

***

### processor()

```ts
processor: (charts: OverviewChart[]) => OverviewChart[];
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `charts` | `OverviewChart`[] |

#### Returns

`OverviewChart`[]

#### Defined in

[src/redux/overviewChartsSlice.ts:27](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/overviewChartsSlice.ts#L27)
