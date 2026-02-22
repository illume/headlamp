# Interface: HeadlampEvent\<EventType\>

Represents a Headlamp event. It can be one of the default events or a custom event.

## Extended by

- [`DeleteResourceEvent`](DeleteResourceEvent.md)
- [`RestartResourceEvent`](RestartResourceEvent.md)

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `EventType` | `HeadlampEventType` \| `string` |

## Properties

### data?

```ts
optional data: unknown;
```

#### Defined in

[src/redux/headlampEventSlice.ts:87](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/headlampEventSlice.ts#L87)

***

### type

```ts
type: EventType;
```

#### Defined in

[src/redux/headlampEventSlice.ts:86](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/headlampEventSlice.ts#L86)
