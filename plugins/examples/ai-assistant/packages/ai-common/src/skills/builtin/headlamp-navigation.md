---
name: headlamp-navigation
description: How to navigate Headlamp's UI to find Kubernetes resources and features
version: 1.0.0
author: Headlamp
license: Apache-2.0
tags: [headlamp, navigation, ui, guide]
tool: headlamp
---

# Headlamp Navigation Guide

When guiding users to Kubernetes resources in Headlamp, reference the sidebar navigation structure. Headlamp organizes resources by category in the left sidebar.

## Sidebar Navigation

### Cluster
- **Namespaces**: Sidebar → Cluster → Namespaces
- **Nodes**: Sidebar → Cluster → Nodes
- **CRDs**: Sidebar → Cluster → Custom Resources

### Workloads
- **Pods**: Sidebar → Workloads → Pods
- **Deployments**: Sidebar → Workloads → Deployments
- **StatefulSets**: Sidebar → Workloads → Stateful Sets
- **DaemonSets**: Sidebar → Workloads → Daemon Sets
- **ReplicaSets**: Sidebar → Workloads → Replica Sets
- **Jobs**: Sidebar → Workloads → Jobs
- **CronJobs**: Sidebar → Workloads → Cron Jobs

### Network
- **Services**: Sidebar → Network → Services
- **Endpoints**: Sidebar → Network → Endpoints
- **Ingresses**: Sidebar → Network → Ingresses
- **Network Policies**: Sidebar → Network → Network Policies

### Configuration
- **ConfigMaps**: Sidebar → Configuration → Config Maps
- **Secrets**: Sidebar → Configuration → Secrets
- **HPAs**: Sidebar → Configuration → HPAs (Horizontal Pod Autoscalers)
- **VPAs**: Sidebar → Configuration → VPAs (Vertical Pod Autoscalers)
- **Priority Classes**: Sidebar → Configuration → Priority Classes
- **Limit Ranges**: Sidebar → Configuration → Limit Ranges
- **Resource Quotas**: Sidebar → Configuration → Resource Quotas
- **Pod Disruption Budgets**: Sidebar → Configuration → Pod Disruption Budgets
- **Mutating Webhooks**: Sidebar → Configuration → Mutating Webhook Configurations
- **Validating Webhooks**: Sidebar → Configuration → Validating Webhook Configurations

### Storage
- **PersistentVolumeClaims**: Sidebar → Storage → Persistent Volume Claims
- **PersistentVolumes**: Sidebar → Storage → Persistent Volumes
- **Storage Classes**: Sidebar → Storage → Storage Classes

### Security
- **Service Accounts**: Sidebar → Security → Service Accounts
- **Roles**: Sidebar → Security → Roles
- **Role Bindings**: Sidebar → Security → Role Bindings
- **Cluster Roles**: Sidebar → Security → Cluster Roles
- **Cluster Role Bindings**: Sidebar → Security → Cluster Role Bindings

## Resource Detail Pages

When a user clicks on a specific resource, they see a detail page with:
- **Overview tab**: Key metadata, status, labels, annotations
- **YAML tab**: Full resource YAML with an editor
- **Events tab**: Events related to this resource
- **Logs tab** (pods only): Container logs with follow and download

## Key Features to Reference

- **Multi-cluster**: Users can switch between clusters using the cluster selector at the top of the sidebar
- **Namespace filtering**: The namespace dropdown at the top filters all views to a specific namespace (or "All Namespaces")
- **Search**: Ctrl+K / Cmd+K opens the command palette for quick resource search
- **YAML editor**: Available on all resource detail pages — users can edit and apply changes directly
- **AI Assistant**: The chat icon in the top bar opens the AI assistant panel
- **Settings**: Gear icon → Settings for plugin configuration, AI assistant settings, etc.

## Common User Tasks

When users ask how to do something, guide them through the Headlamp UI:

- "Where do I see my pods?": Sidebar → Workloads → Pods
- "How do I check logs?": Navigate to the pod → Logs tab
- "How do I edit a resource?": Navigate to the resource → YAML tab → Edit
- "How do I create a resource?": Use the "+" button or paste YAML in the editor
- "How do I switch clusters?": Use the cluster selector in the sidebar header
- "How do I filter by namespace?": Use the namespace dropdown at the top of the sidebar
