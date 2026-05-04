# Headlamp + OAuth2-Proxy + Dex test scripts

This folder reproduces the [Headlamp + OAuth2-Proxy + Dex tutorial](../index.md) end-to-end so you can
try it yourself with a single command.

It brings up:

- A **Minikube** profile (`dex`) configured to trust Dex as an OIDC issuer.
- A **Dex** instance (running on the host machine) acting as the OIDC provider.
- A **Headlamp** install via the official Helm chart, with no OIDC config.
- An **OAuth2-Proxy** install via the official Helm chart, configured to
  authenticate users against Dex and forward the resulting `id_token` to
  Headlamp as an `Authorization: Bearer …` header.
- A `ClusterRoleBinding` that grants the Dex test user `cluster-admin`.

When everything is up, you reach Headlamp by opening
<http://localhost:8080> in your browser, signing in to Dex
(`admin@example.com` / `password`), and being redirected back to Headlamp
with full access.

## Prerequisites

Make sure the following are installed and on your `PATH`:

- [`minikube`](https://minikube.sigs.k8s.io/) ≥ 1.31
- [`kubectl`](https://kubernetes.io/docs/tasks/tools/)
- [`helm`](https://helm.sh/) ≥ 3.10
- [`dex`](https://github.com/dexidp/dex/releases) ≥ 2.38 (the binary
  produced by `make build` or downloaded from a release)
- `curl` (for the smoke test)
- `openssl` (for the random cookie secret)

Tested with Headlamp 0.36, OAuth2-Proxy 7.x, Dex 2.43 and Minikube 1.34
on Linux. macOS should work the same way; on Windows you'll need WSL.

## Files

| File                          | What it is                                                          |
|-------------------------------|---------------------------------------------------------------------|
| `dex-config.yaml`             | Dex configuration (static client + static password).                |
| `clusterrolebinding.yaml`     | RBAC binding mapping the Dex user to `cluster-admin`.               |
| `headlamp-values.yaml`        | Helm values for Headlamp (no OIDC — that's done by OAuth2-Proxy).   |
| `oauth2-proxy-values.yaml.tpl`| Template Helm values for OAuth2-Proxy (cookie secret is injected).  |
| `run.sh`                      | Brings up Minikube, Dex, Headlamp, OAuth2-Proxy and port-forwards.  |
| `test.sh`                     | Smoke-tests that the OAuth2-Proxy login redirects to Dex.           |
| `cleanup.sh`                  | Stops Dex, deletes the Helm releases and the Minikube profile.      |

## Usage

```bash
# Start everything. Leaves Dex running in the background and
# port-forwards OAuth2-Proxy on http://localhost:8080.
./run.sh

# In another terminal, sanity-check the deployment.
./test.sh

# Open Headlamp in your browser:
#   http://localhost:8080
# Sign in as: admin@example.com / password

# When you're done:
./cleanup.sh
```

`run.sh` is idempotent — re-running it will pick up where a previous run
left off.

## How it differs from the older Dex tutorial

The [other Dex tutorial](../../dex/index.md) points Headlamp directly at Dex
and lets Headlamp drive the OIDC flow. The new pattern, which matches
[OAuth2-Proxy's official Headlamp integration guide](https://oauth2-proxy.github.io/oauth2-proxy/configuration/integrations/headlamp),
puts OAuth2-Proxy in front of Headlamp. OAuth2-Proxy talks OIDC to Dex,
issues a session cookie to the browser, and forwards the user's
`id_token` to Headlamp as an `Authorization: Bearer …` header so Headlamp
(and through it the Kubernetes API server) authenticate as the real
user.
