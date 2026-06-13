# React Query Audit Report

> **Date:** 2026-06-13
> **Scope:** All `@tanstack/react-query` usage in `frontend/src/`
> **Files audited:** 8 files (4 with `useQuery`/`useQueries`, 1 QueryClient config, 3 with imperative `queryClient.*` calls)

---

## Executive Summary

The codebase has **6 distinct React Query usage sites**. Of these, **only 2 have dedicated tests** that exercise the query behavior. The audit found **4 high/critical issues** and **9 medium/low issues**. The most impactful bugs are a side-effect-producing `queryFn` in Layout.tsx, and missing `enabled` guards and error handling in the AdvancedSearch component.

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

**Test coverage:** ❌ No test covers this query.

---

### 🟠 BUG #3 — HIGH: Missing `enabled` guard when clusters are empty

**File:** `components/advancedSearch/AdvancedSearch.tsx:73` and `components/resourceMap/sources/definitions/sources.tsx:140`

**Problem:** Both queries call `apiDiscovery([...selectedClusters])` without an `enabled: selectedClusters.length > 0` guard. When no clusters are selected (e.g., on first load before cluster selection), the query fires with an empty array, triggering an unnecessary API call.

**Impact:** Wasted network request on load. If `apiDiscovery([])` returns unexpected results or errors, it may cause downstream issues.

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

**Test coverage:** ⚠️ Partially mitigated — key test files create their own clients.

---

### 🟢 BUG #9 — LOW: No explicit `gcTime` in global config

**File:** `lib/queryClient.ts:20-24`

**Problem:** Without explicit `gcTime`, React Query uses the default (5 minutes). In a long-running Headlamp session with many cluster navigations, inactive queries accumulate in memory for 5 minutes each.

**Impact:** Minor memory overhead in long sessions. Not a practical issue for most users.

---

### 🟢 BUG #10 — LOW: `staleTime: 3 * 60_000` may be too long for Kubernetes data

**File:** `lib/queryClient.ts:22`

**Problem:** Kubernetes resources can change frequently (pods scaling, deployments rolling out). A 3-minute stale time means users may see outdated data. However, this only affects React Query–managed queries — the primary Kubernetes resource watchers use WebSockets (via `useKubeObjectList`), which are not affected by this setting.

**Impact:** Low — only affects the `cluster-fetch`, `auth`, `api-discovery`, and `clusterMe` queries, not real-time resource data.

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

**Coverage rate:** 1 out of 6 query usage sites has proper test coverage (17%).

---

## Recommendations (Priority Order)

1. **Layout.tsx queryFn side effects (Bug #1):** Extract dispatch logic into a `useEffect` that watches the query's `data` value. Make `queryFn` return data only.
2. **AdvancedSearch.tsx error handling (Bug #2):** Destructure and display `error`/`isError` from the query result.
3. **Add `enabled` guards (Bug #3):** Add `enabled: selectedClusters.length > 0` to both AdvancedSearch and sources.tsx queries.
4. **Sort cluster arrays in query keys (Bug #4):** Use `[...selectedClusters].sort()` in query keys.
5. **Fix broad auth removal (Bug #5):** Change `exact: false` to `exact: true` or use a more targeted key prefix.
6. **Add tests:** Prioritize Layout.tsx and AdvancedSearch.tsx query behavior tests.
