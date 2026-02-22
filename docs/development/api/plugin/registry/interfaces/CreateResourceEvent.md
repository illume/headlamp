# Interface: CreateResourceEvent

Event fired when creating a resource.

## Properties

### data

```ts
data: object;
```

#### status

```ts
status: CONFIRMED;
```

What exactly this event represents. 'CONFIRMED' when the user chooses to apply the new resource.
For now only 'CONFIRMED' is sent.

#### Defined in

[src/redux/headlampEventSlice.ts:252](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/headlampEventSlice.ts#L252)

***

### type

```ts
type: CREATE_RESOURCE;
```

#### Defined in

[src/redux/headlampEventSlice.ts:251](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/headlampEventSlice.ts#L251)
