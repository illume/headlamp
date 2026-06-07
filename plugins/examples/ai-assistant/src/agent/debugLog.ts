/**
 * Re-export the debug logger from @headlamp-k8s/ai-common.
 *
 * The canonical implementation now lives in the ai-common package so it can
 * be shared across packages without a headlamp-plugin dependency.
 * This file re-exports everything for backward compatibility.
 */
export {
  debugLog,
  detailLog,
  verboseLog,
  warnLog,
  dumpForTestCase,
} from '@headlamp-k8s/ai-common/agent/debugLog';
