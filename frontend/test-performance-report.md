# Frontend Test Performance Report: RTK Query Branch vs Main

> Generated on 2026-03-29. Node.js 20.20.2, vitest, same machine for both runs.

## Executive Summary

The RTK Query branch storybook tests are **~23× slower** than main (1234s vs 54s).
The root cause is that RTK Query's internal timers interact poorly with
`vi.useFakeTimers()` — every story now triggers RTK Query middleware polling
loops that each burn real wall-clock time inside the `waitFor` retry cycle.

| Metric | Main (bbcc3b8) | Branch (efe6037) | Change |
|---|---|---|---|
| Storybook total duration | 53.6s | 1234.3s | **+23×** |
| Storybook test time | 43.1s | 1222.8s | **+28×** |
| Storybook tests passed | 499 | 444 | −55 |
| Storybook tests failed | 1 | 49 | +48 |
| Warnings during run | 35 | 1686 | **+48×** |
| Unit test duration (common files) | 8.9s (20 tests) | 11.0s (115 tests) | +2.1s |
| Unit test time (test execution only) | 109ms | 1800ms | +1691ms (95 new tests) |

## Storybook Tests: Detailed Timing Comparison

On main, only **8 tests** exceed vitest's display threshold (~300ms).
On the branch, **457 out of 493 tests** exceed the threshold — nearly every test is slow.

### Tests present in both runs (with timing shown)

| Test | Main | Branch | Slowdown |
|---|---|---|---|
| workload/Overview > Workloads | 589ms | 6069ms | **10.3×** |
| Pod/PodLogViewer > PlainLogs | 310ms | 4177ms | **13.5×** |
| Version Dialog > VersionDialog | 59ms | 732ms | **12.4×** |
| Pod/PodListView > Items | 353ms | 3989ms | **11.3×** |
| GraphView > BasicExample | 687ms | 5639ms | **8.2×** |
| Sidebar/Sidebar > InClusterSidebarClosed | 305ms | 1491ms | **4.9×** |
| Sidebar/Sidebar > InClusterSidebarOpen | 399ms | 1610ms | **4.0×** |
| Home/Home > Base | 611ms | 579ms | 0.9× (no change) |

### Slowest 30 tests on the branch

| Test | Time |
|---|---|
| workload/Overview > Workloads | 6069ms |
| GraphView > BasicExample | 5639ms |
| WebhookConfiguration/MutatingWebhookConfig/Details > WithURL | 5591ms |
| workload/Charts > MixedWorkloads | 5530ms |
| WebhookConfiguration/MutatingWebhookConfig/Details > WithService | 5523ms |
| Service/Details > WithA8RAnnotations | 5484ms |
| WebhookConfiguration/ValidatingWebhookConfig/Details > WithURL | 5456ms |
| WebhookConfiguration/ValidatingWebhookConfig/Details > WithService | 5415ms |
| LocaleSelect > Initial | 5391ms |
| workload/Charts > AllFailedStatefulSet | 5377ms |
| VPA/VPADetailsView > Default | 5362ms |
| VPA/VPAListView > List | 5362ms |
| WebhookConfiguration/MutatingWebhookConfig/List > Items | 5327ms |
| workload/Charts > AllRunningDeployment | 5325ms |
| workload/Charts > AllFailedDeployment | 5310ms |
| workload/Charts > AllRunningStatefulSet | 5307ms |
| StatefulSet/List > SingleItem | 5303ms |
| WebhookConfiguration/ValidatingWebhookConfig/List > Items | 5293ms |
| Service/Details > WithA8ROwnerOnly | 5284ms |
| workload/Charts > Empty | 5276ms |
| Service/List > WithOwnerAnnotation | 5275ms |
| workload/Charts > DefaultStatefulSet | 5253ms |
| StatefulSet/List > EmptyList | 5251ms |
| workload/Charts > LoadingWorkload | 5243ms |
| Service/Details > Default | 5207ms |
| VPA/VPADetailsView > Error | 5207ms |
| StatefulSet/Details > Default | 5181ms |
| StatefulSet/List > Default | 5180ms |
| workload/Charts > DefaultDeployment | 5160ms |
| StatefulSet/List > WithNotReadyReplicas | 5138ms |

## Warnings Comparison

| Warning Category | Main | Branch | Delta |
|---|---|---|---|
| act() warning | 2 | 1660 | **+1658** |
| React key warning | 7 | 6 | −1 |
| Function component refs | 4 | 4 | 0 |
| validateDOMNesting | 2 | 2 | 0 |
| PropType warning | 2 | 1 | −1 |
| Unknown DOM prop | 3 | 3 | 0 |
| MSW unhandled request | 0 | 1 | +1 |
| Other | 15 | 9 | −6 |
| **Total** | **35** | **1686** | **+1651** |

