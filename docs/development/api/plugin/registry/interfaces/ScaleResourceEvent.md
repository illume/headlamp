# Interface: ScaleResourceEvent

Event fired when scaling a resource.

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

What exactly this event represents. 'CONFIRMED' when the scaling is selected by the user.
For now only 'CONFIRMED' is sent.

#### Defined in

[src/redux/headlampEventSlice.ts:147](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/headlampEventSlice.ts#L147)

***

### type

```ts
type: SCALE_RESOURCE;
```

#### Defined in

[src/redux/headlampEventSlice.ts:146](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/headlampEventSlice.ts#L146)
