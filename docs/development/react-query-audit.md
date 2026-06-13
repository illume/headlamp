# React Query Audit Report

> **Date:** 2026-06-13
> **Scope:** All `@tanstack/react-query` usage in `frontend/src/`
> **Files audited:** 15 files (`useQuery`/`useQueries`, 1 QueryClient config, and imperative `queryClient.*` / `useQueryClient().*` calls)

---

## Executive Summary

A first pass found **6 obvious React Query usage sites**. A deeper sweep of `frontend/src/` (including the `lib/k8s/api/v2` data layer and per-resource RBAC/version widgets) found **7 more**, for **13 distinct usage sites** in total. Of these, **only 2 have dedicated tests** that exercise the query behavior. The audit found **18 bugs total** (1 critical, 7 high, 7 medium, 3 low).

The single biggest theme is **two overlapping client-side state stores** — Redux *and* the React Query cache — holding the same data with no single source of truth. This is described in its own section ("The Two-State-Store Problem") and is the root cause of the most impactful bugs (`Layout.tsx` config polling, `VersionButton.tsx` snackbars). The other recurring themes are **side effects inside `queryFn`**, **missing `cluster` in query keys** (cross-cluster cache collisions), and **inconsistent, non-shared RBAC query keys**.

---

## All React Query Usage Sites

| # | File | Hook / Method | Query Key | Purpose |
|---|------|--------------|-----------|---------|
| 1 | `components/App/Layout.tsx:216` | `useQuery` | `['cluster-fetch']` | Poll backend for cluster config |
| 2 | `components/App/RouteSwitcher.tsx:170` | `useQuery` | `['auth', cluster]` | Check auth status for a cluster |
| 3 | `components/App/TopBar.tsx:299` | `useQueries` | `['clusterMe', clusterName]` | Fetch user info per cluster |
| 4 | `components/advancedSearch/AdvancedSearch.tsx:73` | `useQuery` | `['api-discovery', ...clusters]` | Discover API resources for search |
| 5 | `components/resourceMap/sources/definitions/sources.tsx:140` | `useQuery` | `['api-discovery', ...clusters]` | Discover API resources for resource map |
| 6 | `lib/queryClient.ts:19` | `new QueryClient()` | N/A | Global singleton config |
| 7 | `lib/auth.ts:125,127,142,143` | `queryClient.invalidateQueries / removeQueries` | `['clusterMe', ...]`, `['auth']` | Cache cleanup on login/logout |
| 8 | `components/authchooser/index.tsx:211` | `queryClient.invalidateQueries` | `['clusterMe', clusterName]` | Refresh user info after auth |
| 9 | `lib/k8s/api/v2/hooks.ts:139` | `useQuery` + `setQueryData` (line 172, 193) | `kubeObjectQueryKey(...)` | Fetch single object + apply WebSocket updates |
| 10 | `lib/k8s/api/v2/hooks.ts:276` | `useQuery` | `['endpoints', cluster, namespace, name, endpointsKey]` | Probe for working API endpoint |
| 11 | `lib/k8s/api/v2/useKubeObjectList.ts:478` | `useQueries` + `setQueryData` (line 250, 360) | `kubeObjectListQuery(...).queryKey` | Fetch object lists + apply WebSocket updates |
| 12 | `components/Sidebar/VersionButton.tsx:81` | `useQuery` | `['version', cluster]` | Poll cluster version |
| 13 | `components/common/Resource/AuthVisible.tsx:68` | `useQuery` | `['authVisible', name, apiName, apiVersion, verb, subresource, namespace]` | Per-item RBAC check |
| 14 | `components/common/Resource/ScaleMultipleButton.tsx:88` | `useQueries` | `['scaleMultiple:auth', cluster, namespace, name, kind]` | Per-item RBAC check for scaling |
| 15 | `components/common/Link.tsx:65` | `setQueryData` + `invalidateQueries` (line 79, 82) | `kubeObjectQueryKey(...)` | Prepopulate object cache before navigation |

> The original "6 sites" framing missed the entire `lib/k8s/api/v2` data layer (sites 9–11), which is where the bulk of the app's React Query usage actually lives, plus three widget-level queries (sites 12–14) and one imperative prefetch (site 15).

---

## Bugs Ranked by Impact

### 🔴 BUG #1 — CRITICAL: `queryFn` dispatches Redux actions (side effects)

**File:** `components/App/Layout.tsx:218`
**Code:**
```typescript
useQuery({
  queryKey: ['cluster-fetch'],
  queryFn: () => fetchConfig(dispatch),  // dispatches setConfig(), applyBackendThemeConfig()
  refetchInterval: ...,
});
```

**Problem:** `fetchConfig()` calls `dispatch(setConfig(...))` and `dispatch(applyBackendThemeConfig(...))` inside the query function. React Query `queryFn` should be pure data-fetching functions. Side effects in `queryFn` cause:
- Redux state updates during React Query's internal render cycle, risking "cannot update during render" warnings
- Duplicate dispatches on every refetch (the `refetchInterval` fires every 10 seconds), even when the data hasn't changed and React Query would have deduplicated it
- The `config` return value from the query is **not the source of truth** — Redux is — making the React Query cache redundant
- Testing difficulty: you can't test the query without also testing Redux side effects

