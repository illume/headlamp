# ResourceMap Performance Optimization - Atomic Commit Plan

## Overview

This document outlines the 30 atomic commits to rebuild the ResourceMap performance optimization with clean, reviewable history.

**Key Principles**:
- Testing infrastructure and Storybook components go FIRST (makes performance improvements visible)
- Each optimization is a separate commit WITH its tests included
- Full quality checks (lint, format, test, type, snapshots) before EACH commit
- Logical progression shows incremental performance improvements

---

## Commit Sequence (30 Atomic Commits)

### Phase 1: Testing Infrastructure First (Commits 1-5)

**Commit 1: Add PerformanceStats UI component with SSR safety**
- Files: `frontend/src/components/resourceMap/PerformanceStats.tsx`
- Add real-time metrics panel (avg/min/max/count)
- Include SSR guards (`typeof window !== 'undefined'`)
- Add global performance metric API (addPerformanceMetric, getLatestMetrics, clearPerformanceMetrics)
- Quality: lint ✓ format ✓ type ✓ test ✓ snapshots ✓

**Commit 2: Add performance instrumentation to graph modules**
- Files: `frontend/src/components/resourceMap/graph/graphFiltering.ts`, `graphGrouping.tsx`, `graphLayout.tsx`
- Add `window.__HEADLAMP_DEBUG_PERFORMANCE__` debug flag
- Gate console.log calls with debug flag
- Add addPerformanceMetric calls for all operations
- Quality: lint ✓ format ✓ type ✓ test ✓

**Commit 3: Add Storybook performance test: 500 pods**
- Files: `frontend/src/components/resourceMap/GraphView.stories.tsx`
- Add PerformanceTest500Pods story
- Add generateMockPods helper function
- Add basic controls (Trigger Update button)
- Quality: lint ✓ format ✓ type ✓ snapshots ✓

**Commit 4: Add Storybook performance test: 2000 pods**
- Files: `frontend/src/components/resourceMap/GraphView.stories.tsx`
- Add PerformanceTest2000Pods story
- Add generateMockDeployments helper
- Add generateMockReplicaSets helper
- Add generateMockPodsForDeployments helper
- Add generateMockServices helper
- Quality: lint ✓ format ✓ type ✓ snapshots ✓

**Commit 5: Add Storybook performance tests: 5000, 20000, 100k pods**
- Files: `frontend/src/components/resourceMap/GraphView.stories.tsx`
- Add PerformanceTest5000Pods story
- Add PerformanceTest20000Pods story
- Add PerformanceTest100000Pods story
- Realistic resource ratios (50 namespaces, 20k Deployments, 3k Services)
- Quality: lint ✓ format ✓ type ✓ snapshots ✓

### Phase 2: Core Algorithm Optimizations (Commits 6-10)

**Commit 6: Convert filterGraph from recursive DFS to iterative BFS**
- Files: `frontend/src/components/resourceMap/graph/graphFiltering.ts`
- Replace recursive DFS with iterative BFS using index-based queue
- Add inline performance comments explaining why (stack overflow, O(1) vs O(n))
- Add benchmarks in comments (44% faster, 24% less memory)
- Quality: lint ✓ format ✓ type ✓ test ✓

**Commit 7: Add unit tests for filterGraph iterative BFS**
- Files: `frontend/src/components/resourceMap/graph/graphFiltering.test.ts`
- Add 2 existing tests (namespace filter, error filter)
- Validate correctness of iterative implementation
- Quality: lint ✓ format ✓ type ✓ test ✓

**Commit 8: Convert getConnectedComponents to iterative BFS**
- Files: `frontend/src/components/resourceMap/graph/graphGrouping.tsx`
- Replace recursive DFS with iterative BFS using index-based queue
- Add inline performance comments
- Quality: lint ✓ format ✓ type ✓ test ✓

