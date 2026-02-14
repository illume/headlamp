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

import { Icon } from '@iconify/react';
import { http, HttpResponse } from 'msw';
import { useEffect, useState } from 'react';
import Pod from '../../lib/k8s/pod';
import { TestContext } from '../../test';
import { podList } from '../pod/storyHelper';
import { GraphEdge, GraphNode, GraphSource } from './graph/graphModel';
import { GraphView } from './GraphView';

export default {
  title: 'GraphView',
  component: GraphView,
  argTypes: {},
  parameters: {
    msw: {
      handlers: {
        story: [
          http.get(
            'http://localhost:4466/apis/apiextensions.k8s.io/v1/customresourcedefinitions',
            () =>
              HttpResponse.json({
                kind: 'List',
                items: [],
                metadata: {},
              })
          ),
          http.get(
            'http://localhost:4466/apis/apiextensions.k8s.io/v1beta1/customresourcedefinitions',
            () => HttpResponse.error()
          ),
        ],
      },
    },
  },
};

const mockNodes: GraphNode[] = [
  {
    id: 'mock-id',
    kubeObject: new Pod(podList[0]),
  },
  {
    id: 'custom-node',
    label: 'Node Label',
    subtitle: 'Node Subtitle',
  },
  {
    id: 'custom-node-with-icon',
    label: 'Node with an icon',
    subtitle: 'Node Subtitle',
    icon: <Icon icon="mdi:plus-circle-outline" width="32px" />,
  },
  {
    id: 'custom-node-with-details',
    label: 'Node with custom details',
    subtitle: 'Click to see custom details',
    detailsComponent: ({ node }) => (
      <div>
        <h3>Custom Details View</h3>
        <p>This is a custom details view for node: {node.label}</p>
      </div>
    ),
  },
  {
    id: 'custon-node-2',
    label: 'Node with children',
    nodes: [
      {
        id: 'some-id',
        label: 'Nested node 1',
      },
      {
        id: 'some-id-2',
        label: 'Nested node 2',
      },
    ],
    edges: [
      {
        id: 'some-edge-1',
        source: 'some-id',
        target: 'some-id-2',
      },
    ],
  },
];

const data = { nodes: mockNodes };

const mockSource: GraphSource = {
  id: 'mock-source',
  label: 'Pods',
  useData() {
    return data;
  },
};

export const BasicExample = () => (
  <TestContext>
    <GraphView height="600px" defaultSources={[mockSource]} />;
  </TestContext>
);
BasicExample.args = {};

/**
 * Generate mock pod data for performance testing
 */
function generateMockPods(count: number, updateCounter: number = 0): Pod[] {
  const pods: Pod[] = [];
  const namespaces = ['default', 'kube-system', 'monitoring', 'production', 'staging'];
  const statuses = ['Running', 'Pending', 'Failed', 'Succeeded', 'Unknown'];
  
  for (let i = 0; i < count; i++) {
    const namespace = namespaces[i % namespaces.length];
    const deploymentIndex = Math.floor(i / 5);
    const podIndex = i % 5;
    
    // Simulate some pods with errors
    const hasError = Math.random() < 0.05; // 5% error rate
    const status = hasError ? 'Failed' : statuses[Math.floor(Math.random() * (statuses.length - 1))];
    
    const podData = {
      apiVersion: 'v1',
      kind: 'Pod',
      metadata: {
        name: `app-deployment-${deploymentIndex}-pod-${podIndex}-${updateCounter}`,
        namespace: namespace,
        uid: `pod-uid-${i}-${updateCounter}`,
        labels: {
          app: `app-${Math.floor(deploymentIndex / 10)}`,
          'app.kubernetes.io/instance': `instance-${Math.floor(deploymentIndex / 5)}`,
          deployment: `app-deployment-${deploymentIndex}`,
        },
        ownerReferences: [
          {
            apiVersion: 'apps/v1',
            kind: 'ReplicaSet',
            name: `app-deployment-${deploymentIndex}-rs`,
            uid: `replicaset-uid-${deploymentIndex}`,
          },
        ],
        resourceVersion: String(1000 + updateCounter),
        creationTimestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      },
      spec: {
        nodeName: `node-${i % 10}`,
        containers: [
          {
            name: 'main',
            image: `myapp:v${Math.floor(updateCounter / 10) + 1}`,
            resources: {
              requests: {
                cpu: '100m',
                memory: '128Mi',
              },
            },
          },
        ],
      },
      status: {
        phase: status,
        conditions: [
          {
            type: 'Ready',
            status: status === 'Running' ? 'True' : 'False',
            lastTransitionTime: new Date(Date.now() - Math.random() * 3600000).toISOString(),
          },
        ],
        containerStatuses: [
          {
            name: 'main',
            ready: status === 'Running',
            restartCount: Math.floor(Math.random() * 3),
            state: {
              running: status === 'Running' ? { startedAt: new Date().toISOString() } : undefined,
              terminated: hasError ? { 
                exitCode: 1, 
                reason: 'Error',
                finishedAt: new Date().toISOString() 
              } : undefined,
            },
          },
        ],
        startTime: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      },
    };
    
    pods.push(new Pod(podData as any));
  }
  
  return pods;
}

