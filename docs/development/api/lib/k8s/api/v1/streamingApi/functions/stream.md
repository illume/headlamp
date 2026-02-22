# Function: stream()

```ts
function stream<T>(
   url: string, 
   cb: StreamResultsCb<T>, 
   args: StreamArgs): object
```

Establishes a WebSocket connection to the specified URL and streams the results
to the provided callback function.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `url` | `string` | The URL to connect to. |
| `cb` | [`StreamResultsCb`](../type-aliases/StreamResultsCb.md)\<`T`\> | The callback function to receive the streamed results. |
| `args` | [`StreamArgs`](../interfaces/StreamArgs.md) | Additional arguments to configure the stream. |

## Returns

`object`

An object with two functions: `cancel`, which can be called to cancel
the stream, and `getSocket`, which returns the WebSocket object.

### cancel()

```ts
cancel: () => void;
```

#### Returns

`void`

### getSocket()

```ts
getSocket: () => null | WebSocket;
```

#### Returns

`null` \| `WebSocket`

## Defined in

[src/lib/k8s/api/v1/streamingApi.ts:299](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/streamingApi.ts#L299)
