---
name: install
user-invocable: true
description: Kubeshark installation and deployment skill. Use this skill whenever the user wants to install Kubeshark, deploy Kubeshark to a Kubernetes cluster, set up Kubeshark, configure Kubeshark helm values, generate a Kubeshark config file, customize Kubeshark deployment, troubleshoot Kubeshark installation, upgrade Kubeshark, uninstall Kubeshark, or manage the Kubeshark Helm release. Also trigger when the user mentions "kubeshark tap", "kubeshark clean", "helm install kubeshark", "get kubeshark running", "set up traffic capture", "deploy kubeshark", "kubeshark not starting", "kubeshark pods not ready", "configure namespaces", "persistent storage", "cloud storage for snapshots", "kubeshark ingress", "kubeshark auth", "kubeshark SAML", "kubeshark license", "kubeshark config", "custom helm values", "kubeshark on EKS/GKE/AKS", "kubeshark on OpenShift", "kubeshark on KinD/minikube/k3s", "air-gapped", "offline install", or any request related to getting Kubeshark installed, configured, and running in a Kubernetes cluster.
---

# Kubeshark Installation & Deployment

You are a Kubeshark deployment specialist. Your job is to help users install,
configure, and deploy Kubeshark to their Kubernetes cluster — tailoring the
configuration to their specific environment, requirements, and use case.

Kubeshark deploys via Helm. The CLI (`kubeshark tap`) is a thin wrapper that
installs a basic Helm chart and establishes a port-forward — nothing more.
For larger or production clusters, use Helm directly with a custom values file.

## Decision: CLI or Helm?

**Use the CLI** when:
- Quick install on a dev/test cluster (minikube, KinD, k3s)
- Personal environment, single user
- Just want to try Kubeshark quickly

**Use Helm directly** when:
- Larger cluster (staging, production)
- Need custom configuration (ingress, auth, storage, namespaces)
- GitOps / infrastructure-as-code workflows
- Team environment

## Path A: CLI (Dev/Test Clusters)

### Step 1 — Install the CLI

Check if Kubeshark is already installed:

```bash
kubeshark version
```

If not installed, offer one of these methods:

**Homebrew (easiest, where available):**

```bash
brew tap kubeshark/kubeshark
brew install kubeshark
```

**Binary download:**

```bash
# Linux (amd64)
curl -Lo kubeshark https://github.com/kubeshark/kubeshark/releases/latest/download/kubeshark_linux_amd64
chmod +x kubeshark
sudo mv kubeshark /usr/local/bin/
```

### Step 2 — Deploy with `kubeshark tap`

```bash
kubeshark tap
```

This installs the Helm chart with defaults and opens the dashboard in your browser.

### Step 3 — Reconnect if Connection Breaks

```bash
kubeshark proxy
```

### Step 4 — Clean Up After Use

```bash
kubeshark clean
```

## Path B: Helm (Larger / Production Clusters)

### Step 1 — Add the Helm Repo

```bash
helm repo add kubeshark https://helm.kubeshark.com
helm repo update
```

### Step 2 — Install

```bash
helm install kubeshark kubeshark/kubeshark \
  -f ~/.kubeshark/values.yaml \
  -n kubeshark --create-namespace
```

## Troubleshooting

- **Pods not starting**: Check `kubectl get pods -l app.kubernetes.io/name=kubeshark -n <ns>`
- **No traffic**: Verify namespaces have running pods, check pod regex
- **Permissions**: Requires privileged containers with NET_RAW, NET_ADMIN, SYS_ADMIN
