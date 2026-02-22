# Function: useWebsocketMultiplexerEnabled()

```ts
function useWebsocketMultiplexerEnabled(): boolean
```

React hook that returns whether the WebSocket multiplexer is enabled.
Checks build-time environment variable first (for backwards compatibility and testing),
then falls back to runtime configuration from backend.

This must be a hook to avoid violating Rules of Hooks when used in conditional hook calls.
The value is stable for the component lifecycle after config loads.

## Returns

`boolean`

true if the WebSocket multiplexer is enabled.

## Defined in

[src/lib/k8s/api/v2/useKubeObjectList.ts:46](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v2/useKubeObjectList.ts#L46)
