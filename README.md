# Pod load-more alignment screenshots

These screenshots support kubernetes-sigs/headlamp#6722.

The pod list uses live local-cluster pod data. For deterministic capture, the browser intercepted
the initial pod-list response and added Kubernetes `continue` and `remainingItemCount` metadata so
Headlamp rendered its existing pagination controls. No cluster data or production source was changed
for the screenshots.

- `before.png`: `upstream/main` block layout applied in browser DevTools.
- `after.png`: PR flex-row layout from the running worktree.