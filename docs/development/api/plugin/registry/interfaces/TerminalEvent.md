# Interface: TerminalEvent

Event fired when using the terminal.

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

What exactly this event represents. 'OPEN' when the terminal is opened. 'CLOSED' when it
is closed.

#### Defined in

[src/redux/headlampEventSlice.ts:222](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/headlampEventSlice.ts#L222)

***

### type

```ts
type: TERMINAL;
```

#### Defined in

[src/redux/headlampEventSlice.ts:221](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/headlampEventSlice.ts#L221)
