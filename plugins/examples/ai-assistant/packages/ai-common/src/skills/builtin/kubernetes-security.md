---
name: kubernetes-security
description: Kubernetes security best practices, RBAC guidance, and compliance checks
version: 1.0.0
author: Headlamp
license: Apache-2.0
tags: [kubernetes, security, rbac, compliance, pod-security]
tool: headlamp
---

# Kubernetes Security Guide

When users ask about security, RBAC, or compliance, use this guide to provide actionable advice. Reference Headlamp's Security section in the sidebar for viewing RBAC resources.

## RBAC Review

### Checking Permissions
1. Navigate to Security → Cluster Roles and Cluster Role Bindings to see cluster-wide permissions
2. Navigate to Security → Roles and Role Bindings for namespace-scoped permissions
3. Look for overly permissive bindings — especially `cluster-admin` bindings to service accounts

### Common RBAC Issues
- **Overly permissive roles**: Roles with `*` (wildcard) on apiGroups, resources, or verbs grant too much access
- **cluster-admin bindings**: The `cluster-admin` ClusterRole should only be bound to admin users, never to application service accounts
- **Default service account**: Pods should use dedicated service accounts, not the `default` service account
- **Cross-namespace access**: ClusterRoleBindings grant access across all namespaces — prefer namespace-scoped RoleBindings

### Least-Privilege Recommendations
- Use the minimum set of verbs needed (get, list, watch for read-only; create, update, patch, delete for write)
- Scope to specific resource names when possible
- Use namespace-scoped Roles instead of ClusterRoles when the workload only needs access within one namespace
- Audit unused service accounts and remove unnecessary bindings

## Pod Security

### Pod Security Standards (PSS)
Kubernetes defines three security profiles:

1. **Privileged**: Unrestricted — allows everything. Only for system-level workloads.
2. **Baseline**: Minimally restrictive — prevents known privilege escalations. Good default for most workloads.
3. **Restricted**: Heavily restricted — follows security hardening best practices. Recommended for production.

### Pod Security Admission (PSA)
Enforce pod security standards at the namespace level:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/audit: restricted
```

### Container Security Checklist
When reviewing pod specifications, check for:

- [ ] `securityContext.runAsNonRoot: true` — containers should not run as root
- [ ] `securityContext.readOnlyRootFilesystem: true` — prevents container filesystem writes
- [ ] `securityContext.allowPrivilegeEscalation: false` — prevents setuid binaries
- [ ] `securityContext.capabilities.drop: ["ALL"]` — drop all Linux capabilities
- [ ] Resource limits set (CPU and memory) — prevents resource abuse
- [ ] No hostNetwork, hostPID, or hostIPC unless absolutely required
- [ ] Image tags are specific (not `latest`) — ensures reproducibility

## Network Policies

### Default Deny
Start with a default deny policy and explicitly allow required traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

### Common Patterns
- Allow ingress only from specific namespaces or pods
- Allow egress only to required services and DNS (port 53)
- Separate frontend, backend, and database tiers with policies

## Secret Management

### Best Practices
1. Never store secrets in ConfigMaps — use Secrets (or external secret managers)
2. Enable encryption at rest for etcd
3. Use external secret managers (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault) via CSI driver or operator
4. Rotate secrets regularly
5. Limit secret access using RBAC — not every service account needs access to every secret

### Checking Secret Exposure
- Review which service accounts have `get` access to secrets
- Check if secrets are mounted in pods that don't need them
- Verify that secrets are not logged or exposed in environment variable dumps