**Impact:** Subtle re-render storms on the 10-second polling interval. The query's cached `config` value and Redux's `state.config` can diverge if a dispatch fails.

**Manual test steps:**
1. Run `npm start` and open Headlamp with at least one cluster configured.
2. Open the Redux DevTools extension (or temporarily add `console.count('setConfig')` inside the `setConfig` case of the `config` reducer).
3. Leave the app idle on any page for ~40 seconds without changing anything.
4. **Expected (bug present):** a `GET /config` request fires every ~10s (Network tab) and `setConfig`/`applyBackendThemeConfig` actions are dispatched on the polling interval; with the `console.count`, the counter increases roughly every 10s even though the backend config never changed.
5. **Expected (after fix):** the polling fetch still runs, but Redux actions are only dispatched when the config payload actually changes.

**Test coverage:** ❌ No test covers this query.

---

### 🟠 BUG #2 — HIGH: Missing error handling in AdvancedSearch

**File:** `components/advancedSearch/AdvancedSearch.tsx:73`
**Code:**
```typescript
const { data: resources, isLoading } = useQuery({
  queryFn: () => apiDiscovery([...selectedClusters]),
  queryKey: ['api-discovery', ...selectedClusters],
});
```

**Problem:** The query destructures only `data` and `isLoading` — `error` / `isError` are ignored. If `apiDiscovery` fails (network error, cluster unreachable), the component will show an infinite loading spinner with no error feedback. React Query's default retry (3 attempts) will delay the loading state for ~6 seconds before silently failing.

**Impact:** Users see a perpetual loading spinner when API discovery fails, with no way to understand or recover from the error.

**Manual test steps:**
1. Run `npm start` and open the Advanced Search page (the search/magnifying-glass entry in the UI).
2. In browser DevTools → Network, enable request blocking for the API-discovery request (or set the cluster offline / use an unreachable cluster) so `apiDiscovery` rejects.
3. Select one or more clusters to trigger the query.
4. **Expected (bug present):** after ~6s of React Query retries the spinner remains forever; no error message is shown to the user.
5. **Expected (after fix):** an error state/message is rendered instead of an infinite spinner.

**Test coverage:** ❌ No test covers this query.

---

### 🟠 BUG #3 — HIGH: Missing `enabled` guard when clusters are empty

**File:** `components/advancedSearch/AdvancedSearch.tsx:73` and `components/resourceMap/sources/definitions/sources.tsx:140`

**Problem:** Both queries call `apiDiscovery([...selectedClusters])` without an `enabled: selectedClusters.length > 0` guard. When no clusters are selected (e.g., on first load before cluster selection), the query fires with an empty array, triggering an unnecessary API call.

**Impact:** Wasted network request on load. If `apiDiscovery([])` returns unexpected results or errors, it may cause downstream issues.

**Manual test steps:**
1. Run `npm start` and open DevTools → Network, filtered to the API-discovery request.
2. Navigate to the Advanced Search page (and separately the resource Map view) in a state where **no clusters are selected yet** (fresh load / cleared selection).
3. **Expected (bug present):** an `apiDiscovery` request fires immediately with an empty cluster list before any cluster is selected.
4. **Expected (after fix):** no API-discovery request is made until at least one cluster is selected.

**Test coverage:** ❌ Neither file has tests.

---

### 🟠 BUG #4 — HIGH: Array order in query key causes cache misses

**File:** `components/advancedSearch/AdvancedSearch.tsx:75` and `sources.tsx:142`
**Code:**
```typescript
queryKey: ['api-discovery', ...selectedClusters]
```

**Problem:** React Query compares query keys using **structural equality**. If `selectedClusters` is `['cluster-b', 'cluster-a']` vs `['cluster-a', 'cluster-b']`, these are treated as **different cache entries**, even though they fetch the same data. The same user selecting clusters in a different order gets a cache miss and a redundant API call.

**Impact:** Duplicate cache entries and redundant network requests for the same set of clusters.

**Fix:** Sort the array: `queryKey: ['api-discovery', [...selectedClusters].sort()]`

**Manual test steps:**
1. Run `npm start` with at least two clusters configured. Open DevTools → Network filtered to the API-discovery request.
2. On the Advanced Search page, select clusters in the order **A then B**; note one discovery request fires and resolves (cached).
3. Clear the selection, then select the **same** clusters in the order **B then A**.
4. **Expected (bug present):** a second, redundant API-discovery request fires for the same set of clusters (cache miss due to array order).
5. **Expected (after fix, sorted key):** no new request — the cached result is reused regardless of selection order.

**Test coverage:** ❌ No tests.

---

### 🟡 BUG #5 — MEDIUM: `logout()` uses broad prefix-based query removal

**File:** `lib/auth.ts:142`
**Code:**
```typescript
queryClient.removeQueries({ queryKey: ['auth'], exact: false });
```

**Problem:** `exact: false` means this removes **all queries whose key starts with `['auth']`**. This includes `['auth', 'cluster-1']`, `['auth', 'cluster-2']`, etc. When logging out of one cluster, this clears auth state for **all** clusters.

