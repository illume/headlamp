# Interface: ResourceListViewLoadedEvent

Event fired when a list view is loaded for a resource.

## Properties

### data

```ts
data: object;
```

#### error?

```ts
optional error: Error;
```

The error, if an error has occurred

#### resourceKind

```ts
resourceKind: string;
```

The kind of resource that was loaded.

#### resources

```ts
resources: KubeObject<any>[];
```

The list of resources that were loaded.

#### Defined in

[src/redux/headlampEventSlice.ts:314](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/headlampEventSlice.ts#L314)

***

### type

```ts
type: LIST_VIEW;
```

#### Defined in

[src/redux/headlampEventSlice.ts:313](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/headlampEventSlice.ts#L313)