**Commit 9: Add React Flow rendering optimizations**
- Files: `frontend/src/components/resourceMap/GraphRenderer.tsx`
- Add fitView({duration:0, padding:0.1})
- Add nodesDraggable={false} nodesConnectable={false}
- Add translateExtent with single-pass loop bounds calculation
- Disable keyboard handlers (deleteKeyCode={null})
- Add inline performance comments with benchmarks
- Quality: lint ✓ format ✓ type ✓ test ✓

**Commit 10: Integrate PerformanceStats into GraphView**
- Files: `frontend/src/components/resourceMap/GraphView.tsx`
- Add Performance Stats button to UI
- Add state for showing/hiding stats panel
- Wire up PerformanceStats component
- Quality: lint ✓ format ✓ type ✓ snapshots ✓

### Phase 3: Graph Simplification (Commits 11-15)

**Commit 11: Add graph simplification module with importance scoring**
- Files: `frontend/src/components/resourceMap/graph/graphSimplification.ts`
- Add simplifyGraph() function
- Add calculateImportance() with edge count scoring
- Add SIMPLIFICATION_THRESHOLD (1000), SIMPLIFIED_NODE_LIMIT (500), EXTREME_SIMPLIFIED_NODE_LIMIT (300)
- Use canonical getStatus() helper to preserve all error/warning types
- Add inline performance comments explaining mandatory for >10k nodes
- Quality: lint ✓ format ✓ type ✓ test ✓

**Commit 12: Add unit tests for graph simplification**
- Files: `frontend/src/components/resourceMap/graph/graphSimplification.test.ts`
- Add all 9 simplification tests
- Test importance scoring, error preservation, threshold handling
- Quality: lint ✓ format ✓ type ✓ test ✓

**Commit 13: Integrate simplification into GraphView**
- Files: `frontend/src/components/resourceMap/GraphView.tsx`
- Add simplify toggle with dynamic label (500 vs 300 nodes)
- Apply simplifyGraph() after filtering
- Add simplification icon to App/icons.ts
- Quality: lint ✓ format ✓ type ✓ snapshots ✓

**Commit 14: Update Storybook tests with simplification toggle**
- Files: `frontend/src/components/resourceMap/GraphView.stories.tsx`
- Add simplify toggle to all 5 performance tests
- Default to ON for large tests (20000, 100k pods)
- Quality: lint ✓ format ✓ type ✓ snapshots ✓

**Commit 15: Add simplification documentation**
- Files: `docs/development/resourcemap-performance.md`
- Explain why simplification is mandatory for >10k nodes
- Include profiling data (8s+ then crash without it)
- Document importance scoring algorithm
- Quality: lint ✓ format ✓

### Phase 4: Layout Caching (Commits 16-18)

**Commit 16: Add time-based layout cache with collision prevention**
- Files: `frontend/src/components/resourceMap/graph/graphLayout.tsx`
- Add layoutCache Map with timestamp tracking
- Add getGraphCacheKey() with full-precision aspectRatio + edge structure + 100 node IDs
- Add cleanLayoutCache() with re-query after expiry
- Add inline performance comments explaining cache policy (time-based, not LRU)
- Add MAX_CACHE_SIZE (10), CACHE_TTL_MS (60000)
- Quality: lint ✓ format ✓ type ✓ test ✓

**Commit 17: Integrate layout caching into applyGraphLayout**
- Files: `frontend/src/components/resourceMap/graph/graphLayout.tsx`
- Check cache before calling ELK layout
- Store successful layouts in cache
- Add performance metric calls
- Quality: lint ✓ format ✓ type ✓ test ✓

**Commit 18: Add caching documentation**
- Files: `docs/development/resourcemap-advanced-optimizations.md`
- Explain cache key design (collision prevention)
- Document 100% improvement on cache hits
- Include cache size/TTL rationale
- Quality: lint ✓ format ✓

### Phase 5: Change Detection Infrastructure (Commits 19-22)