**Impact:** In multi-cluster setups, logging out of one cluster clears cached auth checks for every cluster, causing unnecessary re-authentication checks across the board.

**Manual test steps:**
1. Run `npm start` with two token-authenticated clusters (A and B). Log in to both so each has an `['auth', cluster]` cache entry.
2. (Optional) Open React Query DevTools to watch the cache, or add a temporary `console.log` in the `['auth', ...]` `queryFn`.
3. Log out of cluster A only.
4. **Expected (bug present):** the cached auth state for cluster **B** is also removed (its `['auth', 'B']` entry disappears), so navigating to B re-runs the auth check unnecessarily.
5. **Expected (after fix, `exact: true` / scoped key):** only cluster A's auth entry is removed; B's remains.

**Test coverage:** ❌ `auth.ts` has a test file (`auth.test.ts`) but it does **not** test React Query interactions.

---

### 🟡 BUG #6 — MEDIUM: Mixed `invalidateQueries` vs `removeQueries` strategy

**File:** `lib/auth.ts:125,127`
**Code:**
```typescript
if (token) {
  queryClient.invalidateQueries({ queryKey: ['clusterMe', cluster], exact: true });
} else {
  queryClient.removeQueries({ queryKey: ['clusterMe', cluster], exact: true });
}
```

**Problem:** `invalidateQueries` marks data stale and triggers a background refetch. `removeQueries` deletes the data entirely. Using both based on whether a token exists creates an asymmetric cache lifecycle:
- Setting a token → refetch (shows stale data briefly, then fresh)
- Clearing a token → remove (shows nothing, then loading state on next mount)

This inconsistency is **intentional** (clear token = no data to show), but it interacts poorly with Bug #5: `logout()` calls `removeQueries` on `['auth']` *and* `['clusterMe']` separately, creating a window where auth state and user info state are out of sync.

**Impact:** Brief UI inconsistency between auth state and user info display during logout.

**Manual test steps:**
1. Run `npm start` with a token-authenticated cluster; log in so both `['auth', cluster]` and `['clusterMe', cluster]` entries are populated.
2. Open React Query DevTools to observe both entries.
3. Set a new token (re-auth) and observe `['clusterMe', cluster]` is marked stale and refetched (invalidate path).
4. Then clear the token / log out and observe `['clusterMe', cluster]` is removed outright, while `['auth']` is removed via the broad prefix removal.
5. **Expected (bug present):** during logout there is a window where the auth entry and the user-info entry are torn down asymmetrically (one invalidated+refetching, one removed), producing a brief inconsistent UI.
6. **Expected (after fix):** token-set and token-clear follow a symmetric, predictable cache lifecycle.

**Test coverage:** ❌ No test covers this interaction.

---

### 🟡 BUG #7 — MEDIUM: `dispatch` in `queryFn` closure may cause stale closures

**File:** `components/App/Layout.tsx:218`
**Code:**
```typescript
queryFn: () => fetchConfig(dispatch),
```

**Problem:** `dispatch` is captured in the `queryFn` closure. While `dispatch` from `useDispatch()` is typically stable, the `fetchConfig` function also reads `store.getState()` directly (line 138-139), bypassing React Query's dependency tracking. The query key is `['cluster-fetch']` with no dependencies — React Query has no way to know that the query depends on Redux state.

**Impact:** If Redux state changes between refetches, `fetchConfig` reads the latest state but React Query doesn't know the dependencies changed. This works by accident because the query refetches on an interval anyway, but it's fragile.

**Manual test steps:**
1. Run `npm start` and add a temporary `console.log('fetchConfig clusters', store.getState().config.clusters)` at the top of `fetchConfig` in `Layout.tsx`.
2. Open the app, then add or remove a cluster (e.g. via the cluster settings / dynamic clusters flow) so `state.config.clusters` changes.
3. Observe the next `['cluster-fetch']` refetch (within ~10s).
4. **Expected (bug present):** the log shows `fetchConfig` reading the updated Redux state even though the query key `['cluster-fetch']` never changed — the query has no declared dependency on that state and only "sees" it because of the interval.
5. **Expected (after fix):** config dependencies flow through the query key / props rather than a direct `store.getState()` read.

**Test coverage:** ❌ No test.

---

### 🟡 BUG #8 — MEDIUM: Global singleton `QueryClient` can cause test pollution

**File:** `lib/queryClient.ts:19`
**Code:**
```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 3 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});
```

**Problem:** This is a module-level singleton. Any test that imports a component using this `queryClient` (directly or transitively via `App.tsx`) shares state with other tests. Cached data from one test can leak into the next.

**Mitigating factor:** `RouteSwitcher.test.tsx` and `useKubeObjectList.test.tsx` both create their own `QueryClient` instances, avoiding this issue. But any test that renders through `<App />` or imports the singleton directly is vulnerable.

**Impact:** Flaky tests due to cached state from previous test runs.

