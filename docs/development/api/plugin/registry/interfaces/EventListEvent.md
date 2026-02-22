# Interface: EventListEvent

Event fired when kubernetes events are loaded (for a resource or not).

## Properties

### data

```ts
data: object;
```

#### events

```ts
events: Event[];
```

The list of events that were loaded.

#### resource?

```ts
optional resource: KubeObject<any>;
```

The resource for which the events were loaded.

#### Defined in

[src/redux/headlampEventSlice.ts:329](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/headlampEventSlice.ts#L329)

***

### type

```ts
type: OBJECT_EVENTS;
```

#### Defined in

[src/redux/headlampEventSlice.ts:328](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/headlampEventSlice.ts#L328)
