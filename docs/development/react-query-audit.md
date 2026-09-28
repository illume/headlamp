# React Query Audit Report

> **Date:** 2026-06-13
> **Scope:** All `@tanstack/react-query` usage in `frontend/src/`
> **Method:** Every usage site below was re-read against the source on 2026-06-13; line numbers and code snippets were verified, not carried over from a previous pass.

---

## Executive Summary

`frontend/src/` has **15 React Query usage sites** (`useQuery`/`useQueries`, the `QueryClient` config + provider, and imperative `queryClient.*` / `useQueryClient().*` calls). The bulk of the app's React Query usage lives in the `lib/k8s/api/v2` data layer (`hooks.ts`, `useKubeObjectList.ts`), not in the app-shell components.

This revision **re-checked every claim** in the earlier draft. Two claims were overstated and are corrected below (the AdvancedSearch "infinite spinner" and the empty-cluster "extra network request"). Several items previously listed as numbered "bugs" are actually intentional or negligible; they are moved to **Non-issues & minor observations** so the genuine defects stand out.

**Genuine defects: 12** (7 correctness, 5 lower-impact). The recurring root causes are:

1. **Side effects inside `queryFn`** (Redux dispatch, snackbars, `onError`) instead of pure data fetching — Layout, VersionButton, AuthVisible.
2. **Missing / stale `cluster` in cache identity** — the WebSocket single-object update path, the `AuthVisible` key, and the `queryKey` memo deps. These are multi-cluster correctness bugs.
3. **Rules-of-Hooks and render-phase state updates** — `AuthVisible` calls `useQuery` after an early `return`; `AdvancedSearch` calls a state setter during render from query data.

The structural driver behind most of group (1) is described in **The Two-State-Store Problem**.