**Manual test steps:**
1. Add a temporary test (or use an existing one) that renders a component which uses the module-level `queryClient` singleton and populates a query, e.g. `['version', 'test-cluster']`.
2. Add a second test in the same file that asserts the same query key is empty/uninitialised.
3. Run `npm run frontend:test -- <file>` with the two tests in this order, then reorder them.
4. **Expected (bug present):** the second test's result depends on test order — data set by the first test leaks via the shared singleton, causing intermittent failures.
5. **Expected (after fix / isolation):** each test that creates its own `QueryClient` (as `RouteSwitcher.test.tsx` and `useKubeObjectList.test.tsx` do) is order-independent.

**Test coverage:** ⚠️ Partially mitigated — key test files create their own clients.

---

### 🟢 BUG #9 — LOW: No explicit `gcTime` in global config

**File:** `lib/queryClient.ts:20-24`

**Problem:** Without explicit `gcTime`, React Query uses the default (5 minutes). In a long-running Headlamp session with many cluster navigations, inactive queries accumulate in memory for 5 minutes each.

**Impact:** Minor memory overhead in long sessions. Not a practical issue for most users.

**Manual test steps:**
1. Run `npm start`, open Chrome DevTools → Memory, and take a heap snapshot baseline.
2. Navigate across many resources/clusters to spin up and abandon many queries, then stop interacting.
3. Within 5 minutes (default `gcTime`), take another heap snapshot and filter for retained React Query cache entries / object instances.
4. **Expected (bug present):** inactive queries linger in memory for the full 5-minute default before garbage collection.
5. **Expected (after fix):** a shorter explicit `gcTime` reduces the retention window for inactive queries.

---

### 🟢 BUG #10 — LOW: `staleTime: 3 * 60_000` may be too long for Kubernetes data

**File:** `lib/queryClient.ts:22`

**Problem:** Kubernetes resources can change frequently (pods scaling, deployments rolling out). A 3-minute stale time means users may see outdated data. However, this only affects React Query–managed queries — the primary Kubernetes resource watchers use WebSockets (via `useKubeObjectList`), which are not affected by this setting.

**Impact:** Low — only affects the `cluster-fetch`, `auth`, `api-discovery`, and `clusterMe` queries, not real-time resource data.

**Manual test steps:**
1. Run `npm start` and open a view backed by one of the React Query–managed queries above (e.g. the cluster version in the sidebar, or API discovery results).
2. Change the corresponding data on the cluster out-of-band (e.g. via `kubectl`), then return to the app **without** triggering a manual refetch or window refocus.
3. **Expected (bug present):** the UI keeps showing the previous value for up to 3 minutes (`staleTime`) before React Query considers it stale.
4. **Expected (after a shorter `staleTime`):** the data is considered stale and refetched sooner. Note: real-time resource lists use WebSockets (`useKubeObjectList`) and are unaffected by this setting.

---

## Additional Bugs Found in the Deeper Sweep

These were missed by the first pass because it stopped at the obvious app-shell components and never inspected the `lib/k8s/api/v2` data layer or the per-resource widgets.

### 🟠 BUG #11 — HIGH: Conditional hook call in `AuthVisible`

**File:** `components/common/Resource/AuthVisible.tsx:59-68`
**Code:**
```typescript
if (!VALID_AUTH_VERBS.includes(authVerb)) {
  console.warn(`Invalid authVerb provided: "${authVerb}". Skipping authorization check.`);
  return null;            // early return…
}
// …
// eslint-disable-next-line react-hooks/rules-of-hooks
const { data } = useQuery<any>({ /* … */ });   // …hook called after a possible return
```

**Problem:** `useQuery` (and the `useEffect` below it) are called **after** a conditional `return null`. This violates the Rules of Hooks — if `authVerb` is sometimes valid and sometimes not for the same mounted component, the hook order changes between renders and React will throw. The `eslint-disable react-hooks/rules-of-hooks` comments suppress the warning that is correctly flagging a real bug.

**Impact:** Potential "rendered fewer hooks than expected" crashes; at minimum, fragile code that defeats the linter.

**Fix:** Move the `authVerb` validation into the `enabled` flag / `queryFn` so the hooks are always called unconditionally.

**Manual test steps:**
1. In `AuthVisible.tsx`, temporarily remove the `// eslint-disable-next-line react-hooks/rules-of-hooks` comments and run `npm run frontend:lint` — the linter should flag the conditional hook call.
2. To exercise at runtime: render an `AuthVisible` whose `authVerb` prop **changes between a valid and an invalid verb** across renders (a valid verb makes the hooks run; an invalid verb hits the early `return null`).
3. **Expected (bug present):** React logs/throws "rendered fewer hooks than expected" (or "rendered more hooks") because the hook count changes between renders.
4. **Expected (after fix):** the hooks are always called; the verb validation is handled via `enabled`/inside `queryFn`, and lint passes without the disable comments.

**Test coverage:** ❌ No test.

---

### 🟠 BUG #12 — HIGH: `cluster` missing from the `authVisible` query key

**File:** `components/common/Resource/AuthVisible.tsx:70-85`
**Code:**
```typescript
queryKey: ['authVisible', itemName, itemClass.apiName, itemClass.apiVersion, authVerb, subresource, namespace],
queryFn: async () => item!.getAuthorization(authVerb, { subresource, namespace }, (item as any).cluster),
```

