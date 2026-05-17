import { Prompt } from '@headlamp-k8s/ai-common/ai/manager';
import { Link } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Alert, Box, Button } from '@mui/material';
import React from 'react';
// [PROACTIVE_DIAGNOSIS_DISABLED] import { useProactiveDiagnosis } from '@headlamp-k8s/ai-ui/hooks/useProactiveDiagnosis';
import TextStreamContainer from '../../textstream';
// [PROACTIVE_DIAGNOSIS_DISABLED] import ProactiveDiagnosisSection from './ProactiveDiagnosisSection';

/** Props for the AIChatContent component that renders the chat message history. */
interface AIChatContentProps {
  /** Array of chat messages (prompts and responses) to display. */
  history: Prompt[];
  /** Whether an AI response is currently being generated. */
  isLoading: boolean;
  /** Error message from the last API call, or null if none. */
  apiError: string | null;
  /** Callback invoked when a Kubernetes API operation succeeds. */
  onOperationSuccess: (response: any) => void;
  /** Callback invoked when a Kubernetes API operation fails. */
  onOperationFailure: (error: any, operationType: string, resourceInfo?: any) => void;
  /** Callback invoked when the user triggers a YAML apply/delete action. */
  onYamlAction: (yaml: string, title: string, type: string, isDeleteOp: boolean) => void;
  /** Callback to retry a failed tool invocation with the given name and arguments. */
  onRetryTool?: (toolName: string, args: Record<string, any>) => void;
}

export default function AIChatContent({
  history,
  isLoading,
  apiError,
  onOperationSuccess,
  onOperationFailure,
  onYamlAction,
  onRetryTool,
}: AIChatContentProps) {
  // [PROACTIVE_DIAGNOSIS_DISABLED]
  // const { diagnoses, isCycleRunning, scrollToEventUid, clearScrollTarget } =
  //   useProactiveDiagnosis();

  return (
    <Box
      sx={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'auto', // Allow horizontal scrolling when needed
        maxWidth: '100%',
        minWidth: 0,
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
      }}
    >
      {/* [PROACTIVE_DIAGNOSIS_DISABLED]
      <ProactiveDiagnosisSection
        diagnoses={diagnoses}
        scrollToEventUid={scrollToEventUid}
        onScrollComplete={clearScrollTarget}
        isCycleRunning={isCycleRunning}
        onYamlAction={onYamlAction}
      />
      */}

      {apiError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small">
              <Link
                routeName="pluginDetails"
                params={{
                  name: '@headlamp-k8s/ai-assistant',
                }}
              >
                Settings
              </Link>
            </Button>
          }
        >
          {apiError}
        </Alert>
      )}

      <TextStreamContainer
        history={history}
        isLoading={isLoading}
        apiError={apiError}
        onOperationSuccess={onOperationSuccess}
        onOperationFailure={onOperationFailure}
        onYamlAction={onYamlAction}
        onRetryTool={onRetryTool}
      />
    </Box>
  );
}
