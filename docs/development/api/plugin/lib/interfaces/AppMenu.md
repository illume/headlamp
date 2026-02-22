# Interface: AppMenu

The members of AppMenu should be the same as the options for the MenuItem in https://www.electronjs.org/docs/latest/api/menu-item
except for the "submenu" (which is the AppMenu type) and "click" (which is not supported here, use the
"url" field instead).

## Indexable

 \[`key`: `string`\]: `any`

## Properties

### submenu?

```ts
optional submenu: AppMenu[];
```

The submenus of this menu

#### Defined in

[src/plugin/lib.ts:92](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/plugin/lib.ts#L92)

***

### url?

```ts
optional url: string;
```

A URL to open (if not starting with http, then it'll be opened in the external browser)

#### Defined in

[src/plugin/lib.ts:90](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/plugin/lib.ts#L90)
