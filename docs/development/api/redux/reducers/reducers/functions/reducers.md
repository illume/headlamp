# Function: reducers()

```ts
function reducers(state: undefined | object | Partial<object>, action: UnknownAction): object
```

## Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | `undefined` \| `object` \| `Partial`\<`object`\> |
| `action` | `UnknownAction` |

## Returns

`object`

### actionButtons

```ts
actionButtons: HeaderActionState;
```

### activity

```ts
activity: ActivityState = activityReducer;
```

### clusterAction

```ts
clusterAction: ClusterState;
```

### clusterProvider

```ts
clusterProvider: ClusterProviderSliceState = clusterProviderReducer;
```

### config

```ts
config: ConfigState = configReducer;
```

### detailsViewSection

```ts
detailsViewSection: DetailsViewSectionState = detailsViewSectionReducer;
```

### detailsViewSections

```ts
detailsViewSections: DetailsViewSectionState = detailsViewSectionReducer;
```

### drawerMode

```ts
drawerMode: DrawerModeState = drawerModeSlice;
```

### eventCallbackReducer

```ts
eventCallbackReducer: object;
```

### eventCallbackReducer.trackerFuncs

```ts
trackerFuncs: HeadlampEventCallback[];
```

### filter

```ts
filter: FilterState = filterReducer;
```

### graphView

```ts
graphView: GraphViewSliceState = graphViewReducer;
```

### notifications

```ts
notifications: NotificationsState = notificationsReducer;
```

### overviewCharts

```ts
overviewCharts: OverviewChartsState = overviewChartsReducer;
```

### pluginConfigs

```ts
pluginConfigs: PluginConfigState = pluginConfigReducer;
```

### plugins

```ts
plugins: PluginsState = pluginsReducer;
```

### projects

```ts
projects: ProjectsState = projectsReducer;
```

### resourceTable

```ts
resourceTable: ResourceTableState = resourceTableReducer;
```

### routes

```ts
routes: RoutesState = routesReducer;
```

### shortcuts

```ts
shortcuts: ShortcutsState = shortcutsReducer;
```

### sidebar

```ts
sidebar: SidebarState = sidebarReducer;
```

### theme

```ts
theme: ThemeState = themeReducer;
```

### ui

```ts
ui: UIState = uiReducer;
```

## Defined in

[src/redux/reducers/reducers.tsx:40](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/redux/reducers/reducers.tsx#L40)
