# Interface: PodAttachEvent

Event fired when attaching to a pod.

## Properties

### data

```ts
data: object;
```

#### resource?

```ts
optional resource: Pod;
```

The resource for which the terminal was opened (currently this only happens for Pod instances).

#### status

```ts
status: OPENED | CLOSED;
```

What exactly this event represents. 'OPEN' when the attach dialog is opened. 'CLOSED' when it
is closed.

#### Defined in

[src/redux/headlampEventSlice.ts:237](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/headlampEventSlice.ts#L237)

***

### type

```ts
type: POD_ATTACH;
```

#### Defined in

[src/redux/headlampEventSlice.ts:236](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/headlampEventSlice.ts#L236)
