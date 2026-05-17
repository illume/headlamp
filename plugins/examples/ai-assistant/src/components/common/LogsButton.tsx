import { Icon } from '@iconify/react';
import { Box, Button, Paper, Typography } from '@mui/material';
import React, { useState } from 'react';
import LogsDialog from './LogsDialog';

/** Props for the LogsButton component that shows a button to open a logs dialog. */
interface LogsButtonProps {
  /** The raw log text content to display when the button is clicked. */
  logs: string;
  /** The Kubernetes resource name associated with these logs. */
  resourceName?: string;
  /** The type/kind of the Kubernetes resource (e.g. "Pod"). */
  resourceType?: string;
  /** The namespace of the Kubernetes resource. */
  namespace?: string;
  /** The container name within the pod, if applicable. */
  containerName?: string;
}

const LogsButton: React.FC<LogsButtonProps> = ({
  logs,
  resourceName = 'resource',
  resourceType = 'Resource',
  namespace,
  containerName,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const getTitle = () => {
    const parts = [resourceType];
    if (resourceName) {
      parts.push(resourceName);
    }
    if (containerName) {
      parts.push(`(container: ${containerName})`);
    } else if (namespace) {
      parts.push(`(${namespace})`);
    }
    parts.push('Logs');
    return parts.join(' ');
  };

  return (
    <>
      <Paper
        elevation={1}
        sx={{
          p: 2,
          my: 1,
          border: '1px solid',
          borderColor: 'primary.main',
          borderRadius: 1,
          backgroundColor: theme =>
            theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              {getTitle()}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Icon icon="mdi:code-braces" />}
            onClick={() => setDialogOpen(true)}
            size="small"
          >
            View in Editor
          </Button>
        </Box>
      </Paper>

      <LogsDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        logs={logs}
        title={getTitle()}
        resourceName={resourceName}
      />
    </>
  );
};

export default LogsButton;