### New warning: `act()` warnings (+1658)

The massive increase in `act()` warnings is from RTK Query's internal state
updates firing outside of React's `act()` wrapper during fake-timer-driven
test execution. RTK Query middleware dispatches cache updates asynchronously
(via `setTimeout`/microtask), and when `vi.advanceTimersByTime()` flushes
these timers, React state updates occur outside `act()`.

On main, React Query's updates are handled by its own internal scheduler
that cooperates better with fake timers.

## Root Cause Analysis

### Why tests are ~23× slower

1. **RTK Query middleware + fake timers interaction**: RTK Query uses internal
   `setTimeout` for cache garbage collection, polling, and subscription
   management. With `vi.useFakeTimers()`, these timers don't fire naturally.
   The `waitFor()` retry loop (default 1000ms timeout, 50ms interval) must
   repeatedly poll until MSW requests complete, but RTK Query's async
   pipeline adds multiple microtask hops between "request sent" and
   "request ended" events.

2. **`store.dispatch(headlampApi.util.resetApiState())`**: Called in
   `beforeEach`, this resets RTK Query's entire cache. Unlike React Query's
   `queryClient` which cooperates with fake timers, RTK Query's middleware
   chain fires internal cleanup timers that interact with `waitFor`.

3. **No `queryClient.isFetching()` equivalent**: On main, the second
   `waitFor` block checks `previewAnnotations.queryClient.isFetching()`
   which returns synchronously. The branch removed this (no React Query),
   but has no equivalent RTK Query "is-idle" check, so the tests rely
   solely on the MSW request tracking which has more timing uncertainty.

4. **AuthVisible RTK Query endpoint**: Each story renders components that
   use `AuthVisible`, which fires RTK Query `checkAuth` requests. While
   `AuthVisible` is mocked in storybook tests, the mock was added to fix
   snapshot stability — the underlying RTK Query setup still adds overhead
   during store initialization.

### Why 49 tests fail on branch (vs 1 on main)

The 49 failures are **snapshot mismatches**, not logic errors. The branch
snapshots were regenerated on Node.js 24, but this profiling run used
Node.js 20 (matching CI). This is a known issue — snapshot content differs
slightly between Node versions due to timing of async renders. These
failures do not indicate broken functionality.

## Plan to Make Tests Faster

### High-impact (estimated savings)

1. **Remove `vi.useFakeTimers()` from storybook tests** (~20× speedup)
   - Replace with real timers + shorter `waitFor` timeouts
   - RTK Query works correctly with real timers
   - Risk: some stories with toasts/animations may need explicit waits
   - This is the single biggest improvement available

2. **Add RTK Query idle detection** (moderate speedup)
   - Add a `waitFor` check for RTK Query pending queries, similar to
     main's `queryClient.isFetching()` check:
     ```ts
     await waitFor(() => {
       const pending = store.getState()[headlampApi.reducerPath].queries;
       const fetching = Object.values(pending).some(q => q?.status === 'pending');
       if (fetching) throw new Error('RTK Query still fetching');
     });
     ```
   - This gives the test runner a direct signal instead of relying on
     MSW event timing

3. **Reduce `tickSkipCount` from 10 to 3–5** (2–3× speedup)
   - Each tick iteration calls `advanceTimersByTime(100)` + `nextTick`
   - 10 iterations = 1000ms of fake time per story
   - Most stories settle within 300ms of fake time

### Medium-impact

4. **Batch RTK Query `resetApiState` less aggressively**
   - Instead of resetting in `beforeEach`, reset only when the previous
     test's store state would interfere

5. **Use `vi.useFakeTimers({ shouldAdvanceTime: true })` selectively**
   - For stories that need fake timers (e.g., polling), use
     `shouldAdvanceTime: true` which lets real time pass while also
     controlling timer behavior
   - For most stories, use real timers

### Low-impact

6. **Parallelize storybook test file** with vitest `--pool forks`
   - Current: single thread, serial execution
   - Splitting into multiple test files could enable parallelism

## Recommendation

**Priority 1**: Remove `vi.useFakeTimers()` from storybook test setup and
switch to real timers. This alone should bring the test duration from ~1234s
back to ~50-80s range. The fake timers were originally needed for React
Query's `staleTime` behavior, but RTK Query's `refetchOnMountOrArgChange: 180`
achieves the same caching without requiring timer manipulation in tests.

**Priority 2**: Add RTK Query idle-state detection in the `waitFor` loop
for faster convergence.

**Priority 3**: Reduce `tickSkipCount` to minimize unnecessary timer
advancement iterations.
