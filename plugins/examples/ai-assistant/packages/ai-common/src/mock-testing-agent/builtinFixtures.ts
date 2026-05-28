/*
 * Copyright 2025 The Kubernetes Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Built-in mock agent session fixtures embedded as TypeScript constants.
 *
 * These provide ready-to-use agent session simulations for common
 * Kubernetes troubleshooting and exploration scenarios.
 */

import type { MockAgentSession } from './MockTestingAgent';

/** A "pod troubleshooting" agent session with realistic thinking steps. */
export const POD_TROUBLESHOOTING_SESSION: MockAgentSession = {
  name: 'pod-troubleshooting',
  description:
    'Simulates an agent diagnosing a failing pod — walks through model loading, planning, kubectl calls, and diagnosis.',
  question: 'why is my pod failing',
  steps: [
    {
      phase: 'init',
      label: 'Model: gpt-4o',
      durationMs: 150,
    },
    {
      phase: 'init',
      label: 'Toolset: kubernetes-tools loaded',
      durationMs: 100,
    },
    {
      phase: 'planning',
      label: 'Get pod status and events',
      durationMs: 80,
    },
    {
      phase: 'planning',
      label: 'Check container logs for errors',
      durationMs: 80,
    },
    {
      phase: 'planning',
      label: 'Analyze resource limits and node conditions',
      durationMs: 80,
    },
    {
      phase: 'executing',
      label: 'Running kubectl get pods',
      toolCall: {
        tool: 'call_kubectl',
        input: 'get pods -A -o wide',
        output:
          'NAMESPACE   NAME                    READY   STATUS             RESTARTS   AGE\ndefault     nginx-abc123            0/1     CrashLoopBackOff   5          10m',
        durationMs: 300,
      },
      durationMs: 300,
    },
    {
      phase: 'executing',
      label: 'Running kubectl describe pod',
      toolCall: {
        tool: 'call_kubectl',
        input: 'describe pod nginx-abc123',
        output:
          'Events:\n  Warning  BackOff  2m   kubelet  Back-off restarting failed container\n  Warning  Failed   3m   kubelet  Error: ImagePullBackOff',
        durationMs: 250,
      },
      durationMs: 250,
    },
    {
      phase: 'executing',
      label: 'Running kubectl logs',
      toolCall: {
        tool: 'call_kubectl',
        input: 'logs nginx-abc123 --previous',
        output: 'Error: unable to pull image "nginx:latest-invalid": not found',
        durationMs: 200,
      },
      durationMs: 200,
    },
  ],
  answer: `Your pod **nginx-abc123** is in a \`CrashLoopBackOff\` state. Here's what I found:

## Root Cause

The container image \`nginx:latest-invalid\` cannot be pulled — the tag does not exist.

## Events

\`\`\`
Warning  BackOff  2m   kubelet  Back-off restarting failed container
Warning  Failed   3m   kubelet  Error: ImagePullBackOff
\`\`\`

## Fix

Update the pod's image to a valid tag:

\`\`\`bash
kubectl set image deployment/nginx nginx=nginx:1.25
\`\`\`

Or edit the deployment directly:

\`\`\`bash
kubectl edit deployment nginx
\`\`\`

Change \`image: nginx:latest-invalid\` to \`image: nginx:1.25\` (or another valid tag).`,
};

/** A "cluster exploration" agent session with thinking steps. */
export const CLUSTER_EXPLORATION_SESSION: MockAgentSession = {
  name: 'cluster-exploration',
  description:
    'Simulates an agent exploring cluster state — lists nodes, namespaces, and workloads.',
  question: 'what is running in my cluster',
  steps: [
    {
      phase: 'init',
      label: 'Model: gpt-4o',
      durationMs: 150,
    },
    {
      phase: 'init',
      label: 'Toolset: kubernetes-tools loaded',
      durationMs: 100,
    },
    {
      phase: 'planning',
      label: 'List cluster nodes and their status',
      durationMs: 80,
    },
    {
      phase: 'planning',
      label: 'List namespaces',
      durationMs: 80,
    },
    {
      phase: 'planning',
      label: 'List workloads across namespaces',
      durationMs: 80,
    },
    {
      phase: 'executing',
      label: 'Running kubectl get nodes',
      toolCall: {
        tool: 'call_kubectl',
        input: 'get nodes -o wide',
        output:
          'NAME     STATUS   ROLES           AGE   VERSION\nnode-0   Ready    control-plane   7d    v1.32.0\nnode-1   Ready    worker          7d    v1.32.0\nnode-2   Ready    worker          7d    v1.32.0',
        durationMs: 200,
      },
      durationMs: 200,
    },
    {
      phase: 'executing',
      label: 'Running kubectl get namespaces',
      toolCall: {
        tool: 'call_kubectl',
        input: 'get namespaces',
        output:
          'NAME              STATUS   AGE\ndefault           Active   7d\nkube-system       Active   7d\nkube-public       Active   7d\nmonitoring        Active   3d',
        durationMs: 150,
      },
      durationMs: 150,
    },
    {
      phase: 'executing',
      label: 'Running kubectl get deployments',
      toolCall: {
        tool: 'call_kubectl',
        input: 'get deployments -A',
        output:
          'NAMESPACE      NAME                  READY   AGE\ndefault        nginx-deployment      3/3     2d\nkube-system    coredns               2/2     7d\nmonitoring     prometheus-server      1/1     3d',
        durationMs: 200,
      },
      durationMs: 200,
    },
  ],
  answer: `Here's an overview of your cluster:

## Nodes (3)

| Name | Status | Roles | Version |
|------|--------|-------|---------|
| node-0 | Ready | control-plane | v1.32.0 |
| node-1 | Ready | worker | v1.32.0 |
| node-2 | Ready | worker | v1.32.0 |

All nodes are healthy and running Kubernetes v1.32.0.

## Namespaces (4)

\`default\`, \`kube-system\`, \`kube-public\`, \`monitoring\`

## Workloads

| Namespace | Deployment | Ready |
|-----------|-----------|-------|
| default | nginx-deployment | 3/3 |
| kube-system | coredns | 2/2 |
| monitoring | prometheus-server | 1/1 |

Everything looks healthy — all deployments have their desired replica count.`,
};

/** All built-in sessions. */
export const BUILTIN_SESSIONS: MockAgentSession[] = [
  POD_TROUBLESHOOTING_SESSION,
  CLUSTER_EXPLORATION_SESSION,
];
