import { Icon } from '@iconify/react';
import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import React from 'react';

/** Props for the AIAssistantHeader component displayed at the top of the assistant panel. */
interface AIAssistantHeaderProps {
  /** Whether the assistant is operating in test mode. */
  isTestMode: boolean;
  /** Whether the settings navigation button should be disabled. */
  disableSettingsButton: boolean;
  /** Callback invoked when the user closes the assistant panel. */
  onClose: () => void;
  /** Callback invoked when the user clicks the settings button. */
  onSettings: () => void;
}

export default function AIAssistantHeader({
  isTestMode,
  disableSettingsButton,
  onClose,
  onSettings,
}: AIAssistantHeaderProps) {
  return (
    <Box
      sx={{
        padding: 1,
        borderBottom: 1,
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography variant="h6">
          AI Assistant (alpha)
          {isTestMode && (
            <Chip
              label="TEST MODE"
              color="warning"
              size="small"
              sx={{ ml: 1, fontSize: '0.7rem' }}
            />
          )}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Tooltip title="Settings">
          <span>
            <IconButton
              onClick={onSettings}
              disabled={disableSettingsButton}
              size="small"
            >
              <Icon icon="mdi:settings" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Close">
          <IconButton onClick={onClose} size="small">
            <Icon icon="mdi:close" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
