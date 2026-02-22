# Interface: LogsEvent

Event fired when viewing pod logs.

## Properties

### data

```ts
data: object;
```

#### resource?

```ts
optional resource: KubeObject<any>;
```

The resource for which the terminal was opened (currently this only happens for Pod instances).

#### status

```ts
status: OPENED | CLOSED;
```

What exactly this event represents. 'OPEN' when the logs dialog is opened. 'CLOSED' when it
is closed.

#### Defined in

[src/redux/headlampEventSlice.ts:204](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/headlampEventSlice.ts#L204)

***

### type

```ts
type: LOGS;
```

#### Defined in

[src/redux/headlampEventSlice.ts:203](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/headlampEventSlice.ts#L203)
