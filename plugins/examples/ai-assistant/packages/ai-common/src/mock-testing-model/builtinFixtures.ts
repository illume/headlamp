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
 * Built-in fixture data embedded as TypeScript constants so they work in
 * both Node.js and browser environments without JSON import assertions.
 *
 * The canonical JSON files in `./fixtures/` are the source of truth —
 * update them and regenerate this file if fixtures change.
 */

import type { FixtureEntry, FixtureSequence } from './MockTestingModel';

/** Built-in prompt and response fixtures used by the mock testing model. */
export const GENERAL_FIXTURES: FixtureEntry[] = [
  {
    prompt: 'Hello',
    response:
      "Hello! I'm the Headlamp AI assistant. I can help you explore and manage your Kubernetes cluster. What would you like to know?",
  },
  {
    prompt: 'What is a <<resource>>?',
    response:
      'A **<<resource>>** is a Kubernetes resource managed by the API server. You can view <<resource>> resources in Headlamp by navigating to the appropriate section in the sidebar.',
  },
  {
    prompt: 'How do I create a <<resource>>?',
    response:
      'To create a <<resource>>, you can use `kubectl create` or `kubectl apply` with a YAML manifest, or click the **Create** button in Headlamp and paste your YAML definition.',
  },
  {
    prompt: 'List all <<resource>> in <<namespace>>',
    response:
      'To list all <<resource>> in the **<<namespace>>** namespace, run:\n\n```bash\nkubectl get <<resource>> -n <<namespace>>\n```\n\nOr navigate to the <<resource>> section in Headlamp and filter by namespace.',
  },
  {
    prompt: 'Delete <<resource>> <<name>>',
    response:
      'To delete the <<resource>> **<<name>>**, run:\n\n```bash\nkubectl delete <<resource>> <<name>>\n```\n\n⚠️ This action is irreversible. Make sure you have a backup if needed.',
  },
  {
    prompt: 'What namespaces are available?',
    response:
      "Your cluster's namespaces can be viewed in Headlamp under **Cluster** > **Namespaces**. Common namespaces include `default`, `kube-system`, and `kube-public`.",
  },
  {
    prompt: 'Show me the logs for <<name>>',
    response:
      'To view logs for **<<name>>**, run:\n\n```bash\nkubectl logs <<name>>\n```\n\nIn Headlamp, navigate to the pod detail page and click the **Logs** tab.',
  },
  {
    prompt: 'How do I scale <<name>> to <<count>> replicas?',
    response:
      'To scale **<<name>>** to <<count>> replicas:\n\n```bash\nkubectl scale deployment/<<name>> --replicas=<<count>>\n```\n\nOr edit the deployment in Headlamp and change the `replicas` field.',
  },
  {
    prompt: 'What is the status of <<name>>?',
    response:
      'To check the status of **<<name>>**, run:\n\n```bash\nkubectl describe <<name>>\n```\n\nIn Headlamp, click on the resource name to see its details, events, and conditions.',
  },
  {
    prompt: 'Explain <<concept>>',
    response:
      '**<<concept>>** is a Kubernetes concept. You can learn more about it in the official Kubernetes documentation at https://kubernetes.io/docs/.',
  },
];

/** Built-in scripted conversation for the cluster exploration demo. */
export const DEMO_CLUSTER_EXPLORATION: FixtureSequence = {
  name: 'cluster-exploration-demo',
  description:
    'A scripted demo conversation exploring a Kubernetes cluster — suitable for walkthroughs and presentations. Each turn plays back in order regardless of what the user types.',
  sequence: [
    {
      prompt: 'Hello',
      response:
        "Hello! I'm the Headlamp AI assistant. I can help you explore and manage your Kubernetes cluster. What would you like to know?",
    },
    {
      prompt: 'What nodes are in the cluster?',
      response:
        'Your cluster has the following nodes:\n\n| Name | Status | Roles | Version |\n|------|--------|-------|---------|\n| node-0 | Ready | control-plane | v1.32.0 |\n| node-1 | Ready | worker | v1.32.0 |\n| node-2 | Ready | worker | v1.32.0 |\n\nAll nodes are healthy and running Kubernetes v1.32.0. You can view detailed node information in Headlamp under **Cluster** > **Nodes**.',
    },
    {
      prompt: 'What pods are running in the default namespace?',
      response:
        'Here are the pods in the **default** namespace:\n\n| Name | Status | Restarts | Age |\n|------|--------|----------|-----|\n| nginx-deployment-abc123 | Running | 0 | 2h |\n| nginx-deployment-def456 | Running | 0 | 2h |\n| nginx-deployment-ghi789 | Running | 0 | 2h |\n\nAll 3 pods are healthy with zero restarts. They belong to the `nginx-deployment` Deployment.',
    },
    {
      prompt: 'Can you show me the nginx deployment details?',
      response:
        'Here are the details for the **nginx-deployment**:\n\n```yaml\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: nginx-deployment\n  namespace: default\nspec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: nginx\n  template:\n    spec:\n      containers:\n      - name: nginx\n        image: nginx:1.25\n        ports:\n        - containerPort: 80\n        resources:\n          requests:\n            cpu: 100m\n            memory: 128Mi\n```\n\nThe deployment is running **3/3 replicas** with the `nginx:1.25` image. You can view this in Headlamp by navigating to **Workloads** > **Deployments** > **nginx-deployment**.',
    },
    {
      prompt: 'How do I scale it to 5 replicas?',
      response:
        "To scale **nginx-deployment** to 5 replicas:\n\n```bash\nkubectl scale deployment/nginx-deployment --replicas=5\n```\n\nOr you can do it directly in Headlamp:\n1. Go to **Workloads** > **Deployments** > **nginx-deployment**\n2. Click the **Edit** button\n3. Change `replicas` from 3 to 5\n4. Save the changes\n\nThe Deployment controller will create 2 additional Pods to reach the desired count.",
    },
    {
      prompt: 'What services are available?',
      response:
        'Here are the services in the **default** namespace:\n\n| Name | Type | Cluster IP | Ports |\n|------|------|-----------|-------|\n| kubernetes | ClusterIP | 10.96.0.1 | 443/TCP |\n| nginx-service | ClusterIP | 10.96.45.12 | 80/TCP |\n\nThe `nginx-service` routes traffic to the nginx deployment pods on port 80. You can view services in Headlamp under **Network** > **Services**.',
    },
  ],
};
