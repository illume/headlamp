/**
 * Custom hook to fetch warnings and errors for multiple clusters
 * This replaces the non-existent Event.useWarningList method
 */

import Event from '@kinvolk/headlamp-plugin/lib/K8s/event';
import { useMemo } from 'react';

/** Map of cluster names to their warning events and optional fetch error. */
export interface EventsPerCluster {
  [cluster: string]: {
    /** Warning-level Kubernetes events for this cluster. */
    warnings: Event[];
    /** Error encountered while fetching events, if any. */
    error?: Error | null;
  };
}

export function useClusterWarnings(clusterNames: string[]): EventsPerCluster {
  // Get events for all clusters
  const warningsPerCluster = Event.useWarningList(clusterNames);

  return useMemo(() => {
    const result: EventsPerCluster = {};
    // Initialize result for each cluster
    clusterNames.forEach(clusterName => {
      result[clusterName] = {
        warnings: warningsPerCluster[clusterName]?.warnings ?? [],
        error: warningsPerCluster[clusterName]?.error ?? null,
      };
    });

    return result;
  }, [warningsPerCluster]);
}
