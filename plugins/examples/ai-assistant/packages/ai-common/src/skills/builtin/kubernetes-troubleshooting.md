---
name: kubernetes-troubleshooting
description: Common Kubernetes troubleshooting procedures for pods, services, and cluster issues
version: 1.0.0
author: Headlamp
license: Apache-2.0
tags: [kubernetes, troubleshooting, debugging, pods, services]
tool: headlamp
---

# Kubernetes Troubleshooting Guide

When a user asks about Kubernetes issues, use this guide to provide structured troubleshooting advice. Always suggest using Headlamp's UI features (Logs tab, Events tab, resource details) instead of kubectl commands.

## Pod Issues

### CrashLoopBackOff
A pod repeatedly crashes and Kubernetes keeps restarting it.

1. **Check logs**: Guide the user to the pod's Logs tab in Headlamp to see crash output
2. **Check events**: Look at the pod's Events tab for scheduling or resource errors
3. **Check resource limits**: Look for OOMKilled in the pod status — the container may need more memory
4. **Check image**: Verify the container image exists and is pullable (ImagePullBackOff is a separate issue)
5. **Check startup probes**: A failing startup probe causes repeated restarts
6. **Check environment variables**: Missing ConfigMap/Secret references cause immediate crashes

### OOMKilled
The container was terminated because it exceeded its memory limit.

1. Check the container's memory limits vs actual usage in the resource metrics
2. Suggest increasing the memory limit if the application genuinely needs more
3. Look for memory leaks — if usage grows unbounded over time, the application has a bug
4. Show how to view resource metrics in Headlamp's pod details

### ImagePullBackOff
Kubernetes cannot pull the container image.

1. Verify the image name and tag are correct
2. Check if imagePullSecrets are configured for private registries
3. Test registry connectivity from the cluster nodes
4. Check if the image tag exists (a typo like `lates` instead of `latest`)

### Pending
The pod cannot be scheduled to a node.

1. Check node resources — there may not be enough CPU or memory
2. Check node selectors and tolerations — the pod may require a specific node type
3. Check PersistentVolumeClaims — an unbound PVC blocks pod scheduling
4. Check ResourceQuota — the namespace may be at its resource limit

### Evicted
The node evicted the pod due to resource pressure.

1. Check node conditions (DiskPressure, MemoryPressure)
2. Review pod priority classes — lower-priority pods are evicted first
3. Consider setting appropriate resource requests to guarantee allocation

## Service Issues

### Service Not Reachable
When a service doesn't respond to requests.

1. Verify the service selectors match the pod labels
2. Check that target pods are Running and Ready
3. Verify the target port matches the container port
4. Check NetworkPolicies that might block traffic
5. For LoadBalancer services, check if the external IP has been assigned

### DNS Resolution Failures
Pods cannot resolve service names.

1. Check if CoreDNS pods are running in kube-system namespace
2. Verify the service exists in the correct namespace
3. Use the full FQDN: `<service>.<namespace>.svc.cluster.local`
4. Check if the pod's DNS policy allows cluster DNS

## Node Issues

### NotReady
A node is not accepting new pods.

1. Check node conditions in Headlamp's node details
2. Look for kubelet issues — the kubelet may be down or unresponsive
3. Check system resources (disk, memory, PIDs)
4. Review recent node events for error messages

### DiskPressure
The node is running low on disk space.

1. Identify and clean up unused container images
2. Check for large log files or temporary files
3. Consider increasing the node's disk size
4. Review pod eviction thresholds in kubelet configuration

## Deployment Issues

### Rollout Stuck
A deployment update is not progressing.

1. Check the deployment's rollout status and conditions
2. Look at the new ReplicaSet's pods for errors
3. Verify the deployment strategy (RollingUpdate vs Recreate)
4. Check if there are enough resources to schedule new pods alongside old ones
5. Review progressDeadlineSeconds — the rollout may need more time

### Scaling Issues
Horizontal Pod Autoscaler is not scaling as expected.

1. Verify metrics-server is installed and running
2. Check HPA conditions and events in Headlamp
3. Ensure resource requests are set on containers (HPA needs them for CPU-based scaling)
4. Review minReplicas, maxReplicas, and target utilization settings
