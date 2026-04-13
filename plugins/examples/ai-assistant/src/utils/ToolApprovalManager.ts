// Re-export from @headlamp-k8s/ai library
export type { ToolApprovalRequest, ToolApprovalHandler } from '@headlamp-k8s/ai/utils';
export { ToolApprovalManager, toolApprovalManager, autoApproveAll } from '@headlamp-k8s/ai/utils';

// ToolCall is also re-exported here for backward compatibility
export type { ToolCall } from '@headlamp-k8s/ai/ai';
