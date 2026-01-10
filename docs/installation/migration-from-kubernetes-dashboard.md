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
- [Using Headlamp for Kubernetes Dashboard Users](#using-headlamp-for-kubernetes-dashboard-users) - Find equivalent features
- [Advanced Scenarios](#advanced-migration-scenarios) - OIDC, RBAC, and more

## Quick Migration Path

:::tip
This is a basic quickstart guide. For production deployments or advanced configurations, please review the complete [installation documentation](./index.mdx) and [in-cluster deployment guide](./in-cluster/index.md). Running both Kubernetes Dashboard and Headlamp in parallel before removing Dashboard is a good practice during migration.
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

#### Available Authentication Guides

- [Microsoft Azure Entra ID](./in-cluster/azure-entra-id/index.md)
- [Amazon EKS](./in-cluster/eks/index.md)
- [AKS Cluster OAuth](./in-cluster/aks-cluster-oauth/index.md)
- [Keycloak](./in-cluster/keycloak/index.md)
- [Dex](./in-cluster/dex/index.md)

## Using Headlamp for Kubernetes Dashboard Users

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

### OAuth2 Proxy and User Impersonation

If you're using OAuth2 Proxy with Kubernetes Dashboard for SSO and user impersonation, you can achieve similar functionality with Headlamp.

#### How Kubernetes Dashboard Used OAuth2 Proxy

- OAuth2 Proxy handled external authentication (e.g., via Azure AD, Keycloak, GitHub)
- The proxy set impersonation headers (`Impersonate-User`, `Impersonate-Group`)
- A service account with impersonation RBAC rights made API calls on behalf of users
- User access was controlled via Kubernetes RBAC based on impersonated identity

#### How to Configure Headlamp with OAuth2 Proxy

Headlamp supports integration with OAuth2 Proxy through the `meUserInfoURL` configuration option. This allows Headlamp to fetch additional user information from OAuth2 Proxy's `/oauth2/userinfo` endpoint.

1. **Deploy Headlamp with OAuth2 Proxy configuration:**

   ```bash
   helm install headlamp headlamp/headlamp \
     --namespace kube-system \
     --set config.oidc.clientID=$CLIENT_ID \
     --set config.oidc.clientSecret=$CLIENT_SECRET \
     --set config.oidc.issuerURL=$ISSUER_URL \
     --set config.oidc.meUserInfoURL=/oauth2/userinfo
   ```

   Or via values.yaml:
   ```yaml
   config:
     oidc:
       clientID: "your-client-id"
       clientSecret: "your-client-secret"
       issuerURL: "https://your-issuer-url"
       meUserInfoURL: "/oauth2/userinfo"
   ```

2. **Configure OAuth2 Proxy:**
   - Set up OAuth2 Proxy as a reverse proxy in front of Headlamp
   - Configure it to inject authentication headers
   - See the [AKS with OAuth2 Proxy tutorial](./in-cluster/aks-cluster-oauth/index.md) for a complete example

3. **RBAC Configuration:**
   - The same RBAC rules you had for Dashboard users apply to Headlamp
   - User permissions are controlled through Kubernetes RBAC
   - No additional impersonation setup needed on the Headlamp side

#### Key Differences from Dashboard

- Headlamp has built-in OIDC support, reducing complexity
- OAuth2 Proxy integration is optional but supported via `meUserInfoURL`
- Headlamp can work directly with OIDC providers without requiring OAuth2 Proxy in many cases

**Note:** For production deployments with OAuth2 Proxy, refer to the [AKS cluster OAuth tutorial](./in-cluster/aks-cluster-oauth/index.md) which provides a complete working example with Azure Entra ID.

## Extending Headlamp with Plugins

Using a different Kubernetes extension or CNCF project? Headlamp's plugin system might already have what you need. Plugins allow you to customize and extend functionality beyond what's available in the base installation.

### Popular Plugins

- **[Backstage](https://artifacthub.io/packages/headlamp/headlamp-plugins/backstage)** - Integrate with Backstage's service catalog
- **[Prometheus](https://artifacthub.io/packages/headlamp/headlamp-plugins/prometheus)** - Enhanced Prometheus metrics visualization
- **[App Catalog](https://artifacthub.io/packages/headlamp/headlamp-plugins/app-catalog)** - Browse and install applications
- [Browse all available plugins](https://headlamp.dev/plugins)

### Why Use Plugins

- Add custom resource visualizations
- Integrate with your CI/CD pipelines and monitoring tools
- Create custom dashboards for your team
- Add organization-specific workflows

### Getting Started with Plugins

- Browse the [plugin marketplace](https://headlamp.dev/plugins)
- Learn about [plugin development](https://headlamp.dev/docs/latest/development/plugins/)
- See [official plugin examples](https://github.com/headlamp-k8s/plugins)
- Deploy plugins [in-cluster with the plugin manager](./in-cluster/index.md#plugin-management)
- Install plugins [in the desktop app](./desktop/plugins-install-desktop.md)

## Resources and Support

### Documentation

- [Headlamp Documentation](https://headlamp.dev/docs/)
- [Installation Guide](./index.mdx)
- [In-cluster Installation](./in-cluster/index.md)
- [Desktop Installation](./desktop/index.mdx)
- [FAQ](https://headlamp.dev/docs/latest/faq)

### Get Help

- [GitHub Issues](https://github.com/kubernetes-sigs/headlamp/issues)
- [#headlamp channel](https://kubernetes.slack.com/messages/headlamp) in Kubernetes Slack
- [Monthly Community Meeting](https://zoom-lfx.platform.linuxfoundation.org/meetings/headlamp)

### After Migration

1. Explore community plugins to extend functionality
2. Try the desktop app for local cluster management
3. Join the community and share your experience