**Problem:** The authorization request is scoped to `(item as any).cluster`, but `cluster` is **not** part of the query key. Two items with the same name/apiName/apiVersion/verb in **different clusters** collide on the same cache entry. The first cluster's RBAC result is served for the second cluster.

**Impact:** Incorrect RBAC gating across clusters — a user could see (or be denied) actions based on a *different* cluster's permissions. This is a correctness/security-relevant bug, not just a performance one.

**Contrast:** `ScaleMultipleButton.tsx:90-96` does the same RBAC check but **correctly** includes `(item as any).cluster` in its key, confirming the omission in `AuthVisible` is a bug.

**Manual test steps:**
1. Run `npm start` with two clusters (A and B) that contain a resource with the **same name, apiName, and apiVersion** but **different RBAC permissions** for your user (allowed in A, denied in B).
2. Navigate to that resource in cluster **A** first and confirm the `AuthVisible`-gated UI (e.g. an action button) appears.
3. Without reloading, navigate to the same-named resource in cluster **B**.
4. **Expected (bug present):** cluster B serves cluster A's cached RBAC result (key omits `cluster`), so the gated UI wrongly appears (or wrongly hides) based on A's permissions.
5. **Expected (after fix, `cluster` in key):** each cluster gets its own cache entry and the correct permission is reflected.

**Test coverage:** ❌ No test.

---

### 🟠 BUG #13 — HIGH: WebSocket updates drop the `cluster` field

**File:** `lib/k8s/api/v2/hooks.ts:172,193` (compare with `:153`)
**Code:**
```typescript
// initial fetch — cluster is passed:
return new kubeObjectClass(obj, cluster) as Instance;          // line 153
// live WebSocket update — cluster is NOT passed:
client.setQueryData(queryKey, new kubeObjectClass(update.object));   // lines 172 & 193
```

**Problem:** The initial `queryFn` constructs the object **with** `cluster`, but both WebSocket `onMessage` handlers reconstruct it **without** `cluster`. After the first live update, the cached object loses its `cluster` association.

**Impact:** Any code relying on `kubeObject.cluster` (links, detail navigation, multi-cluster views, the `Link.tsx` prefetch key below) breaks after the first WebSocket update — intermittently and hard to reproduce, since it only manifests once an object changes server-side.

**Fix:** Pass `cluster` in both handlers: `new kubeObjectClass(update.object, cluster)`.

**Manual test steps:**
1. Run `npm start` and open a detail view for a single object (e.g. a specific Pod) so the `useGet`/`useWatch` query in `hooks.ts` is active.
2. In DevTools console, inspect the cached object's `.cluster` field (or add a temporary `console.log(kubeObject.cluster)` in a child component / the `Link.tsx` prefetch).
3. Trigger a server-side change to that object (e.g. `kubectl label pod ...`) so a WebSocket `MODIFIED` update arrives.
4. **Expected (bug present):** after the update, the cached object's `.cluster` becomes `undefined`, and any link/navigation relying on it produces a wrong/empty cluster.
5. **Expected (after fix):** `.cluster` is preserved across WebSocket updates.

**Test coverage:** ❌ No test exercises the WebSocket update path's cluster propagation.

---

### 🟠 BUG #14 — HIGH: Side effects + self-referential stale closure in `VersionButton`

**File:** `components/Sidebar/VersionButton.tsx:81-120`
**Code:**
```typescript
const { data: clusterVersion } = useQuery<StringDict | null>({
  queryKey: ['version', cluster ?? ''],
  queryFn: () => getVersion().then(results => {
    if (clusterVersion && results?.gitVersion) {            // reads its own query data
      versionChange = semver.compare(results.gitVersion, clusterVersion.gitVersion);
      // …
      enqueueSnackbar(msg, { /* … */ });                    // side effect inside queryFn
    }
    return results;
  }),
  refetchInterval: versionFetchInterval,
});
```

**Problem:** Two issues compound here:
1. **Side effect in `queryFn`:** `enqueueSnackbar(...)` fires from inside the fetch. The "version upgraded/downgraded" snackbar is therefore tied to React Query's internal refetch/retry mechanics, not to a clean comparison of old vs new data. Retries (default 3) could fire multiple snackbars for a single real change.
2. **Self-referential stale closure:** the `queryFn` reads `clusterVersion` — the very value the query is producing. The `clusterVersion` captured in the closure is the value from the render that created this `queryFn`, which can be stale relative to the actual previous cache value. Comparing "new vs old" version this way is unreliable.

**Impact:** Missed, duplicated, or incorrect "version changed" notifications. Mirrors BUG #1 (`Layout.tsx`): a polling `queryFn` performing side effects instead of returning pure data.

**Fix:** Return data only from `queryFn`; compute the version delta and call `enqueueSnackbar` in a `useEffect` keyed on `clusterVersion`, comparing against a `useRef` of the previous value.

**Manual test steps:**
1. Run `npm start` against a cluster. Open the sidebar version button so the `['version', cluster]` query is active (it polls on `versionFetchInterval`).
2. To force a "version changed" path, temporarily make `getVersion` return a different `gitVersion` on the second call (e.g. stub it), or point at a cluster whose reported version you can change.
3. To exercise the retry interaction, make the first `getVersion` attempt reject so React Query retries.
4. **Expected (bug present):** the "Cluster version upgraded/downgraded" snackbar fires from inside `queryFn`, and can appear multiple times for one real change (once per retry) or use a stale previous-version value for the comparison.
5. **Expected (after fix):** exactly one snackbar per actual version change, computed in a `useEffect` against a `useRef` of the previous value, unaffected by retries.

