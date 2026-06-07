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

import { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import AgentModeSelector from './AgentModeSelector';

export default {
  title: 'AI UI/AgentModeSelector',
  component: AgentModeSelector,
} as Meta;

const Template: StoryFn<React.ComponentProps<typeof AgentModeSelector>> = args => (
  <AgentModeSelector {...args} />
);

export const ChatMode = Template.bind({});
ChatMode.args = {
  mode: 'chat',
  onModeChange: (mode: 'chat' | 'agent') => console.log('Mode changed:', mode),
  aksAgentClusters: [],
  selectedAgentCluster: '',
  onAgentClusterChange: (cluster: string) => console.log('Cluster changed:', cluster),
  isCheckingClusters: false,
};

export const AgentModeWithClusters = Template.bind({});
AgentModeWithClusters.args = {
  mode: 'agent',
  onModeChange: (mode: 'chat' | 'agent') => console.log('Mode changed:', mode),
  aksAgentClusters: ['prod-cluster', 'dev-cluster'],
  selectedAgentCluster: 'prod-cluster',
  onAgentClusterChange: (cluster: string) => console.log('Cluster changed:', cluster),
  isCheckingClusters: false,
};

export const AgentModeNoClusters = Template.bind({});
AgentModeNoClusters.args = {
  mode: 'agent',
  onModeChange: (mode: 'chat' | 'agent') => console.log('Mode changed:', mode),
  aksAgentClusters: [],
  selectedAgentCluster: '',
  onAgentClusterChange: (cluster: string) => console.log('Cluster changed:', cluster),
  isCheckingClusters: false,
};

export const AgentModeChecking = Template.bind({});
AgentModeChecking.args = {
  mode: 'agent',
  onModeChange: (mode: 'chat' | 'agent') => console.log('Mode changed:', mode),
  aksAgentClusters: [],
  selectedAgentCluster: '',
  onAgentClusterChange: (cluster: string) => console.log('Cluster changed:', cluster),
  isCheckingClusters: true,
};
