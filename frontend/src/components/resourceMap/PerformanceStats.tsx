import { Box, Chip, IconButton, Paper, Typography } from '@mui/material';
import React from 'react';
import { Icon } from '../common';

/**
 * Performance metric data structure
 */
interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
}

/**
 * Aggregated performance statistics for an operation
 */
interface PerformanceStats {
  operation: string;
  avg: number;
  min: number;
  max: number;
  count: number;
}

/**
 * Global performance metrics storage
 * Stores last 20 operations for each operation type
 */
const performanceMetrics = new Map<string, PerformanceMetric[]>();
const MAX_METRICS_PER_OPERATION = 20;

/**
 * Add a performance metric for an operation
 * SSR-safe: only dispatches events in browser environment
 */
export function addPerformanceMetric(operation: string, duration: number) {
  const metrics = performanceMetrics.get(operation) || [];
  metrics.push({
    operation,
    duration,
    timestamp: Date.now(),
  });

  // Keep only last MAX_METRICS_PER_OPERATION entries
  if (metrics.length > MAX_METRICS_PER_OPERATION) {
    metrics.shift();
  }

  performanceMetrics.set(operation, metrics);

  // Dispatch event for React components to update
  // SSR-safe: only dispatch in browser environment
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('performance-metric-added', { detail: { operation } }));
  }
}

/**
 * Get latest performance metrics for all operations
 */
export function getLatestMetrics(): PerformanceStats[] {
  const stats: PerformanceStats[] = [];

  performanceMetrics.forEach((metrics, operation) => {
    if (metrics.length === 0) return;

    const durations = metrics.map(m => m.duration);
    const sum = durations.reduce((a, b) => a + b, 0);

    stats.push({
      operation,
      avg: sum / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      count: metrics.length,
    });
  });

  return stats;
}

/**
 * Clear all performance metrics
 * SSR-safe: only dispatches events in browser environment
 */
export function clearPerformanceMetrics() {
  performanceMetrics.clear();

  // SSR-safe: only dispatch in browser environment
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('performance-metrics-cleared'));
  }
}

/**
 * PerformanceStats component - Real-time performance metrics panel
 *
 * Displays aggregated performance metrics (avg/min/max/count) for all graph operations.
 * Updates in real-time as operations are performed.
 * SSR-safe with window guards in event listener setup.
 */
export function PerformanceStats() {
  const [stats, setStats] = React.useState<PerformanceStats[]>([]);
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    // SSR-safe: guard window access even though useEffect doesn't run during SSR
    // This prevents crashes in non-browser test/render environments
    if (typeof window === 'undefined') {
      return;
    }

    const updateStats = () => {
      setStats(getLatestMetrics());
    };

    const handleMetricAdded = () => updateStats();
    const handleMetricsCleared = () => {
      setStats([]);
    };

    window.addEventListener('performance-metric-added', handleMetricAdded);
    window.addEventListener('performance-metrics-cleared', handleMetricsCleared);

    // Initial load
    updateStats();

    return () => {
      window.removeEventListener('performance-metric-added', handleMetricAdded);
      window.removeEventListener('performance-metrics-cleared', handleMetricsCleared);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  const totalOperations = stats.reduce((sum, s) => sum + s.count, 0);

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        top: 80,
        right: 16,
        width: 600,
        maxHeight: '80vh',
        overflow: 'auto',
        zIndex: 1300,
        p: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon icon="mdiSpeedometer" />
          <Typography variant="h6">Performance Stats</Typography>
          <Chip label={`${totalOperations} operations`} size="small" />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton size="small" onClick={clearPerformanceMetrics} title="Clear metrics">
            <Icon icon="mdiDelete" />
          </IconButton>
          <IconButton size="small" onClick={() => setIsVisible(false)} title="Close">
            <Icon icon="mdiClose" />
          </IconButton>
        </Box>
      </Box>

      {stats.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No performance data yet. Perform some operations to see metrics.
        </Typography>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Summary (last {MAX_METRICS_PER_OPERATION} operations)
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {stats.map(stat => (
              <Box
                key={stat.operation}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '200px 80px 80px 80px 60px',
                  gap: 2,
                  p: 1,
                  bgcolor: 'background.default',
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {stat.operation}
                </Typography>
                <Chip
                  label={`${stat.avg.toFixed(1)}ms`}
                  size="small"
                  color={stat.avg < 100 ? 'success' : stat.avg < 500 ? 'warning' : 'error'}
                  sx={{ width: 'fit-content' }}
                />
                <Typography variant="caption" color="text.secondary">
                  {stat.min.toFixed(1)}ms
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stat.max.toFixed(1)}ms
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stat.count}
                </Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '200px 80px 80px 80px 60px', gap: 2, mt: 2 }}>
            <Typography variant="caption" fontWeight="bold">
              Operation
            </Typography>
            <Typography variant="caption" fontWeight="bold">
              Avg
            </Typography>
            <Typography variant="caption" fontWeight="bold">
              Min
            </Typography>
            <Typography variant="caption" fontWeight="bold">
              Max
            </Typography>
            <Typography variant="caption" fontWeight="bold">
              Count
            </Typography>
          </Box>
        </>
      )}
    </Paper>
  );
}