**Test coverage:** ❌ No test.

---

### 🟡 BUG #15 — MEDIUM: Stale `queryKey` memo drops `cluster` and `queryParams`

**File:** `lib/k8s/api/v2/hooks.ts:131-136`
**Code:**
```typescript
const queryKey = useMemo(
  () => kubeObjectQueryKey({ cluster, name, namespace, endpoint, queryParams: cleanedUpQueryParams }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [endpoint, namespace, name]
);
```

**Problem:** The key is computed from `cluster`, `endpoint`, `namespace`, `name`, **and** `cleanedUpQueryParams`, but the `useMemo` dependency array only lists `[endpoint, namespace, name]`. If `cluster` or `queryParams` change while `endpoint/namespace/name` stay constant, the memoized `queryKey` does **not** update — so the query reads/writes the wrong cache entry. The `exhaustive-deps` disable hides this.

**Impact:** Stale or cross-cluster data for single-object fetches when only the cluster or query params change. Also propagates to the WebSocket `setQueryData` calls (#13), which write to the stale key.

**Manual test steps:**
1. Run `npm start`. Add a temporary `console.log('queryKey', queryKey)` next to the `useMemo` in `hooks.ts`.
2. Render a single-object view, then change **only** the `cluster` (or a query param) while keeping `endpoint`, `namespace`, and `name` the same — e.g. view the same-named resource in another cluster.
3. **Expected (bug present):** the logged `queryKey` does **not** change (the `useMemo` deps omit `cluster`/`queryParams`), so the query reads/writes the wrong cache entry and may display the previous cluster's object.
4. **Expected (after fix, full deps):** the `queryKey` updates whenever `cluster` or query params change.

**Test coverage:** ❌ No test.

---

### 🟡 BUG #16 — MEDIUM: Inconsistent, non-shared RBAC/auth query keys

**Files:** `RouteSwitcher.tsx:170`, `AuthVisible.tsx:68`, `ScaleMultipleButton.tsx:88`, `TopBar.tsx:299`, `auth.ts`

**Problem:** The app performs auth/RBAC lookups under at least four unrelated key shapes:
- `['auth', cluster]` (RouteSwitcher)
- `['authVisible', name, apiName, apiVersion, verb, subresource, namespace]` (AuthVisible — no cluster, see #12)
- `['scaleMultiple:auth', cluster, namespace, name, kind]` (ScaleMultipleButton)
- `['clusterMe', clusterName]` (TopBar / auth.ts)

These overlap conceptually (all are "what can this user do") but share no cache and follow no common key convention. `logout()`'s `removeQueries({ queryKey: ['auth'], exact: false })` (BUG #5) only clears the first shape — `authVisible`, `scaleMultiple:auth`, and `clusterMe` entries survive a logout.

**Impact:** Redundant RBAC requests for the same resource viewed through different components; stale authorization data lingering in the cache after logout. A consistent key convention (e.g. `['auth', cluster, ...]`) would enable cache sharing and make invalidation reliable.

**Manual test steps:**
1. Run `npm start` and open React Query DevTools (or log query keys).
2. View a single resource that triggers an `AuthVisible` check, and also open a list/scale view that triggers `ScaleMultipleButton`'s `['scaleMultiple:auth', ...]` check, plus the top-bar `['clusterMe', ...]` query.
3. **Expected (bug present):** several distinct cache entries (`authVisible`, `scaleMultiple:auth`, `clusterMe`, `auth`) exist for what is conceptually the same "what can this user do" question — no sharing.
4. Now log out and re-inspect the cache.
5. **Expected (bug present):** only `['auth', ...]` entries are cleared by `removeQueries({ queryKey: ['auth'], exact: false })`; `authVisible`/`scaleMultiple:auth`/`clusterMe` entries survive logout.
6. **Expected (after fix, unified convention):** RBAC entries share keys where possible and are all cleared on logout.

**Test coverage:** ❌ No test covers cross-component auth cache behavior.

---

### 🟡 BUG #17 — MEDIUM: `AuthVisible` `queryFn` swallows errors into `undefined`

**File:** `components/common/Resource/AuthVisible.tsx:79-91`
**Code:**
```typescript
queryFn: async () => {
  try {
    return await item!.getAuthorization(authVerb, { subresource, namespace }, (item as any).cluster);
  } catch (e: any) {
    onError?.(e);          // calls back, then implicitly returns undefined
  }
},
```

**Problem:** On failure the `catch` calls `onError` and returns `undefined`. React Query therefore treats the query as **successful** with `data === undefined`, so `isError`/`error` are never set and the query is cached as a successful empty result. The component falls through to `visible = false` (hides children), conflating "explicitly denied" with "the check failed". Calling `onError` inside `queryFn` is also a side effect (same anti-pattern as #1/#14).

**Impact:** Auth-check failures are silently treated as "not allowed" and cached as success, so React Query won't retry them as errors. Users may have UI hidden due to a transient network error with no error surfaced.

**Manual test steps:**
1. Run `npm start` and open a view that renders `AuthVisible`-gated children.
2. In DevTools → Network, block (or fail) the `getAuthorization`/SelfSubjectAccessReview request so it rejects.
3. Pass an `onError` callback and observe it firing.
4. **Expected (bug present):** despite the failure, the query reports success with `data === undefined`, `isError` stays `false`, the gated children are hidden (treated as "denied"), and React Query does not retry it as an error.
5. **Expected (after fix):** the error propagates (`isError`/`error` set), the failure is distinguishable from an explicit deny, and retries apply.

**Test coverage:** ❌ No test.

---

### 🟢 BUG #18 — LOW: `Link.tsx` prefetch can write to the wrong key

**File:** `components/common/Link.tsx:65-82`
**Code:**
```typescript
const { endpoint } = useEndpoints(kubeObject._class().apiEndpoint.apiInfo, kubeObject.cluster);
// …
const key = kubeObjectQueryKey({ cluster: kubeObject.cluster, endpoint, namespace, name });
client.setQueryData(key, kubeObject);
client.invalidateQueries({ queryKey: key });
```

**Problem:** When the resource has multiple candidate endpoints, `useEndpoints` resolves `endpoint` asynchronously (BUG context: `enabled: endpoints.length > 1`). If the user clicks the link before probing finishes, `endpoint` is `undefined` and `key` differs from the key the detail page will actually use — so the prefetch is wasted and `invalidateQueries` targets a phantom entry. Combined with #13, an object whose `cluster` was dropped by a WebSocket update would also produce a mismatched key here.

**Impact:** Lost prefetch optimization (extra fetch on the detail page) in the multi-endpoint case. Low severity — purely a performance optimization that silently no-ops.

**Manual test steps:**
1. Run `npm start` and open a list of a resource type that has **multiple candidate endpoints** (so `useEndpoints` must probe; `enabled: endpoints.length > 1`).
2. In DevTools → Network, throttle to "Slow 3G" so endpoint probing is still in flight, then **immediately** click a `KubeObjectLink` for one of the items.
3. Watch the Network tab on the detail page.
4. **Expected (bug present):** because `endpoint` was still `undefined` at click time, the prefetch wrote to a mismatched key and the detail page issues its own GET anyway (prefetch wasted); `invalidateQueries` targeted a phantom key.
5. **Expected (after fix):** the prefetch key matches the detail page's key, so no redundant fetch occurs.

**Test coverage:** ❌ No test.

---

## The Two-State-Store Problem

The most important structural finding is not any single bug but a pattern: **Headlamp maintains two independent client-side state stores that hold overlapping data — Redux and the React Query cache — with no single source of truth.**

### Where the two stores overlap

- **Cluster config** lives in Redux (`config` reducer, `reducers.tsx:44`) *and* is the payload of the `['cluster-fetch']` React Query (`Layout.tsx:216`). The query's `queryFn` (`fetchConfig`) doesn't just return data — it `dispatch`es `setConfig`/`applyBackendThemeConfig` into Redux (`Layout.tsx:153-182`) and reads `store.getState().config` directly (`Layout.tsx:138-139`).
- **Theme** lives in Redux (`theme` reducer) but is mutated from the same config `queryFn`.
- **Kubernetes objects/lists** live in the React Query cache (`lib/k8s/api/v2`), while UI concerns about them (filters, selected namespaces, resource-table state) live in Redux (`filter`, `resourceTable`, `graphView` reducers).

### Why two stores cause problems

1. **No single source of truth.** For cluster config, Redux is authoritative but React Query also caches the same payload. The two can diverge — e.g. if a `dispatch` is skipped (the `configDifferent` short-circuit at `Layout.tsx:156-172` only dispatches on change) while React Query still holds the full fetched object. Consumers reading `state.config` vs the query's `data` can see different values.

2. **`queryFn` becomes a write path, not a read path.** Because the only way to get data *into* Redux is to fetch it, the fetch function is forced to perform `dispatch` side effects (BUG #1, #14, #17). This breaks React Query's mental model: `queryFn` should be pure. Every refetch on the 10s interval re-dispatches, every retry re-dispatches, and tests can't exercise the fetch without a Redux store.

3. **Invalidation has to be done twice.** Logout must clear Redux *and* the React Query cache (`auth.ts:142-143`), and the two cleanups are not symmetric (BUG #5, #6). Forgetting one leaves the app in a half-logged-out state.

4. **Dependency tracking is bypassed.** React Query can't see Redux as a dependency. `fetchConfig` reading `store.getState()` (BUG #7) and the stale `queryKey` memo (BUG #15) both stem from data flowing through Redux that React Query has no way to react to. The code "works" only because of the polling interval.

5. **Cross-store races.** WebSocket updates write directly to the React Query cache (`setQueryData`, BUG #13) while Redux-driven filters/selections re-render the same components, creating ordering-dependent UI states that are hard to reason about and test.

### Direction (not a change request — observation only)

Most of the high/critical bugs in this report are symptoms of this overlap. Picking **one** owner per piece of state would dissolve the class of bug:
- Treat the React Query cache as the source of truth for *server* state (config, version, objects, lists, RBAC), and let components select from it directly instead of mirroring into Redux.
- Keep Redux for *client/UI* state only (filters, sidebar, selected namespaces, drawer mode).
- Make every `queryFn` pure; move `dispatch`/snackbar side effects into `useEffect`s keyed on the query result.

This report stops at documenting the problem; no code change is proposed here.

---

## Shared Query Key: `['api-discovery', ...selectedClusters]`

**Files:** `AdvancedSearch.tsx:75` and `sources.tsx:142`

**Analysis:** Both files use the **exact same query key and query function** (`apiDiscovery([...selectedClusters])`). This means they **intentionally share the cache** — React Query deduplicates the request. This is actually **correct behavior**, not a cache collision bug. Both components need the same data and benefit from sharing the cache entry.

**However**, the shared key makes the array-order bug (#4) doubly important: if one component sorts clusters differently than the other, they'll create duplicate cache entries.

---

## Test Coverage Summary

| # | File | Query Key | Has Test? | Test File | Notes |
|---|------|-----------|-----------|-----------|-------|
| 1 | `Layout.tsx` | `['cluster-fetch']` | ❌ | — | No test at all for Layout |
| 2 | `RouteSwitcher.tsx` | `['auth', cluster]` | ✅ | `RouteSwitcher.test.tsx` | Tests auth query with proper QueryClient isolation |
| 3 | `TopBar.tsx` | `['clusterMe', name]` | ⚠️ | `TopBar.stories.tsx` | Storybook only; story comments note cache issues between stories |
| 4 | `AdvancedSearch.tsx` | `['api-discovery', ...]` | ❌ | — | No test for the query |
| 5 | `sources.tsx` | `['api-discovery', ...]` | ❌ | — | No test or story |
| 6 | `queryClient.ts` | N/A (config) | ❌ | — | No test for config |
| 7 | `auth.ts` | `['clusterMe']`, `['auth']` | ⚠️ | `auth.test.ts` | Tests exist but don't cover React Query interactions |
| 8 | `authchooser/index.tsx` | `['clusterMe']` | ❌ | — | Storybook stories exist but don't test query invalidation |
| 9 | `hooks.ts` (useGet/useWatch) | `kubeObjectQueryKey(...)` | ⚠️ | `hooks.test.tsx` | Tests exist; do not cover WebSocket `setQueryData` cluster propagation (#13) or the stale key memo (#15) |
| 10 | `hooks.ts` (useEndpoints) | `['endpoints', ...]` | ⚠️ | `hooks.test.tsx` | Partial |
| 11 | `useKubeObjectList.ts` | `kubeObjectListQuery(...)` | ✅ | `useKubeObjectList.test.tsx` | Creates its own QueryClient; good isolation |
| 12 | `VersionButton.tsx` | `['version', cluster]` | ❌ | — | No test for snackbar side effect / self-referential closure |
| 13 | `AuthVisible.tsx` | `['authVisible', ...]` | ❌ | — | No test; cluster missing from key (#12), conditional hook (#11), swallowed errors (#17) |
| 14 | `ScaleMultipleButton.tsx` | `['scaleMultiple:auth', ...]` | ❌ | — | No test for per-item RBAC query |
| 15 | `Link.tsx` | `kubeObjectQueryKey(...)` | ❌ | — | No test for prefetch key correctness (#18) |

**Coverage rate:** 2 out of 13 query usage sites have proper test coverage (`RouteSwitcher.test.tsx`, `useKubeObjectList.test.tsx`). `hooks.ts` has partial coverage that misses the WebSocket/cluster-key bugs. TopBar has partial coverage via Storybook stories only.

---

## Recommendations (Priority Order)

1. **Layout.tsx queryFn side effects (Bug #1):** Extract dispatch logic into a `useEffect` that watches the query's `data` value. Make `queryFn` return data only.
2. **AdvancedSearch.tsx error handling (Bug #2):** Destructure and display `error`/`isError` from the query result.
3. **Add `enabled` guards (Bug #3):** Add `enabled: selectedClusters.length > 0` to both AdvancedSearch and sources.tsx queries.
4. **Sort cluster arrays in query keys (Bug #4):** Use `[...selectedClusters].sort()` in query keys.
5. **Fix broad auth removal (Bug #5):** Change `exact: false` to `exact: true` or use a more targeted key prefix.
6. **Add tests:** Prioritize Layout.tsx and AdvancedSearch.tsx query behavior tests.
7. **Add `cluster` to the `authVisible` key (Bug #12)** and **pass `cluster` to WebSocket-side `setQueryData` (Bug #13)** — both are correctness bugs affecting multi-cluster use.
8. **Fix the conditional hook in `AuthVisible` (Bug #11)** and the **stale `queryKey` memo in `hooks.ts` (Bug #15)** rather than suppressing the lint rules that flag them.
9. **Pick one owner per piece of state (Two-State-Store Problem):** make `queryFn`s pure and move `dispatch`/snackbar side effects (Bugs #1, #14, #17) into `useEffect`s keyed on query results.
