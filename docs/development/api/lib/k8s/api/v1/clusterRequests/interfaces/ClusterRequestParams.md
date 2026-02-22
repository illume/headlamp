# Interface: ClusterRequestParams

The options for `clusterRequest`.

## Extends

- [`RequestParams`](RequestParams.md)

## Properties

### autoLogoutOnAuthError?

```ts
optional autoLogoutOnAuthError: boolean;
```

Whether to automatically log out the user if there is an authentication error.

#### Overrides

[`RequestParams`](RequestParams.md).[`autoLogoutOnAuthError`](RequestParams.md#autologoutonautherror)

#### Defined in

[src/lib/k8s/api/v1/clusterRequests.ts:66](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/clusterRequests.ts#L66)

***

### cluster?

```ts
optional cluster: null | string;
```

Cluster context name.

#### Overrides

[`RequestParams`](RequestParams.md).[`cluster`](RequestParams.md#cluster)

#### Defined in

[src/lib/k8s/api/v1/clusterRequests.ts:65](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/clusterRequests.ts#L65)

***

### isJSON?

```ts
optional isJSON: boolean;
```

Is the request expected to receive JSON data?

#### Inherited from

[`RequestParams`](RequestParams.md).[`isJSON`](RequestParams.md#isjson)

#### Defined in

[src/lib/k8s/api/v1/clusterRequests.ts:41](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/clusterRequests.ts#L41)

***

### timeout?

```ts
optional timeout: number;
```

Number of milliseconds to wait for a response.

#### Inherited from

[`RequestParams`](RequestParams.md).[`timeout`](RequestParams.md#timeout)

#### Defined in

[src/lib/k8s/api/v1/clusterRequests.ts:39](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/api/v1/clusterRequests.ts#L39)