**Most of the React Query code is untested.** Of the **15 usage sites**, only **2 (13%)** have proper, isolated query-behavior tests (`RouteSwitcher.test.tsx`, `useKubeObjectList.test.tsx`); **9 (60%)** have **no test at all**, and the remaining **4** have only partial or indirect coverage (Storybook stories, or a test file that never exercises the query). Critically, **every one of the 12 genuine defects lives in code that no test would catch** — the partial `hooks.test.tsx` coverage misses both the WebSocket cluster-drop (#1) and the stale `queryKey` memo (#5), and the other 10 defects are in sites with zero tests. See the **Test Coverage Summary** for the per-site breakdown.

---

## All React Query Usage Sites

| # | File:line | Hook / Method | Query Key | Purpose |
|---|-----------|--------------|-----------|---------|
| 1 | `components/App/Layout.tsx:216` | `useQuery` | `['cluster-fetch']` | Poll backend for cluster config |
| 2 | `components/App/RouteSwitcher.tsx:170` | `useQuery` | `['auth', cluster]` | Check auth status for a cluster |
| 3 | `components/App/TopBar.tsx:299` | `useQueries` | `['clusterMe', clusterName]` | Fetch user info per cluster |
| 4 | `components/advancedSearch/AdvancedSearch.tsx:73` | `useQuery` | `['api-discovery', ...selectedClusters]` | Discover API resources for search |
| 5 | `components/resourceMap/sources/definitions/sources.tsx:140` | `useQuery` | `['api-discovery', ...selectedClusters]` | Discover API resources for resource map |
| 6 | `lib/queryClient.ts:19` + `App.tsx:68` | `new QueryClient()` / `QueryClientProvider` | N/A | Global singleton + provider |
| 7 | `lib/auth.ts:125,127,142,143` | `invalidateQueries` / `removeQueries` | `['clusterMe', …]`, `['auth']` | Cache cleanup on login/logout |
| 8 | `components/authchooser/index.tsx:211` | `invalidateQueries` | `['clusterMe', clusterName]` | Refresh user info after auth |
| 9 | `lib/k8s/api/v2/hooks.ts:139` | `useQuery` + `setQueryData` (172, 193) | `kubeObjectQueryKey(...)` (`['object', …]`) | Fetch single object + apply WebSocket updates |
| 10 | `lib/k8s/api/v2/hooks.ts:276` | `useQuery` | `['endpoints', cluster, namespace, name, endpointsKey]` | Probe for a working API endpoint |
| 11 | `lib/k8s/api/v2/useKubeObjectList.ts:65` (query) + `setQueryData` (250, 360) | `useQueries` | `['kubeObject', 'list', …, cluster, namespace, queryParams]` | Fetch object lists + apply WebSocket updates |
| 12 | `components/Sidebar/VersionButton.tsx:81` | `useQuery` | `['version', cluster ?? '']` | Poll cluster version |
| 13 | `components/common/Resource/AuthVisible.tsx:68` | `useQuery` | `['authVisible', name, apiName, apiVersion, verb, subresource, namespace]` | Per-item RBAC check |
| 14 | `components/common/Resource/ScaleMultipleButton.tsx:88` | `useQueries` | `['scaleMultiple:auth', cluster, namespace, name, kind]` | Per-item RBAC check for scaling |
| 15 | `components/common/Link.tsx:65` | `setQueryData` + `invalidateQueries` (79, 82) | `kubeObjectQueryKey(...)` | Prepopulate object cache before navigation |

> `Table.tsx` and `GraphView.tsx` import `useQueryParamsState`, which is a **URL search-param** hook, not React Query — they are not usage sites.

---

## Correctness Bugs (verified, high impact)

### 🔴 BUG #1 — WebSocket single-object updates drop `cluster`

**File:** `lib/k8s/api/v2/hooks.ts:172` and `:193` (compare the initial fetch at `:153`)

```typescript
// initial fetch — cluster IS passed:
return new kubeObjectClass(obj, cluster) as Instance;                 // line 153
// live WebSocket updates — cluster is NOT passed:
client.setQueryData(queryKey, new kubeObjectClass(update.object));    // lines 172 & 193
```

**Problem:** The initial `queryFn` constructs the object **with** `cluster`; both WebSocket `onMessage` handlers (the multiplexer path and the legacy `connectionsRequests` path) reconstruct it **without** `cluster`. After the first live update, the cached object loses `kubeObject.cluster`.

**Why this is clearly a bug:** the *list* equivalent does it correctly — `useKubeObjectList.ts` passes `cluster` to `KubeList.applyUpdate(..., cluster)` at line 255 and again at lines 363–367, and the per-item constructor sets `itm.cluster = cluster` (line 103). Only the single-object path in `hooks.ts` omits it.

**Impact:** Anything reading `kubeObject.cluster` after a server-side change — detail navigation, multi-cluster views, and the `Link.tsx` prefetch key (#11) — gets `undefined`. Intermittent and hard to reproduce because it only manifests after an object changes server-side.

**Fix:** `new kubeObjectClass(update.object, cluster)` in both handlers.

**Manual test steps:**
1. `npm start`; open a detail view for one object (e.g. a Pod) so the `useGet` query in `hooks.ts` is active.
2. Add a temporary `console.log(kubeObject.cluster)` in a child (or the `Link.tsx` prefetch).
3. `kubectl label pod <name> audit=1 --overwrite` to push a `MODIFIED` update.
4. **Bug present:** after the update the logged `.cluster` is `undefined`.
5. **After fix:** `.cluster` is preserved.

**Test coverage:** ❌ `hooks.test.tsx` does not exercise cluster propagation through the WebSocket update path.

---

### 🔴 BUG #2 — `cluster` missing from the `authVisible` query key (cross-cluster RBAC collision)

**File:** `components/common/Resource/AuthVisible.tsx:70–78` (key) / `:79–90` (fn)

```typescript
queryKey: ['authVisible', itemName, itemClass.apiName, itemClass.apiVersion,
           authVerb, subresource, namespace],
queryFn: async () => item!.getAuthorization(authVerb, { subresource, namespace },
                                            (item as any).cluster),
```

**Problem:** The authorization request correctly passes `(item as any).cluster` to `getAuthorization`, but `cluster` is **not** included in the query *key*. Two items with the same name/apiName/apiVersion/verb in **different clusters** therefore share one cache entry, so the first cluster's RBAC result is served for the second.

**Why this is clearly a bug:** the sibling RBAC check in `ScaleMultipleButton.tsx:90–96` **does** include `(item as any).cluster` in its key, confirming the omission here is unintentional.

**Impact:** Incorrect RBAC gating across clusters — UI actions shown/hidden based on a *different* cluster's permissions. Correctness/security-relevant, not just performance.

**Manual test steps:**
1. Two clusters A and B holding a resource with the **same** name/apiName/apiVersion but **different** permissions for your user (allowed in A, denied in B).
2. View it in A; confirm the gated control appears.
3. Without reloading, view the same-named resource in B.
4. **Bug present:** B serves A's cached result (key omits cluster) and the control is wrongly shown/hidden.
5. **After fix (cluster in key):** each cluster gets its own entry.

**Test coverage:** ❌ None.

---

### 🔴 BUG #3 — Conditional `useQuery` call in `AuthVisible` (Rules of Hooks)

**File:** `components/common/Resource/AuthVisible.tsx:59–68`

```typescript
if (!VALID_AUTH_VERBS.includes(authVerb)) {
  console.warn(`Invalid authVerb provided: "${authVerb}". ...`);
  return null;                       // early return…
}
// …
// eslint-disable-next-line react-hooks/rules-of-hooks
const { data } = useQuery<any>({ /* … */ });   // …hook after a possible return
```

**Problem:** `useQuery` and the `useEffect` at line 96 are called **after** a conditional `return null`. If `authVerb` switches between valid and invalid for the same mounted component, the hook count changes between renders and React throws "rendered fewer hooks than expected". The two `eslint-disable react-hooks/rules-of-hooks` comments suppress a warning that is flagging a real defect.

**Impact:** Potential render crashes; at minimum, fragile code that defeats the linter.

**Fix:** Always call the hooks; move the verb check into `enabled` / the `queryFn` (and `return null` after, based on `data`).

**Manual test steps:**
1. Temporarily remove the two `// eslint-disable-next-line react-hooks/rules-of-hooks` comments and run `npm run frontend:lint` — it flags the conditional hook.
2. Runtime: render an `AuthVisible` whose `authVerb` flips between a valid and an invalid verb across renders.
3. **Bug present:** React logs/throws a hook-count error.
4. **After fix:** hooks always run; lint passes without the disables.

**Test coverage:** ❌ None.

---

### 🟠 BUG #4 — `AuthVisible` `queryFn` swallows errors into `undefined`

**File:** `components/common/Resource/AuthVisible.tsx:79–90`

```typescript
queryFn: async () => {
  try {
    return await item!.getAuthorization(authVerb, { subresource, namespace }, (item as any).cluster);
  } catch (e: any) {
    onError?.(e);          // → implicitly returns undefined
  }
},
```

**Problem:** On failure the `catch` calls `onError` and returns `undefined`. React Query therefore records a **successful** query with `data === undefined`; `isError`/`error` are never set and the failure is cached as success (so it is not retried as an error). `visible` then falls to `false`, conflating "explicitly denied" with "the check failed". Calling `onError` inside `queryFn` is also a side effect (same anti-pattern as #6/#7).

**Impact:** Transient auth-check failures silently hide UI as if denied, and are cached as success.

**Manual test steps:**
1. Open a view rendering `AuthVisible`-gated children; pass an `onError` callback.
2. In DevTools → Network, block/fail the SelfSubjectAccessReview request.
3. **Bug present:** `onError` fires, yet the query reports success with `data === undefined`, `isError` stays `false`, children are hidden, and no error retry happens.
4. **After fix:** the error propagates (`isError`/`error` set) and is distinguishable from a deny.

**Test coverage:** ❌ None.

---

### 🟠 BUG #5 — Stale `queryKey` memo (and stale WS closure) drop `cluster`/`queryParams`

**File:** `lib/k8s/api/v2/hooks.ts:131–136` (and `:159–178`)

```typescript
const queryKey = useMemo(
  () => kubeObjectQueryKey({ cluster, name, namespace, endpoint, queryParams: cleanedUpQueryParams }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [endpoint, namespace, name]            // omits cluster + cleanedUpQueryParams
);
```

**Problem:** The key value depends on `cluster`, `endpoint`, `namespace`, `name`, **and** `cleanedUpQueryParams`, but the dependency array lists only `[endpoint, namespace, name]`. If `cluster` or `queryParams` change while those three stay constant, the memoized `queryKey` does **not** update, so the query reads/writes the wrong cache entry. The same staleness affects `connectionsRequests` (the legacy WebSocket memo, deps `[endpoint]` at `:178`), which closes over `queryKey`, `namespace`, `name`, and `cleanedUpQueryParams` and writes updates to the stale key. This is also what makes BUG #1 write to a possibly-wrong key.

**Impact:** Stale or cross-cluster data for single-object fetches when only `cluster`/`queryParams` change.

**Manual test steps:**
1. Add `console.log('queryKey', queryKey)` next to the `useMemo`.
2. Render a single-object view, then change **only** `cluster` (or a query param) while keeping `endpoint`/`namespace`/`name` the same.
3. **Bug present:** the logged key does not change; the wrong cache entry is used.
4. **After fix (full deps):** the key updates on `cluster`/`queryParams` change.

**Test coverage:** ❌ None.

---

### 🟠 BUG #6 — `queryFn` performs Redux side effects on the config poll

**File:** `components/App/Layout.tsx:218` (`queryFn`), backed by `fetchConfig` at `:137`

```typescript
useQuery({
  queryKey: ['cluster-fetch'],
  queryFn: () => fetchConfig(dispatch),   // dispatch(setConfig), dispatch(applyBackendThemeConfig)
  refetchInterval: CLUSTER_FETCH_INTERVAL,
});
```

**Problem:** `fetchConfig` dispatches `setConfig`/`applyBackendThemeConfig` (lines 153, 165, 176) and reads `store.getState()` (lines 138–139) **inside the fetch**. `queryFn` should be a pure data fetch. Here Redux — not the query's return value — is the source of truth, so the cache is redundant, every poll/retry re-runs the dispatch path, and the fetch can't be tested without a Redux store. (The `configDifferent` guard at `:156` limits dispatches to actual changes, which is good, but the side effect still belongs in a `useEffect`.)

**Impact:** Redux writes driven by React Query's internal refetch/retry timing rather than by data changes; cache and `state.config` can diverge.

**Manual test steps:**
1. `npm start`; add `console.count('setConfig')` in the `setConfig` reducer case.
2. Idle on any page ~40s.
3. **Bug present:** a `GET /config` fires every ~10s; dispatch path re-runs on the interval (the count increments when the payload changes).
4. **After fix:** the poll still fetches, but dispatch happens in a `useEffect` keyed on `data`.

**Test coverage:** ❌ None.

---

### 🟠 BUG #7 — Snackbar side effect + self-referential closure in `VersionButton`

**File:** `components/Sidebar/VersionButton.tsx:81–120`

```typescript
const { data: clusterVersion } = useQuery<StringDict | null>({
  queryKey: ['version', cluster ?? ''],
  queryFn: () => getVersion().then(results => {
    if (clusterVersion && results?.gitVersion) {          // reads its own query data
      versionChange = semver.compare(results.gitVersion, clusterVersion.gitVersion);
      enqueueSnackbar(msg, { /* … */ });                  // side effect inside queryFn
    }
    return results;
  }),
  refetchInterval: versionFetchInterval,
});
```

**Problem:** Two compounding issues: (1) `enqueueSnackbar` fires from inside the fetch, tying the "version changed" toast to refetch/retry mechanics; (2) the `queryFn` reads `clusterVersion`, the very value the query produces — the closure captures the value from the render that built this `queryFn`, which can be stale relative to the actual previous cache value.

**Impact:** Missed, duplicated, or stale-comparison "version changed" notifications. Same pattern as #6.

**Fix:** Return data only; compute the delta and call `enqueueSnackbar` in a `useEffect` keyed on `clusterVersion`, comparing against a `useRef` of the previous value.

**Manual test steps:**
1. Open the sidebar version button so `['version', cluster]` polls.
2. Stub `getVersion` to return a different `gitVersion` on the second call.
3. **Bug present:** the toast fires from inside `queryFn` and may use a stale previous value.
4. **After fix:** exactly one toast per real change, computed in `useEffect`.

**Test coverage:** ❌ None.

---

## Lower-impact Bugs (verified)

### 🟡 BUG #8 — `AdvancedSearch` surfaces no error when discovery fails *(claim corrected)*

**File:** `components/advancedSearch/AdvancedSearch.tsx:73`

```typescript
const { data: resources, isLoading } = useQuery({
  queryFn: () => apiDiscovery([...selectedClusters]),
  queryKey: ['api-discovery', ...selectedClusters],
});
```

**Problem:** Only `data` and `isLoading` are read; `error`/`isError` are ignored.

**Correction to the earlier draft:** the previous report said this causes an "infinite loading spinner". That is **wrong**. The loader is gated on `if (isLoading)` at `:128`, and React Query sets `isLoading` to `false` once the query settles into the `error` state (after the default 3 retries, ≈7s). The component then renders normally with `resources ?? emptyList` (an empty list) and the `{resources && …}` blocks simply don't render. So the real defect is a **silent empty page with no error feedback**, not a hang.

**Impact:** On discovery failure the user sees an empty resource picker with no indication that anything failed or how to retry.

**Manual test steps:**
1. Open Advanced Search; in DevTools → Network, fail the `/api` + `/apis` discovery requests.
2. Select a cluster to trigger the query.
3. **Bug present:** after the retries the spinner clears and an empty list is shown with no error message.
4. **After fix:** an error state is rendered.

**Test coverage:** ❌ None.

---

### 🟡 BUG #9 — `AdvancedSearch` updates state during render from query data *(new)*

**File:** `components/advancedSearch/AdvancedSearch.tsx:79–81`

```typescript
if (selectedResources === undefined && selectedResourcesState === 'all' && resources) {
  setSelectedResources(new Set(resources.map(resource => apiResourceId(resource))));
}
```

**Problem:** When the `resources` query resolves, this calls the `setSelectedResources` state setter **directly in the render body** (not in an effect or event handler). React's documented contract is that calling a setter during render is only safe for the *currently rendering* component when guarded to converge; here it is driven by external (query) data and `selectedResourcesState` (the `'resources'` value from `useLocalStorageState`, line 51), which is exactly the "cascading/derived-state-during-render" anti-pattern. It schedules an extra render whenever the query produces data while `selectedResources` is still `undefined`.

**Impact:** Avoidable re-render churn tied to query resolution; brittle if the guard conditions change. Belongs in a `useEffect` keyed on `resources`/`selectedResourcesState`.

**Manual test steps:**
1. Set the `resources` localStorage value to `all` and clear `selectedResources`.
2. Add a `console.count('render')` at the top of `AdvancedSearch`.
3. Load the page so the discovery query resolves.
4. **Bug present:** an extra render is triggered from the render-phase `setSelectedResources` when `resources` arrives.
5. **After fix:** the selection is derived/initialised in an effect; no render-phase setState.

**Test coverage:** ❌ None.

---

### 🟡 BUG #10 — Unsorted spread array in the `api-discovery` key

**File:** `AdvancedSearch.tsx:75` and `sources.tsx:142`

```typescript
queryKey: ['api-discovery', ...selectedClusters]
```

**Problem:** Spreading `selectedClusters` makes the key order-sensitive. `['api-discovery', 'b', 'a']` and `['api-discovery', 'a', 'b']` are distinct cache entries for identical data. Both files share this key (and the same `queryFn`), so they benefit from cache sharing — which makes a consistent ordering more important, not less.

**Impact:** Duplicate cache entries and redundant discovery requests when the same clusters are selected in a different order, or if the two call sites ever order the array differently.

**Fix:** `queryKey: ['api-discovery', [...selectedClusters].sort()]` in both files.

**Manual test steps:**
1. Two clusters configured; DevTools → Network filtered to `/api`+`/apis`.
2. Select A then B (one request, then cached).
3. Clear, select B then A.
4. **Bug present:** a second discovery request fires for the same set.
5. **After fix (sorted key):** the cached result is reused regardless of order.

**Test coverage:** ❌ None.

---

### 🟡 BUG #11 — `logout()` removes auth queries for *all* clusters

**File:** `lib/auth.ts:142`

```typescript
queryClient.removeQueries({ queryKey: ['auth'], exact: false });
```

**Problem:** `exact: false` removes every query whose key starts with `['auth']` — `['auth', 'cluster-1']`, `['auth', 'cluster-2']`, … So logging out of one cluster clears cached auth checks for **all** clusters. It also clears only the `['auth', …]` shape; `authVisible`, `scaleMultiple:auth`, and `clusterMe` entries survive logout (see #12).

**Impact:** In multi-cluster setups, one logout forces re-auth checks for every cluster.

**Manual test steps:**
1. Two token-auth clusters A and B; log in to both so each has an `['auth', cluster]` entry (use React Query DevTools).
2. Log out of A only.
3. **Bug present:** B's `['auth', 'B']` entry is also removed.
4. **After fix (`exact: true` / scoped key):** only A's entry is removed.

**Test coverage:** ⚠️ `auth.test.ts` exists but does not cover the React Query cleanup.

---

### 🟡 BUG #12 — Four unrelated RBAC/auth key shapes; logout clears only one

**Files:** `RouteSwitcher.tsx:170`, `AuthVisible.tsx:68`, `ScaleMultipleButton.tsx:88`, `TopBar.tsx:299`, `auth.ts`

The app answers "what can this user do" under four unrelated key shapes:

- `['auth', cluster]` (RouteSwitcher)
- `['authVisible', name, apiName, apiVersion, verb, subresource, namespace]` (AuthVisible — no cluster, see #2)
- `['scaleMultiple:auth', cluster, namespace, name, kind]` (ScaleMultipleButton)
- `['clusterMe', clusterName]` (TopBar / auth.ts)

**Problem:** These overlap conceptually but share no cache and follow no convention, so identical permission questions are fetched repeatedly through different components, and `logout()`'s `removeQueries({ queryKey: ['auth'], exact: false })` clears only the first shape — the rest linger after logout.

**Impact:** Redundant RBAC requests and stale authorization data surviving logout.

**Manual test steps:**
1. Open React Query DevTools; trigger an `AuthVisible` check, a `ScaleMultipleButton` view, and the top-bar `clusterMe` query.
2. **Bug present:** four distinct cache shapes exist for the same conceptual question.
3. Log out and re-inspect.
4. **Bug present:** `authVisible`/`scaleMultiple:auth`/`clusterMe` entries survive; only `['auth', …]` is cleared.
5. **After fix (shared convention):** RBAC entries share keys where possible and are all cleared on logout.

**Test coverage:** ❌ None.

---

## Non-issues & minor observations

These were either re-classified after verification or are low enough to be noise; listed for completeness so future readers don't re-file them as bugs.

- **`enabled` guard for empty clusters — not a network bug.** `AdvancedSearch`/`sources` call `apiDiscovery([...selectedClusters])` without `enabled: selectedClusters.length > 0`. Verified against `apiDiscovery` (`lib/k8s/api/v2/apiDiscovery.tsx:133`): with an empty array the `for…of` body never runs and it resolves to `[]` **with no network request**. The only effect is an empty resolved cache entry, so the earlier "wasted network request" claim is overstated. Adding `enabled` is a tidy-up, not a fix.
- **Mixed `invalidateQueries` vs `removeQueries` (`auth.ts:125,127`) — intentional.** Setting a token invalidates (refetch user info); clearing a token removes it (no data to show). This asymmetry is the correct behavior, not a defect.
- **`dispatch` captured in the Layout `queryFn` closure.** `dispatch` from `useDispatch()` is stable; this is a symptom of #6 (side effects in `queryFn`), not a separate bug.
- **Global singleton `QueryClient` (`lib/queryClient.ts:19`, provided in `App.tsx:68`).** Shared across the app and across any test that renders through the singleton. Mitigated in practice — `RouteSwitcher.test.tsx` and `useKubeObjectList.test.tsx` create their own clients. Real but low risk.
- **No explicit `gcTime`.** Uses the 5-minute default; negligible memory overhead. Not worth changing without evidence.
- **`staleTime: 3 * 60_000`.** Affects only the few RQ-managed queries (`cluster-fetch`, `auth`, `api-discovery`, `clusterMe`); real-time resource lists use WebSockets and are unaffected. This looks deliberate.
- **`Link.tsx` prefetch can write a mismatched key (`:65–82`).** If the user clicks before `useEndpoints` resolves (`enabled: endpoints.length > 1`, `hooks.ts:277`), `endpoint` is `undefined` and the prefetch key won't match the detail page's key, so the optimization silently no-ops. Purely a lost optimization (and a downstream symptom of #1 when `cluster` is dropped). Low priority.

---

## The Two-State-Store Problem

The most important structural finding is a pattern, not a single bug: **Headlamp keeps overlapping data in two independent client-side stores — Redux and the React Query cache — with no single source of truth.**

### Where they overlap

- **Cluster config** lives in Redux (`config` reducer) *and* is the payload of the `['cluster-fetch']` query (`Layout.tsx:216`). The query's `queryFn` (`fetchConfig`) both `dispatch`es into Redux and reads `store.getState().config` directly (`Layout.tsx:137–193`).
- **Theme** lives in Redux but is mutated from the same config `queryFn` (`applyBackendThemeConfig`).
- **Kubernetes objects/lists** live in the React Query cache (`lib/k8s/api/v2`), while UI concerns about them (filters, selected namespaces, table state) live in Redux.

### Why two stores cause the bugs above

1. **No single source of truth.** For config, Redux is authoritative but RQ also caches the payload; the two can diverge (BUG #6).
2. **`queryFn` becomes a write path.** Because the only way to get data *into* Redux is to fetch it, the fetch is forced to perform `dispatch`/snackbar/`onError` side effects (BUG #4, BUG #6, BUG #7). Every poll and every retry re-runs them.
3. **Invalidation must be done twice.** Logout has to clear Redux *and* the RQ cache (`auth.ts:142–143`), and the two are not symmetric (BUG #11, BUG #12).
4. **Dependency tracking is bypassed.** RQ can't see Redux as a dependency; `fetchConfig` reading `store.getState()` and the stale `queryKey` memo (#5) both stem from data flowing through Redux that RQ can't react to. The code "works" only because of the polling interval.
5. **Cross-store races.** WebSocket updates write directly to the RQ cache (BUG #1) while Redux-driven re-renders touch the same components, producing ordering-dependent UI.

### Direction (observation only — no change proposed here)

Picking **one** owner per piece of state would dissolve this whole class of bug:

- Treat the React Query cache as the source of truth for *server* state (config, version, objects, lists, RBAC); let components select from it instead of mirroring into Redux.
- Keep Redux for *client/UI* state only (filters, sidebar, selected namespaces, drawer mode).
- Make every `queryFn` pure; move `dispatch`/snackbar/`onError` side effects into `useEffect`s keyed on the query result.

---

## Test Coverage Summary

**Headline: 9 of 15 React Query sites (60%) have no test whatsoever, and only 2 (13%) are properly tested.** The breakdown by coverage level:

| Coverage level | Count | Sites |
|----------------|-------|-------|
| ✅ Proper isolated query test | **2** (13%) | #2 `RouteSwitcher`, #11 `useKubeObjectList` |
| ⚠️ Partial / indirect only | **4** (27%) | #3 `TopBar` (story only), #7 `auth.ts` (test skips RQ cleanup), #9 & #10 `hooks.ts` (miss the cluster/stale-key bugs) |
| ❌ No test at all | **9** (60%) | #1 `Layout`, #4 `AdvancedSearch`, #5 `sources`, #6 `queryClient`, #8 `authchooser`, #12 `VersionButton`, #13 `AuthVisible`, #14 `ScaleMultipleButton`, #15 `Link` |

**All 12 genuine defects are in untested or under-tested code:** the 10 defects in `AuthVisible`, `AdvancedSearch`, `Layout`, `VersionButton`, and `auth.ts` sit in sites with no query test, and the remaining two (#1, #5) are in `hooks.ts`, whose `hooks.test.tsx` never exercises the WebSocket update path or the `queryKey` memo deps. No existing test would fail if any of these bugs regressed.

Per-site detail:

| # | Site | Has Test? | Test File | Notes |
|---|------|-----------|-----------|-------|
| 1 | `Layout.tsx` `['cluster-fetch']` | ❌ | — | No test for the config poll (#6) |
| 2 | `RouteSwitcher.tsx` `['auth', cluster]` | ✅ | `RouteSwitcher.test.tsx` | Proper `QueryClient` isolation |
| 3 | `TopBar.tsx` `['clusterMe']` | ⚠️ | `TopBar.stories.tsx` | Storybook only |
| 4 | `AdvancedSearch.tsx` `['api-discovery']` | ❌ | — | No test (#8, #9, #10) |
| 5 | `sources.tsx` `['api-discovery']` | ❌ | — | No test/story |
| 6 | `queryClient.ts` / `App.tsx` | ❌ | — | No config test |
| 7 | `auth.ts` `['clusterMe']`,`['auth']` | ⚠️ | `auth.test.ts` | Doesn't cover RQ cleanup (#11, #12) |
| 8 | `authchooser/index.tsx` `['clusterMe']` | ❌ | — | Stories exist; don't test invalidation |
| 9 | `hooks.ts` (useGet/useWatch) | ⚠️ | `hooks.test.tsx` | Misses WS cluster propagation (#1) and stale key (#5) |
| 10 | `hooks.ts` (useEndpoints) | ⚠️ | `hooks.test.tsx` | Partial |
| 11 | `useKubeObjectList.ts` | ✅ | `useKubeObjectList.test.tsx` | Own `QueryClient`; good isolation |
| 12 | `VersionButton.tsx` `['version']` | ❌ | — | No test (#7) |
| 13 | `AuthVisible.tsx` `['authVisible']` | ❌ | — | No test (#2, #3, #4) |
| 14 | `ScaleMultipleButton.tsx` | ❌ | — | No test |
| 15 | `Link.tsx` prefetch | ❌ | — | No test |

**Bottom line:** only `RouteSwitcher.test.tsx` and `useKubeObjectList.test.tsx` create their own `QueryClient` and assert on query behavior. The entire app-shell config poll, both `api-discovery` callers, all three RBAC widgets (`AuthVisible`, `ScaleMultipleButton`, the `authchooser` invalidation), `VersionButton`, and the `Link` prefetch have **zero** query-behavior tests, and `hooks.ts` — the most-used data layer in the app — has only partial coverage that misses its two correctness bugs.

---

## Recommendations (priority order)

1. **Pass `cluster` to the WebSocket `setQueryData` constructors** in `hooks.ts:172,193` (#1) and **add `cluster` to the `authVisible` key** (#2) — both are multi-cluster correctness bugs.
2. **Fix the conditional hook in `AuthVisible`** (#3) and the **stale `queryKey` memo** in `hooks.ts` (#5) instead of suppressing the lint rules that flag them.
3. **Stop swallowing errors** in the `AuthVisible` `queryFn` (#4); let `isError`/`error` surface.
4. **Make polling `queryFn`s pure:** move Redux dispatch (#6) and the version snackbar (#7) into `useEffect`s keyed on the query `data`.
5. **AdvancedSearch:** surface `error`/`isError` (#8) and move the render-phase `setSelectedResources` into an effect (#9).
6. **Sort the `api-discovery` key array** (#10); **scope logout's auth removal** (`exact: true`) (#11) and converge on a shared RBAC key convention (#12).
7. **Add query-behavior tests** for Layout, AdvancedSearch, AuthVisible, and the `hooks.ts` WebSocket update path — the highest-impact untested areas.
