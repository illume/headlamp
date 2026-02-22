# Interface: EditResourceEvent

Event fired when editing a resource.

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
status: OPENED | CLOSED;
```

What exactly this event represents. 'OPEN' when the edit dialog is opened. 'CLOSED' when it
is closed.

#### Defined in

[src/redux/headlampEventSlice.ts:132](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/headlampEventSlice.ts#L132)

***

### type

```ts
type: EDIT_RESOURCE;
```

#### Defined in

[src/redux/headlampEventSlice.ts:131](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/headlampEventSlice.ts#L131)
