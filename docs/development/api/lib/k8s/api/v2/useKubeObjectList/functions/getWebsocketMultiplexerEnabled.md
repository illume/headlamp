# Function: getWebsocketMultiplexerEnabled()

```ts
function getWebsocketMultiplexerEnabled(): boolean
```

Non-hook version for use outside React components.

## Returns

`boolean`

true if the WebSocket multiplexer is enabled.
Checks build-time environment variable first (for backwards compatibility and testing),
then falls back to runtime configuration from backend.

## Defined in

[src/lib/k8s/api/v2/useKubeObjectList.ts:65](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v2/useKubeObjectList.ts#L65)
