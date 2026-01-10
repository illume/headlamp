---
title: Migrating from Kubernetes Dashboard
sidebar_position: 5
---

# Migrating from Kubernetes Dashboard to Headlamp

This guide helps you migrate from the Kubernetes Dashboard to Headlamp, providing equivalent installation methods and feature comparisons.

## Quick Migration Path

If you're currently using Kubernetes Dashboard and want to quickly switch to Headlamp, here's the simplest migration path:

### Prerequisites

- Kubernetes 1.21+
- kubectl configured with access to your cluster
- Helm 3.x (for Helm-based installation)

### Basic Migration Steps

1. **Uninstall Kubernetes Dashboard** (optional - you can run both in parallel during migration):

   ```bash
   # If installed via Helm
   helm uninstall kubernetes-dashboard -n kubernetes-dashboard
   
   # If installed via YAML (legacy v2.x)
   kubectl delete -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml
   ```

2. **Install Headlamp**:

   ```bash
   # Add Headlamp repository
   helm repo add headlamp https://kubernetes-sigs.github.io/headlamp/
   helm repo update
   
   # Install Headlamp in the same namespace for easier transition
   helm install headlamp headlamp/headlamp --namespace kube-system
   ```

3. **Access Headlamp**:

   ```bash
   kubectl port-forward -n kube-system svc/headlamp 8080:80
   ```
   
   Open http://localhost:8080 in your browser.

4. **Authenticate**: Use your existing service account token or create a new one (see [Authentication](#authentication) section below).

That's it! Headlamp is now running and ready to use.

## Installation Method Comparison

### Helm Chart Installation

Both Kubernetes Dashboard (v7+) and Headlamp support Helm chart installation, which is the recommended method for both.

#### Kubernetes Dashboard (v7+)

```bash
# Add repository
helm repo add kubernetes-dashboard https://kubernetes.github.io/dashboard/
helm repo update

# Install
helm upgrade --install kubernetes-dashboard kubernetes-dashboard/kubernetes-dashboard \
  --create-namespace --namespace kubernetes-dashboard

# Access
kubectl -n kubernetes-dashboard port-forward svc/kubernetes-dashboard-kong-proxy 8443:443
```

**Chart location**: https://artifacthub.io/packages/helm/k8s-dashboard/kubernetes-dashboard

#### Headlamp Equivalent

```bash
# Add repository
helm repo add headlamp https://kubernetes-sigs.github.io/headlamp/
helm repo update

# Install
helm install headlamp headlamp/headlamp --namespace kube-system

# Access
kubectl port-forward -n kube-system svc/headlamp 8080:80
```

**Chart location**: https://artifacthub.io/packages/helm/headlamp/headlamp

**Key differences**:
- Headlamp uses a simpler architecture without requiring Kong Gateway
- Headlamp defaults to port 80 (service) mapping to port 4466 (container)
- Headlamp has a smaller resource footprint
- Both support customization via values.yaml

### YAML Deployment (Legacy)

#### Kubernetes Dashboard (v2.x - Legacy)

Before v7, Kubernetes Dashboard could be installed via a single YAML file:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml

# Access
kubectl proxy
# Visit: http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/
```

**Note**: This method is deprecated and no longer supported in v7+.

#### Headlamp Equivalent

Headlamp maintains a simple YAML deployment option:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/headlamp/main/kubernetes-headlamp.yaml

# Access
kubectl port-forward -n kube-system svc/headlamp 8080:80
```

Then open http://localhost:8080 in your browser.

**Key differences**:
- Headlamp continues to support both Helm and YAML deployment methods
- Headlamp's YAML deployment is actively maintained and recommended for simple use cases
- Headlamp deploys to `kube-system` namespace by default (vs `kubernetes-dashboard`)

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

**Kubernetes Dashboard**:
```bash
helm install kubernetes-dashboard kubernetes-dashboard/kubernetes-dashboard \
  --namespace kubernetes-dashboard \
  --set service.type=LoadBalancer \
  --set protocolHttp=true
```

**Headlamp Equivalent**:
```bash
helm install headlamp headlamp/headlamp \
  --namespace kube-system \
  --set service.type=LoadBalancer
```

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

## Plugin Migration

If you've extended Kubernetes Dashboard with custom metrics or features, consider migrating them to Headlamp plugins:

- Browse available plugins: https://artifacthub.io/packages/search?kind=21&sort=relevance&page=1
- Plugin development guide: https://headlamp.dev/docs/latest/development/plugins/
- Official plugin examples: https://github.com/headlamp-k8s/plugins

## Getting Help

If you encounter issues during migration:

- **Documentation**: https://headlamp.dev/docs/
- **FAQ**: https://headlamp.dev/docs/latest/faq
- **Slack**: #headlamp channel in [Kubernetes Slack](https://kubernetes.slack.com)
- **GitHub Issues**: https://github.com/kubernetes-sigs/headlamp/issues
- **Monthly Community Meeting**: https://zoom-lfx.platform.linuxfoundation.org/meetings/headlamp

## Next Steps

After migration:

1. **Explore plugins**: Extend Headlamp with community plugins
2. **Try desktop app**: Install the desktop version for local cluster management
3. **Customize**: Adjust Helm values to match your requirements
4. **Share feedback**: Join the community and share your migration experience

## Additional Resources

- [Headlamp Documentation](https://headlamp.dev/docs/)
- [Headlamp GitHub Repository](https://github.com/kubernetes-sigs/headlamp)
- [Headlamp Helm Chart](https://github.com/kubernetes-sigs/headlamp/tree/main/charts/headlamp)
- [Installation Guide](./index.mdx)
- [In-cluster Installation](./in-cluster/index.md)
- [Desktop Installation](./desktop/index.mdx)
