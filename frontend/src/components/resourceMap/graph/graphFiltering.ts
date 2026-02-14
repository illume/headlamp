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

import { getStatus } from '../nodes/KubeObjectStatus';
import { addPerformanceMetric } from '../PerformanceStats';
import { makeGraphLookup } from './graphLookup';
import { GraphEdge, GraphNode } from './graphModel';

export type GraphFilter =
  | {
      type: 'hasErrors';
    }
  | {
      type: 'namespace';
      namespaces: Set<string>;
    };

/**
 * Filters the graph nodes and edges based on the provided filters
 * The filters are applied using an OR logic, meaning node will be included if it matches any of the filters
 *
 * Along with the matched node result also includes all the nodes that are related to it,
 * even if they don't match the filter
 *
 * The filters can be of the following types:
 * - `hasErrors`: Filters nodes that have errors based on their resource status. See {@link getStatus}
 * - `namespace`: Filters nodes by their namespace
 *
 * @param nodes - List of all the nodes in the graph
 * @param edges - List of all the edges in the graph
 * @param filters - List of fitlers to apply
 */
export function filterGraph(nodes: GraphNode[], edges: GraphEdge[], filters: GraphFilter[]) {
  const perfStart = performance.now();

  if (filters.length === 0) {
    return { nodes, edges };
  }

  const filteredNodes: GraphNode[] = [];
  const filteredEdges: GraphEdge[] = [];

  const visitedNodes = new Set();
  const visitedEdges = new Set();

  const lookupStart = performance.now();
  const graphLookup = makeGraphLookup(nodes, edges);
  const lookupTime = performance.now() - lookupStart;

  /**
   * Add all the nodes that are related to the given node using iterative approach
   * Related means connected by an edge
   * @param node - Given node
   */
  function pushRelatedNodes(startNode: GraphNode) {
    const queue: GraphNode[] = [startNode];

    while (queue.length > 0) {
      const node = queue.shift()!;

      if (visitedNodes.has(node.id)) continue;
      visitedNodes.add(node.id);
      filteredNodes.push(node);

      // Process outgoing edges
      const outgoing = graphLookup.getOutgoingEdges(node.id);
      if (outgoing) {
        for (const edge of outgoing) {
          if (!visitedEdges.has(edge.id)) {
            visitedEdges.add(edge.id);
            filteredEdges.push(edge);
          }
          if (!visitedNodes.has(edge.target)) {
            const targetNode = graphLookup.getNode(edge.target);
            if (targetNode) {
              queue.push(targetNode);
            }
          }
        }
      }

      // Process incoming edges
      const incoming = graphLookup.getIncomingEdges(node.id);
      if (incoming) {
        for (const edge of incoming) {
          if (!visitedEdges.has(edge.id)) {
            visitedEdges.add(edge.id);
            filteredEdges.push(edge);
          }
          if (!visitedNodes.has(edge.source)) {
            const sourceNode = graphLookup.getNode(edge.source);
            if (sourceNode) {
              queue.push(sourceNode);
            }
          }
        }
      }
    }
  }

  const filterStart = performance.now();
  nodes.forEach(node => {
    let keep = true;

    filters.forEach(filter => {
      if (filter.type === 'hasErrors') {
        keep &&=
          'kubeObject' in node &&
          node.kubeObject !== undefined &&
          getStatus(node.kubeObject) !== 'success';
      }
      if (filter.type === 'namespace' && filter.namespaces.size > 0) {
        keep &&=
          'kubeObject' in node &&
          node.kubeObject !== undefined &&
          !!node.kubeObject.metadata?.namespace &&
          filter.namespaces.has(node.kubeObject?.metadata?.namespace);
      }
    });

    if (keep) {
      pushRelatedNodes(node);
    }
  });
  const filterTime = performance.now() - filterStart;

  const totalTime = performance.now() - perfStart;
  console.log(
    `[ResourceMap Performance] filterGraph: ${totalTime.toFixed(2)}ms (lookup: ${lookupTime.toFixed(
      2
    )}ms, filter: ${filterTime.toFixed(2)}ms, nodes: ${nodes.length} -> ${
      filteredNodes.length
    }, edges: ${edges.length} -> ${filteredEdges.length})`
  );

  addPerformanceMetric({
    operation: 'filterGraph',
    duration: totalTime,
    timestamp: Date.now(),
    details: {
      lookupMs: lookupTime.toFixed(1),
      filterMs: filterTime.toFixed(1),
      nodesIn: nodes.length,
      nodesOut: filteredNodes.length,
      edgesIn: edges.length,
      edgesOut: filteredEdges.length,
    },
  });

  return {
    edges: filteredEdges,
    nodes: filteredNodes,
  };
}
