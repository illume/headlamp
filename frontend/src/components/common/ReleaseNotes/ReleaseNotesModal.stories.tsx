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

import ReleaseNotesModal from './ReleaseNotesModal';

export default {
  title: 'common/ReleaseNotes/ReleaseNotesModal',
  component: ReleaseNotesModal,
  argTypes: {},
};

export const Show = {
  args: {
    releaseNotes:
      '# Release Notes\n\n## Hello\n\n### Sub-heading\n\nworld\n\n## Changes\n\n| Feature | Status | Notes |\n|---------|--------|-------|\n| Dark mode | ✅ Done | Available in settings |\n| Tables | ✅ Done | Now rendered properly |\n| Images | ✅ Done | Bounded to container |\n\n## Code Example\n\n```yaml\napiVersion: v1\nkind: Pod\n```\n\n> **Note:** This is a blockquote with important information.',
    appVersion: '1.9.9',
  },
};

export const Closed = {
  args: {
    releaseNotes: undefined,
    appVersion: null,
  },
};

export const ShowNoNotes = {
  args: {
    releaseNotes: undefined,
    appVersion: '1.8.8',
  },
};

export const WithGitHubVideo = {
  args: {
    releaseNotes: `### Release with Videos

This video demonstrates the visualization of NodeClaim (Scaling view) resource metrics, showing how the Karpenter plugin displays real-time scaling data with interactive charts and graphs for monitoring cluster autoscaling behavior.

[Demo: Visualization of NodeClaim (Scaling view) resource metrics](https://github.com/user-attachments/assets/972764eb-0445-4bbe-8097-64dc4c3898d8)

This video shows the new Map View for Karpenter Resources. The map view provides a visual representation of relationships between Karpenter resources (NodeClaims, NodePools) and other Kubernetes resources (Pods, Deployments), making it easier to understand resource dependencies and cluster topology at a glance.

https://github.com/user-attachments/assets/8d7d35bd-e014-4824-bfe8-fe245adfdc65`,
    appVersion: '2.0.0',
  },
};

export const WithImage = {
  args: {
    releaseNotes: `### Release with Image

This screenshot shows the new dashboard layout with improved navigation and cluster overview.

![Headlamp Dashboard](https://raw.githubusercontent.com/headlamp-k8s/headlamp/main/docs/headlamp_light.png)

The new layout provides better visibility of cluster resources and status.`,
    appVersion: '2.1.0',
  },
};

export const WithHtmlImage = {
  args: {
    releaseNotes: `### Release with HTML Image Tag

This release includes improved branding and UI enhancements. Below is the Headlamp logo:

<img src="https://raw.githubusercontent.com/headlamp-k8s/headlamp/main/docs/images/icon.png" alt="Headlamp Logo" width="150" />

The new branding provides a more polished and professional appearance across the application.`,
    appVersion: '2.2.0',
  },
};