/**
 * Generate edges between pods (simulating relationships)
 */
function generateMockEdges(pods: Pod[]): GraphEdge[] {
  const edges: GraphEdge[] = [];
  
  // Add owner reference edges
  pods.forEach(pod => {
    if (pod.metadata.ownerReferences) {
      pod.metadata.ownerReferences.forEach(owner => {
        edges.push({
          id: `${pod.metadata.uid}-${owner.uid}`,
          source: pod.metadata.uid,
          target: owner.uid,
        });
      });
    }
  });
  
  return edges;
}

/**
 * Performance test with 2000 pods
 */
export const PerformanceTest2000Pods = () => {
  const [updateCounter, setUpdateCounter] = useState(0);
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [updateInterval, setUpdateInterval] = useState(2000);
  
  // Generate pods on initial load and when updateCounter changes
  const pods = generateMockPods(2000, updateCounter);
  const edges = generateMockEdges(pods);
  
  const nodes: GraphNode[] = pods.map(pod => ({
    id: pod.metadata.uid,
    kubeObject: pod,
  }));

  const data = { nodes, edges };

  const largeScaleSource: GraphSource = {
    id: 'large-scale-pods',
    label: 'Pods (2000)',
    useData() {
      return data;
    },
  };

  // Auto-update simulation
  useEffect(() => {
    if (!autoUpdate) return;
    
    const interval = setInterval(() => {
      setUpdateCounter(prev => prev + 1);
    }, updateInterval);
    
    return () => clearInterval(interval);
  }, [autoUpdate, updateInterval]);

  return (
    <TestContext>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div style={{ 
          padding: '16px', 
          background: '#f5f5f5', 
          borderBottom: '1px solid #ddd',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <h3 style={{ margin: 0 }}>Performance Test: 2000 Pods</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              onClick={() => setUpdateCounter(prev => prev + 1)}
              style={{ padding: '8px 16px', cursor: 'pointer' }}
            >
              Trigger Update (#{updateCounter})
            </button>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input 
                type="checkbox" 
                checked={autoUpdate} 
                onChange={(e) => setAutoUpdate(e.target.checked)}
              />
              Auto-update
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              Interval:
              <select 
                value={updateInterval} 
                onChange={(e) => setUpdateInterval(Number(e.target.value))}
                disabled={autoUpdate}
              >
                <option value={1000}>1s</option>
                <option value={2000}>2s</option>
                <option value={5000}>5s</option>
                <option value={10000}>10s</option>
              </select>
            </label>
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            Nodes: {nodes.length} | Edges: {edges.length} | Open browser console to see performance metrics
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <GraphView height="100%" defaultSources={[largeScaleSource]} />
        </div>
      </div>
    </TestContext>
  );
};

/**
 * Performance test with 500 pods (moderate scale)
 */
export const PerformanceTest500Pods = () => {
  const [updateCounter, setUpdateCounter] = useState(0);
  
  const pods = generateMockPods(500, updateCounter);
  const edges = generateMockEdges(pods);
  
  const nodes: GraphNode[] = pods.map(pod => ({
    id: pod.metadata.uid,
    kubeObject: pod,
  }));

  const data = { nodes, edges };

  const mediumScaleSource: GraphSource = {
    id: 'medium-scale-pods',
    label: 'Pods (500)',
    useData() {
      return data;
    },
  };

  return (
    <TestContext>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div style={{ 
          padding: '16px', 
          background: '#f5f5f5', 
          borderBottom: '1px solid #ddd',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
        }}>
          <h3 style={{ margin: 0 }}>Performance Test: 500 Pods</h3>
          <button 
            onClick={() => setUpdateCounter(prev => prev + 1)}
            style={{ padding: '8px 16px', cursor: 'pointer' }}
          >
            Trigger Update (#{updateCounter})
          </button>
          <div style={{ fontSize: '14px', color: '#666' }}>
            Nodes: {nodes.length} | Edges: {edges.length} | Check console for timing
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <GraphView height="100%" defaultSources={[mediumScaleSource]} />
        </div>
      </div>
    </TestContext>
  );
};