**Commit 19: Add graph change detection module**
- Files: `frontend/src/components/resourceMap/graph/graphIncrementalUpdate.ts`
- Add detectGraphChanges() function
- Add shouldUseIncrementalUpdate() with 20% threshold
- Add INCREMENTAL_UPDATE_THRESHOLD constant
- Add inline performance comments
- Quality: lint ✓ format ✓ type ✓ test ✓

**Commit 20: Add unit tests for change detection**
- Files: `frontend/src/components/resourceMap/graph/graphIncrementalUpdate.test.ts`
- Add all 12 change detection tests
- Test added/modified/deleted detection
- Test threshold behavior (20%)
- Test complex scenarios
- Quality: lint ✓ format ✓ type ✓ test ✓

**Commit 21: Integrate change detection into GraphView**
- Files: `frontend/src/components/resourceMap/GraphView.tsx`
- Call detectGraphChanges() in useMemo
- Add prevNodesRef and prevEdgesRef
- Log change detection results with debug flag
- Quality: lint ✓ format ✓ type ✓ test ✓

**Commit 22: Add incremental updates toggle to GraphView**
- Files: `frontend/src/components/resourceMap/GraphView.tsx`
- Add useIncrementalUpdates state
- Add toggle chip to UI
- Add icon to App/icons.ts
- Quality: lint ✓ format ✓ type ✓ snapshots ✓

### Phase 6: Incremental Filtering Implementation (Commits 23-26)

**Commit 23: Implement filterGraphIncremental function**
- Files: `frontend/src/components/resourceMap/graph/graphFiltering.ts`
- Add filterGraphIncremental() implementation
- Process only added/modified/deleted nodes
- Reuse previous filtered results
- Add division-by-zero guards for metrics
- Add inline performance comments with benchmarks (85-92% faster)
- Quality: lint ✓ format ✓ type ✓ test ✓

**Commit 24: Add comprehensive unit tests for filterGraphIncremental**
- Files: `frontend/src/components/resourceMap/graph/graphFiltering.test.ts`
- Add all 15 incremental filtering tests
- Test add/modify/delete operations
- Test all filter types (namespace, error, multiple OR)
- Test edge preservation and BFS for related nodes
- Test correctness validation vs full filterGraph
- Test performance (incremental faster than full)
- Use proper Pod status with Ready condition
- Quality: lint ✓ format ✓ type ✓ test ✓

**Commit 25: Add filter signature tracking to prevent incorrect results**
- Files: `frontend/src/components/resourceMap/GraphView.tsx`
- Add prevFiltersRef to track filter signature
- Compute filter signature (JSON hash of sorted namespaces + hasErrors)
- Force full recompute when filters change
- Add comments explaining critical correctness fix
- Quality: lint ✓ format ✓ type ✓ test ✓

**Commit 26: Integrate incremental filtering into GraphView**
- Files: `frontend/src/components/resourceMap/GraphView.tsx`
- Use filterGraphIncremental when useIncrementalUpdates=true and <20% changed and filters unchanged
- Fall back to filterGraph for >20% changes or filter changes
- Add prevFilteredGraphRef to store results
- Add console logging with mode (INCREMENTAL vs FULL)
- Quality: lint ✓ format ✓ type ✓ test ✓

### Phase 7: Interactive Testing Features (Commits 27-30)

**Commit 27: Add Change % dropdown to Storybook tests**
- Files: `frontend/src/components/resourceMap/GraphView.stories.tsx`
- Update generateMockPods with changePercentage parameter
- Update generateMockDeployments/ReplicaSets/Services with changePercentage
- Add Change % dropdown to all 5 tests (6-8 options each)
- Add color coding (green <20%, red >20%)
- Add resource count display
- Quality: lint ✓ format ✓ type ✓ snapshots ✓

