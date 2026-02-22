# Class: ApiError

Error with additional information about the request that casued it
Used for backend response error handling

## Extends

- `Error`

## Constructors

### new ApiError()

```ts
new ApiError(message: string, props?: object): ApiError
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `props`? | `object` |
| `props.cluster`? | `string` |
| `props.namespace`? | `string` |
| `props.status`? | `number` |

#### Returns

[`ApiError`](ApiError.md)

#### Overrides

`Error.constructor`

#### Defined in

[src/lib/k8s/api/v2/ApiError.tsx:29](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v2/ApiError.tsx#L29)

## Properties

| Property | Modifier | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| `cluster?` | `public` | `string` | Cluster name | - | [src/lib/k8s/api/v2/ApiError.tsx:27](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v2/ApiError.tsx#L27) |
| `message` | `public` | `string` | - | `Error.message` | [src/lib/k8s/api/v2/ApiError.tsx:30](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v2/ApiError.tsx#L30) |
| `namespace?` | `public` | `string` | Namespace of the requested resource | - | [src/lib/k8s/api/v2/ApiError.tsx:25](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v2/ApiError.tsx#L25) |
| `status?` | `public` | `number` | HTTP status code of the error | - | [src/lib/k8s/api/v2/ApiError.tsx:23](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v2/ApiError.tsx#L23) |