export const RealReleaseV042 = {
  args: {
    releaseNotes: `## Hitch hikers guide to Headlamp 0.42.0

Deep-link support was added for pod terminals (?view=exec) and log views (?view=logs), letting users bookmark or share direct links to specific UI states. Resources can now be searched by label in all list views, the Log Viewer gains a severity filter dropdown, and a delete button has been added directly to the plugins list. Node Details received two new sections for pod capacity usage and resource allocation, and the Resource Map now renders status badges on plugin-provided nodes and includes previously missing configuration resources. GRPCRoute details reach full parity with HTTPRoute, and a guided form-based resource creation UI (starting with Pods) is now available alongside the YAML editor.

On the reliability side, a silent cache desync that caused permanently stale cluster data was fixed, along with a lock-order inversion deadlock that could freeze WebSocket connections under load, and a wave of React hooks rule violations across more than a dozen frontend components. Several backend panics were fixed in port-forwarding, kubeconfig parsing, cache key generation, and Helm chart type handling, alongside debounced log aggregation to prevent UI freezes in All Pods mode. Security hardening includes path traversal prevention in the service proxy and dependency bumps.

## ✨ Enhancements

### Added a hidden 'labels' column to all resource list views so users can search resources by label (e.g. \`app=test\`) using the existing search bar.

[![frontend: ResourceTable: Add new 'labels' column to all list views to allow searching by label](https://private-user-images.githubusercontent.com/4517681/572758566-81e57f3f-5124-41e2-9e81-b68b31bc6bc8.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzkyMDY0NTUsIm5iZiI6MTc3OTIwNjE1NSwicGF0aCI6Ii80NTE3NjgxLzU3Mjc1ODU2Ni04MWU1N2YzZi01MTI0LTQxZTItOWU4MS1iNjhiMzFiYzZiYzgucG5nP1gtQW16LUFsZ29yaXRobT1BV1M0LUhNQUMtU0hBMjU2JlgtQW16LUNyZWRlbnRpYWw9QUtJQVZDT0RZTFNBNTNQUUs0WkElMkYyMDI2MDUxOSUyRnVzLWVhc3QtMSUyRnMzJTJGYXdzNF9yZXF1ZXN0JlgtQW16LURhdGU9MjAyNjA1MTlUMTU1NTU1WiZYLUFtei1FeHBpcmVzPTMwMCZYLUFtei1TaWduYXR1cmU9YmI2ZGI0MzgzMjNmZTA2ZTRlYTJiZGNiMWZlYmRkZjBlOTUzZmY2Y2E0YzA5ZDE4OThiYjgwYzc2OGNlOGZlOCZYLUFtei1TaWduZWRIZWFkZXJzPWhvc3QmcmVzcG9uc2UtY29udGVudC10eXBlPWltYWdlJTJGcG5nIn0.g91rIyXZaxwiivaBd_NX_d_L5xRRUvvZrbuSRsiDqkk)](https://private-user-images.githubusercontent.com/4517681/572758566-81e57f3f-5124-41e2-9e81-b68b31bc6bc8.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzkyMDY0NTUsIm5iZiI6MTc3OTIwNjE1NSwicGF0aCI6Ii80NTE3NjgxLzU3Mjc1ODU2Ni04MWU1N2YzZi01MTI0LTQxZTItOWU4MS1iNjhiMzFiYzZiYzgucG5nP1gtQW16LUFsZ29yaXRobT1BV1M0LUhNQUMtU0hBMjU2JlgtQW16LUNyZWRlbnRpYWw9QUtJQVZDT0RZTFNBNTNQUUs0WkElMkYyMDI2MDUxOSUyRnVzLWVhc3QtMSUyRnMzJTJGYXdzNF9yZXF1ZXN0JlgtQW16LURhdGU9MjAyNjA1MTlUMTU1NTU1WiZYLUFtei1FeHBpcmVzPTMwMCZYLUFtei1TaWduYXR1cmU9YmI2ZGI0MzgzMjNmZTA2ZTRlYTJiZGNiMWZlYmRkZjBlOTUzZmY2Y2E0YzA5ZDE4OThiYjgwYzc2OGNlOGZlOCZYLUFtei1TaWduZWRIZWFkZXJzPWhvc3QmcmVzcG9uc2UtY29udGVudC10eXBlPWltYWdlJTJGcG5nIn0.g91rIyXZaxwiivaBd_NX_d_L5xRRUvvZrbuSRsiDqkk)

### Added a delete button directly to the plugins list page, so users can remove plugins without navigating to the detail page first.

[![frontend: Add delete button to plugin list](https://private-user-images.githubusercontent.com/75609067/585967780-58dc151b-b211-4a00-bebb-71e3e43f7875.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzkyMDY0NTUsIm5iZiI6MTc3OTIwNjE1NSwicGF0aCI6Ii83NTYwOTA2Ny81ODU5Njc3ODAtNThkYzE1MWItYjIxMS00YTAwLWJlYmItNzFlM2U0M2Y3ODc1LnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNjA1MTklMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjYwNTE5VDE1NTU1NVomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTg0ZmI2YmExNjUyNTlmNTYwNGQzMmIwMzFiNGJjODQ5ODk4NzVmM2I3YmNhODllNDM1YTEyNDA0OGJlOTAxZmUmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0JnJlc3BvbnNlLWNvbnRlbnQtdHlwZT1pbWFnZSUyRnBuZyJ9.RB-Hvhp0_C3Mq2orB1omo8kuLHvkrEH_ZtGkoNERhWw)](https://private-user-images.githubusercontent.com/75609067/585967780-58dc151b-b211-4a00-bebb-71e3e43f7875.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzkyMDY0NTUsIm5iZiI6MTc3OTIwNjE1NSwicGF0aCI6Ii83NTYwOTA2Ny81ODU5Njc3ODAtNThkYzE1MWItYjIxMS00YTAwLWJlYmItNzFlM2U0M2Y3ODc1LnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNjA1MTklMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjYwNTE5VDE1NTU1NVomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTg0ZmI2YmExNjUyNTlmNTYwNGQzMmIwMzFiNGJjODQ5ODk4NzVmM2I3YmNhODllNDM1YTEyNDA0OGJlOTAxZmUmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0JnJlc3BvbnNlLWNvbnRlbnQtdHlwZT1pbWFnZSUyRnBuZyJ9.RB-Hvhp0_C3Mq2orB1omo8kuLHvkrEH_ZtGkoNERhWw)

### Added a guided form-based UI for creating Kubernetes resources (starting with Pods), accessible from the sidebar and Pod list page alongside the existing YAML editor workflow.

[![frontend: CreateResourceForm: Add resource form create feature and CreateResourceForm](https://private-user-images.githubusercontent.com/78232183/578857753-1c871ccd-8d59-4748-89f1-f8934df991d6.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzkyMDY0NTUsIm5iZiI6MTc3OTIwNjE1NSwicGF0aCI6Ii83ODIzMjE4My81Nzg4NTc3NTMtMWM4NzFjY2QtOGQ1OS00NzQ4LTg5ZjEtZjg5MzRkZjk5MWQ2LnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNjA1MTklMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjYwNTE5VDE1NTU1NVomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPWU3YmUzZTdmYmM1NTgxNTEzOTY0MzMwNzMxZjQwZGIzZTAzMzUyMWJjYjllZDEzY2IzZTg1YWFjZTIwOTUwM2MmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0JnJlc3BvbnNlLWNvbnRlbnQtdHlwZT1pbWFnZSUyRnBuZyJ9.eCwt9ELuHvnnxavgnrnNiaUprKW9zI5P5cuDI1qUK4Y)](https://private-user-images.githubusercontent.com/78232183/578857753-1c871ccd-8d59-4748-89f1-f8934df991d6.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzkyMDY0NTUsIm5iZiI6MTc3OTIwNjE1NSwicGF0aCI6Ii83ODIzMjE4My81Nzg4NTc3NTMtMWM4NzFjY2QtOGQ1OS00NzQ4LTg5ZjEtZjg5MzRkZjk5MWQ2LnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNjA1MTklMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjYwNTE5VDE1NTU1NVomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPWU3YmUzZTdmYmM1NTgxNTEzOTY0MzMwNzMxZjQwZGIzZTAzMzUyMWJjYjllZDEzY2IzZTg1YWFjZTIwOTUwM2MmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0JnJlc3BvbnNlLWNvbnRlbnQtdHlwZT1pbWFnZSUyRnBuZyJ9.eCwt9ELuHvnnxavgnrnNiaUprKW9zI5P5cuDI1qUK4Y)`,
    appVersion: '0.42.0',
  },
};