**Commit 28: Add dynamic info messages for incremental mode**
- Files: `frontend/src/components/resourceMap/GraphView.stories.tsx`
- Add info box showing which mode will be used
- Show green background for incremental (<20%)
- Show red background for full processing (>20%)
- Add tooltips explaining behavior
- Quality: lint ✓ format ✓ type ✓ snapshots ✓

**Commit 29: Add realistic WebSocket simulation hook**
- Files: `frontend/src/components/resourceMap/GraphView.stories.tsx`
- Add useRealisticWebSocketUpdates() hook
- Spread updates throughout interval using random delays
- Add RESOURCES_PER_EVENT (10) and MAX_WEBSOCKET_EVENTS (10) constants
- Apply to all 4 tests with auto-update (2000, 5000, 20000, 100k)
- Add comments explaining realistic async pattern
- Quality: lint ✓ format ✓ type ✓ snapshots ✓

**Commit 30: Add auto-update controls to Storybook tests**
- Files: `frontend/src/components/resourceMap/GraphView.stories.tsx`
- Add Auto-update checkbox to all tests
- Add Interval dropdown (1s, 2s, 5s, 10s)
- Add update counter display
- Wire up auto-update with realistic simulation
- Quality: lint ✓ format ✓ type ✓ snapshots ✓

---

## Quality Checks for Each Commit

Before committing ANY change:
```bash
# 1. Format code
npm run frontend:format

# 2. Lint code
npm run frontend:lint

# 3. Type check
npm run frontend:tsc

# 4. Run relevant unit tests
cd frontend && npm test <test-file-name>

# 5. Update snapshots if needed
cd frontend && npm test -- -u

# 6. Verify all tests pass
cd frontend && npm test
```

**Only commit if ALL checks pass.**

---

## Expected Performance Timeline

After each commit, Storybook will show progressive improvement:

| After Commit | 2000 Pods Initial | WebSocket Update (1%) | Status |
|--------------|-------------------|----------------------|---------|
| Commit 5 | ~2500ms (baseline) | ~250ms (baseline) | Testing ready |
| Commit 7 | ~1400ms | ~140ms | BFS filters faster |
| Commit 8 | ~1300ms | ~130ms | BFS grouping faster |
| Commit 9 | ~1100ms | ~110ms | React Flow opts |
| Commit 13 | ~1100ms (500 pods after simplification) | ~110ms | Simplification |
| Commit 17 | ~0ms on revisit | ~110ms | Layout caching |
| Commit 26 | ~1030ms | **~35ms** | Incremental filtering |
| Commit 30 | ~1030ms | **~35ms** | Complete with testing |

**Final Achievement**: 59% faster initial, 86% faster WebSocket updates

---

## Review Advantages

**Tests-first approach**:
1. Reviewer can see performance testing infrastructure immediately
2. Can validate each optimization in Storybook as commits progress
3. Each optimization shows measurable improvement
4. Tests bundled with code (easier to review together)

**Atomic commits**:
- Each commit is independently reviewable
- Each commit passes all quality checks
- Easy to bisect if issues found
- Clear progression of improvements

**No rebasing needed**:
- All commits created fresh from main branch state
- Clean linear history
- No force push required

---

## Implementation Status

- [x] Reverted to main branch (commit 7328456)
- [x] Created atomic commit plan (this document)
- [ ] Commit 1: PerformanceStats UI component
- [ ] Commit 2: Performance instrumentation
- [ ] Commit 3: Storybook 500 pods test
- [ ] Commit 4: Storybook 2000 pods test
- [ ] Commit 5: Storybook large tests (5000, 20000, 100k)
- [ ] Commits 6-30: Continue with plan

---

## Success Criteria

✅ 30 clean atomic commits  
✅ Testing infrastructure first  
✅ Tests bundled with code changes  
✅ Full quality checks before each commit  
✅ Logical progression showing performance improvements  
✅ No intermediate/fix-up commits  
✅ All 34 code review issues addressed in final state  
✅ 36 unit tests passing  
✅ All documentation included  

**Ready to begin implementation!**
