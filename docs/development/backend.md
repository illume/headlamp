---
title: Backend
sidebar_position: 1
---

Headlamp's backend is written in Go. It is in charge of redirecting
client requests to the right clusters and returning any available
plugins for the client to use.

The backend's most essential function is to read the cluster information
from the given configuration and set up proxies to the defined clusters as
well as endpoints to them. This means that instead of having a set of
endpoints related to the functionality available to the client, it simply
redirects the requests to the defined proxies.

## Building and running

The backend (Headlamp's server) can be quickly built using:

```bash
npm run backend:build
```

Once built, it can be run in development mode (insecure / don't use in production) using:

```bash
npm run backend:start
```

## Telemetry

Headlamp's backend supports OpenTelemetry for distributed tracing and Prometheus metrics. See the [Telemetry guide](./telemetry.md) for configuration, local setup with Jaeger and Prometheus, and in-cluster deployment.

## Logging configuration

Headlamp’s backend supports configurable log levels to control verbosity.

Log level can be configured using either a flag or an environment variable:
- the log level: `--log-level` or env var `HEADLAMP_CONFIG_LOG_LEVEL`

Supported Values:
- `debug`
- `info` (default)
- `warn` 
- `error`

> **Note:** Headlamp uses zerolog defaults.  
> Zerolog’s default log level is `info`, and Headlamp follows this behavior.

### Examples

Run with warning level:

```bash
./headlamp-server --log-level warn
```

## Lint

To lint the backend/ code.

```bash
npm run backend:lint
```

This command can fix some lint issues.

```bash
npm run backend:lint:fix
```

## Format

To format the backend code.

```bash
npm run backend:format
```

## Test

```bash
npm run backend:test
```

Test coverage with a html report in the browser.

```bash
npm run backend:coverage:html
```

To just print a simpler coverage report to the console.
```bash
npm run backend:coverage
```

## Memory profiling

Use representative kubeconfigs, clusters, and requests when comparing profiles. Run each
measurement several times and compare medians.

```bash
# GC activity and heap goals for a running development server.
GODEBUG=gctrace=1 npm run backend:start 2>gc.log

# Heap retained by a test or benchmark.
cd backend
go test -run TestName -memprofile=/tmp/heap.pprof ./pkg/package
go tool pprof -inuse_space /tmp/heap.pprof

# Total allocations, including objects that have already been collected.
go test -run '^$' -bench BenchmarkName -benchmem \
  -memprofile=/tmp/allocs.pprof ./pkg/package
go tool pprof -alloc_space /tmp/allocs.pprof

# Allocation/free events, GC pauses, and goroutine scheduling.
GODEBUG=traceallocfree=1 go test -run TestName -trace=/tmp/trace.out ./pkg/package
go tool trace /tmp/trace.out
```

On Unix, `GOTRACEBACK=all` followed by `kill -QUIT <pid>` prints all goroutine
stacks. This terminates the process, so only use it on a development instance.
Repeated dumps reveal goroutines whose count or blocked stacks keep growing.

In `pprof`, start with `top`, `top -cum`, `list <function>`, and `web`.
`inuse_space` identifies long-lived allocations; `alloc_space` identifies allocation
churn. Compare profiles with `go tool pprof -base before.pprof after.pprof`.
In traces and GC logs, look for a growing live heap after GC, frequent collections
with little heap reduction, and increasing goroutine counts. Map growth appears as
retained `runtime.mapassign` call paths and should be checked for missing bounds or
expiration.

### Ranked optimization opportunities

| Rank | Change | Expected memory effect | Trade-off |
| --- | --- | --- | --- |
| 1 | Store only object metadata in cache-invalidation informers | 70–99% of informer object heap, depending on resource payload size | Informer handlers cannot later consume spec or status without removing the transform |
| 2 | Share cache-invalidation watchers for equivalent cluster connections | Avoids duplicated informer stores and goroutines for stateless users | Requires careful authentication and watcher lifecycle isolation |
| 3 | Add byte and entry limits to the Kubernetes response cache | Prevents unbounded retained response growth and avoids caching oversized responses | Lower cache hit rate |
| 4 | Cache only the Kubernetes authorization client instead of a full clientset | Removes unused typed clients from each token cache entry | Narrows the internal cache API |
| 5 | Initialize proxy transports only when a context is first used | Saves per-context TLS and transport state for unused contexts | Adds synchronization to the first request |
| 6 | Lower `GOGC` for the desktop backend | About 2–4.5 MiB in measured idle/request workloads | More frequent GC and modestly higher CPU use |

The desktop launcher defaults its bundled backend to `GOGC=50`, while preserving
an explicitly configured `GOGC`. In isolated measurements, this reduced median
startup RSS from 82,384 KiB to 80,492 KiB. After 20,000 `/config` requests,
private dirty memory fell from 19,744 KiB to 15,160 KiB, with a 0.35% wall-time
increase and about 2.4% more backend CPU.

`GOMEMLIMIT` is a soft runtime limit rather than a live-heap target. Set it to
roughly 85–90% of a container's memory limit, leaving room for the executable,
stacks, and non-Go allocations. Limits between 20 MiB and 64 MiB did not
consistently reduce the small desktop startup workload, so the app does not force
a fixed value. Re-profile under production load before setting either variable.

## Fuzz Testing

Some backend functions include fuzz tests using Go's native fuzzing support. For example, the `SanitizeClusterName` function in `backend/pkg/auth` has a fuzz test.

To run fuzz tests:

```bash
npm run backend:fuzz
```

This will run fuzz tests in the `backend/pkg/auth` package for 30 seconds. The fuzz corpus (interesting test cases discovered during fuzzing) is stored in `testdata/fuzz/` directories and committed to the repository for regression testing.

For more information about Go fuzzing, see the [official Go fuzzing documentation](https://go.dev/security/fuzz/).
