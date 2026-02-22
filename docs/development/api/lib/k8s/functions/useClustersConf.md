# Function: useClustersConf()

```ts
function useClustersConf(): ConfigState["allClusters"]
```

Hook for getting or fetching the clusters configuration.
This gets the clusters from the redux store. The redux store is updated
when the user changes the configuration. The configuration is stored in
the local storage. When stateless clusters are present, it combines the
stateless clusters with the clusters from the redux store.

## Returns

`ConfigState`\[`"allClusters"`\]

the clusters configuration.

## Defined in

[src/lib/k8s/index.ts:115](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/index.ts#L115)
