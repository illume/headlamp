# Interface: RevisionInfo

Represents a single revision in the history of a rollbackable resource.
Used by RevisionHistorySection and RollbackDialog to display revision details.

## Properties

### createdAt

```ts
createdAt: string;
```

When this revision was created

#### Defined in

[src/lib/k8s/rollback.ts:36](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/rollback.ts#L36)

***

### images

```ts
images: string[];
```

Container images in this revision's pod template

#### Defined in

[src/lib/k8s/rollback.ts:38](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/rollback.ts#L38)

***

### isCurrent

```ts
isCurrent: boolean;
```

Whether this is the current (active) revision

#### Defined in

[src/lib/k8s/rollback.ts:40](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/rollback.ts#L40)

***

### podTemplate?

```ts
optional podTemplate: object;
```

The raw pod template spec from this revision, for diffing

#### metadata?

```ts
optional metadata: object;
```

##### Index Signature

 \[`key`: `string`\]: `any`

#### spec?

```ts
optional spec: object;
```

##### Index Signature

 \[`key`: `string`\]: `any`

#### Defined in

[src/lib/k8s/rollback.ts:42](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/rollback.ts#L42)

***

### revision

```ts
revision: number;
```

Revision number

#### Defined in

[src/lib/k8s/rollback.ts:34](https://github.com/illume/headlamp/blob/97134a5757d74d8d8866df332283bb67229580c7/frontend/src/lib/k8s/rollback.ts#L34)
