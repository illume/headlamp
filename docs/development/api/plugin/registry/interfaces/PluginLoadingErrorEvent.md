# Interface: PluginLoadingErrorEvent

Event fired when there is an error while loading a plugin.

## Properties

### data

```ts
data: object;
```

#### error

```ts
error: Error;
```

The error that occurred while loading the plugin.

#### pluginInfo

```ts
pluginInfo: object;
```

Information about the plugin.

#### pluginInfo.name

```ts
name: string;
```

The name of the plugin.

#### pluginInfo.version

```ts
version: string;
```

The version of the plugin.

#### Defined in

[src/redux/headlampEventSlice.ts:265](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/headlampEventSlice.ts#L265)

***

### type

```ts
type: PLUGIN_LOADING_ERROR;
```

#### Defined in

[src/redux/headlampEventSlice.ts:264](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/headlampEventSlice.ts#L264)
