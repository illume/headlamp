---
title: Migrating from Kubernetes Dashboard
sidebar_position: 5
---

# Migrating from Kubernetes Dashboard to Headlamp

This guide helps you migrate from the Kubernetes Dashboard to Headlamp, providing equivalent installation methods and feature comparisons.

**In this guide:**
- [Quick Migration Path](#quick-migration-path) - Get started in minutes
- [Installation Method Comparison](#installation-method-comparison) - Helm and YAML deployment options
- [Configuration Mapping](#common-configuration-mapping) - Translate Dashboard settings to Headlamp
- [Authentication](#authentication) - Set up access control
- [Feature Comparison](#feature-comparison) - Find equivalent features
- [Advanced Scenarios](#advanced-migration-scenarios) - OIDC, RBAC, and more

## Quick Migration Path

:::tip
This is a basic quickstart guide. For production deployments or advanced configurations, please review the complete [installation documentation](./index.mdx) and [in-cluster deployment guide](./in-cluster/index.md).
:::

If you're currently using Kubernetes Dashboard and want to quickly switch to Headlamp, here's the simplest migration path:

### Basic Migration Steps

1. **Install Headlamp** using Helm:

   ```bash
   helm repo add headlamp https://kubernetes-sigs.github.io/headlamp/
   helm install headlamp headlamp/headlamp --namespace kube-system
   ```

2. **Access Headlamp**:

   ```bash
   kubectl port-forward -n kube-system svc/headlamp 8080:80
   ```
   
   Then open http://localhost:8080 in your browser.

3. **Authenticate**: Use your existing service account token or create a new one (see [Authentication](#authentication) section).

4. **Uninstall Kubernetes Dashboard** (optional - you can run both in parallel during migration):

   ```bash
   # If installed via Helm
   helm uninstall kubernetes-dashboard -n kubernetes-dashboard
   ```

That's it! Headlamp is now running and ready to use.

For more deployment options (YAML, custom configurations, ingress setup), see the sections below.

## Installation Method Comparison

### Helm Chart Installation

**Kubernetes Dashboard** (v7+) requires Helm and uses Kong Gateway:

```bash
helm repo add kubernetes-dashboard https://kubernetes.github.io/dashboard/
helm install kubernetes-dashboard kubernetes-dashboard/kubernetes-dashboard \
  --create-namespace --namespace kubernetes-dashboard
```

[Kubernetes Dashboard Helm Chart](https://artifacthub.io/packages/helm/k8s-dashboard/kubernetes-dashboard)

**Headlamp** uses a simpler architecture without Kong Gateway:

```bash
helm repo add headlamp https://kubernetes-sigs.github.io/headlamp/
helm install headlamp headlamp/headlamp --namespace kube-system
```

[Headlamp Helm Chart](https://artifacthub.io/packages/helm/headlamp/headlamp)

### YAML Deployment

**Kubernetes Dashboard** v2.x (legacy - deprecated in v7+):

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml
```

**Headlamp** maintains an actively supported YAML option:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/headlamp/main/kubernetes-headlamp.yaml
```

## Common Configuration Mapping

### Helm Chart Configuration Comparison

Here's how common Kubernetes Dashboard Helm values map to Headlamp:

| Kubernetes Dashboard | Headlamp Equivalent | Notes |
|---------------------|---------------------|-------|
| `replicaCount` | `replicaCount` | Same parameter name |
| `image.repository` | `image.repository` | Headlamp: `ghcr.io/headlamp-k8s/headlamp` |
| `service.type` | `service.type` | Both default to `ClusterIP` |
| `service.externalPort` | `service.port` | Headlamp defaults to port 80 |
| `ingress.enabled` | `ingress.enabled` | Same parameter name |
| `ingress.hosts` | `ingress.hosts` | Same structure |
| `ingress.tls` | `ingress.tls` | Same structure |
| `resources` | `resources` | Same parameter name |
| `nodeSelector` | `nodeSelector` | Same parameter name |
| `tolerations` | `tolerations` | Same parameter name |
| `affinity` | `affinity` | Same parameter name |

### Ingress Configuration Example

**Kubernetes Dashboard**:
```yaml
ingress:
  enabled: true
  annotations:
    kubernetes.io/tls-acme: "true"
  hosts:
    - dashboard.example.com
  tls:
    - secretName: dashboard-tls
      hosts:
        - dashboard.example.com
```

**Headlamp Equivalent**:
```yaml
ingress:
  enabled: true
  annotations:
    kubernetes.io/tls-acme: "true"
  hosts:
    - host: headlamp.example.com
      paths:
        - path: /
          type: ImplementationSpecific
  tls:
    - secretName: headlamp-tls
      hosts:
        - headlamp.example.com
```

### Installing with Custom Values

Both platforms support customization via Helm values. Example for enabling ingress:

```bash
# Headlamp
helm install headlamp headlamp/headlamp \
  --namespace kube-system \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host=headlamp.example.com
```

See the [Headlamp Helm Chart documentation](https://github.com/kubernetes-sigs/headlamp/tree/main/charts/headlamp) for all available values.

## Authentication

Both Kubernetes Dashboard and Headlamp support similar authentication methods.

### Service Account Token (Recommended)

The process is nearly identical for both:

1. **Create a service account**:

   ```bash
   kubectl -n kube-system create serviceaccount headlamp-admin
   ```

2. **Grant permissions**:

   ```bash
   kubectl create clusterrolebinding headlamp-admin \
     --serviceaccount=kube-system:headlamp-admin \
     --clusterrole=cluster-admin
   ```

3. **Generate token**:

   For Kubernetes 1.24+:
   ```bash
   kubectl create token headlamp-admin -n kube-system
   ```

   For older versions:
   ```bash
   kubectl get secret $(kubectl get sa headlamp-admin -n kube-system -o jsonpath='{.secrets[0].name}') \
     -n kube-system -o jsonpath='{.data.token}' | base64 --decode
   ```

4. **Use the token**: Paste it into the Headlamp login screen.

### OIDC Authentication

Both support OpenID Connect (OIDC) for single sign-on.

**Kubernetes Dashboard**: Requires complex configuration with additional authentication proxy.

**Headlamp**: Built-in OIDC support with simpler configuration:

```bash
helm install headlamp headlamp/headlamp \
  --namespace kube-system \
  --set config.oidc.clientID=your-client-id \
  --set config.oidc.clientSecret=your-client-secret \
  --set config.oidc.issuerURL=https://your-issuer-url
```

See [OIDC documentation](./in-cluster/oidc.md) for detailed setup instructions.

## Feature Comparison

### What You Get in Both

Both Kubernetes Dashboard and Headlamp provide:

- ✅ View and manage cluster resources (Pods, Deployments, Services, etc.)
- ✅ View logs and execute into containers
- ✅ Create, edit, and delete resources
- ✅ RBAC-based access control
- ✅ Multi-cluster support
- ✅ Real-time resource updates
- ✅ Resource metrics and monitoring

### Headlamp Additional Features

Headlamp provides additional capabilities:

- ✅ **Plugin system**: Extend functionality with custom plugins
- ✅ **Desktop app**: Run as a local desktop application (Windows, Mac, Linux)
- ✅ **Modern UI**: Built with React and Material-UI
- ✅ **Dark mode**: Built-in dark mode support
- ✅ **Helm support**: Install, upgrade, and uninstall Helm charts directly from the UI (when enabled)
- ✅ **Resource editor**: Edit resources with inline documentation
- ✅ **Better performance**: Lighter resource footprint
- ✅ **Active development**: Regular updates and new features

### If You Use... in Dashboard

| Kubernetes Dashboard Feature | Headlamp Equivalent |
|------------------------------|---------------------|
| Resource list views | Same - available in sidebar navigation |
| Log viewer | Same - click on Pod → Logs tab |
| Terminal/exec | Same - click on Pod → Terminal tab |
| YAML editor | Same - click on resource → Edit (pencil icon) |
| Create from YAML | Same - click "+" icon or Create button |
| Namespace selector | Same - dropdown in top navigation bar |
| Cluster selector (multi-cluster) | Same - cluster dropdown in top navigation |
| Metrics/graphs | Same - resource metrics shown on details pages |
| Service account management | Same - under Access Control section |
| RBAC management | Same - Roles, ClusterRoles, Bindings under Access Control |
| CRD management | Same - Custom Resources section |

## Advanced Migration Scenarios

### Migrating with OIDC Already Configured

If you have OIDC configured for Kubernetes Dashboard, you can reuse the same OIDC provider with Headlamp:

```bash
helm install headlamp headlamp/headlamp \
  --namespace kube-system \
  --set config.oidc.clientID=$EXISTING_CLIENT_ID \
  --set config.oidc.clientSecret=$EXISTING_CLIENT_SECRET \
  --set config.oidc.issuerURL=$EXISTING_ISSUER_URL
```

You may need to add Headlamp's callback URL to your OIDC provider's allowed redirect URIs.

### Migrating with Custom RBAC

If you have custom RBAC roles for Dashboard users:

1. The same RBAC rules apply to Headlamp - no changes needed
2. Users with the same service accounts will have the same permissions
3. Headlamp respects Kubernetes RBAC automatically

### Running Both in Parallel

During migration, you can run both dashboards simultaneously:

```bash
# Kubernetes Dashboard in its own namespace
helm install kubernetes-dashboard kubernetes-dashboard/kubernetes-dashboard \
  --namespace kubernetes-dashboard

# Headlamp in kube-system
helm install headlamp headlamp/headlamp \
  --namespace kube-system
```

This allows gradual user migration and comparison before full switchover.

### Migrating Bookmarks and URLs

If users have bookmarked specific Dashboard URLs:

- **Dashboard URL pattern**: `/#!/<resource>/<namespace>/<name>`
- **Headlamp URL pattern**: `/<resource>/<namespace>/<name>`

You may need to update bookmarks, but the structure is similar.

## Extending Headlamp with Plugins

Headlamp's plugin system allows you to customize and extend functionality beyond what's available in the base installation. This is a unique advantage over Kubernetes Dashboard.

**Why use plugins:**
- Add custom resource visualizations
- Integrate with your CI/CD pipelines
- Create custom dashboards for your team
- Add organization-specific workflows

**Getting started with plugins:**
- Browse available plugins at [Artifact Hub](https://artifacthub.io/packages/search?kind=21&sort=relevance&page=1)
- Learn about [plugin development](https://headlamp.dev/docs/latest/development/plugins/)
- See [official plugin examples](https://github.com/headlamp-k8s/plugins)
- Deploy plugins [using the plugin manager in-cluster](./in-cluster/index.md#plugin-management)

## Resources and Support

**Documentation:**
- [Headlamp Documentation](https://headlamp.dev/docs/)
- [Installation Guide](./index.mdx)
- [In-cluster Installation](./in-cluster/index.md)
- [Desktop Installation](./desktop/index.mdx)
- [FAQ](https://headlamp.dev/docs/latest/faq)

**Get Help:**
- [GitHub Issues](https://github.com/kubernetes-sigs/headlamp/issues)
- [#headlamp channel](https://kubernetes.slack.com/messages/headlamp) in Kubernetes Slack
- [Monthly Community Meeting](https://zoom-lfx.platform.linuxfoundation.org/meetings/headlamp)

**After Migration:**
1. Explore community plugins to extend functionality
2. Try the desktop app for local cluster management
3. Join the community and share your experience
