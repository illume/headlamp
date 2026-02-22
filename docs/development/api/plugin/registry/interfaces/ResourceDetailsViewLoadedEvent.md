# Interface: ResourceDetailsViewLoadedEvent

Event fired when a resource is loaded in the details view.

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

#### resource

```ts
resource: KubeObject<any>;
```

The resource that was loaded.

#### Defined in

[src/redux/headlampEventSlice.ts:301](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/headlampEventSlice.ts#L301)

***

### type

```ts
type: DETAILS_VIEW;
```

#### Defined in

[src/redux/headlampEventSlice.ts:300](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/headlampEventSlice.ts#L300)
