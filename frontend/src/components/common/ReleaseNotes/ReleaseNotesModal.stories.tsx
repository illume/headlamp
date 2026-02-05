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
    releaseNotes: '### Hello\n\nworld',
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
