# Interface: DeleteResourceEvent

Event fired when a resource is to be deleted.

## Extends

- [`HeadlampEvent`](HeadlampEvent.md)\<`HeadlampEventType.DELETE_RESOURCE`\>

## Properties

### data

```ts
data: object;
```

#### resource

```ts
resource: KubeObject<any>;
```

The resource for which the deletion was called.

#### status

```ts
status: CONFIRMED;
```

What exactly this event represents. 'CONFIRMED' when the user confirms the deletion of a resource.
For now only 'CONFIRMED' is sent.

#### Overrides

[`HeadlampEvent`](HeadlampEvent.md).[`data`](HeadlampEvent.md#data)

#### Defined in

[src/redux/headlampEventSlice.ts:103](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/headlampEventSlice.ts#L103)

***

### type

```ts
type: DELETE_RESOURCE;
```

#### Inherited from

[`HeadlampEvent`](HeadlampEvent.md).[`type`](HeadlampEvent.md#type)

#### Defined in

[src/redux/headlampEventSlice.ts:86](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/headlampEventSlice.ts#L86)
