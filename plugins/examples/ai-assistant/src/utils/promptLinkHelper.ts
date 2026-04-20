// Re-export from @headlamp-k8s/ai library
// promptLinksInstructions is Node.js-safe (in /utils)
// getHeadlampLink is browser-only (in /ai) — depends on @kinvolk/headlamp-plugin and window
export { promptLinksInstructions } from '@headlamp-k8s/ai/utils';
export { getHeadlampLink } from '@headlamp-k8s/ai/ai';
