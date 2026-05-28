import { checkHolmesAgentHealth } from '../../holmesClient';
import { getSavedConfigurations } from '@headlamp-k8s/ai-common/managers/ProviderConfigManager';
import { Icon } from '@iconify/react';
import { getCluster } from '@kinvolk/headlamp-plugin/lib/Utils';
import {
  Box,
  Button,
  IconButton,
  Paper,
  Popper,
  ToggleButton,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { getSettingsURL, pluginStore, useGlobalState, usePluginConfig } from '../../pluginState';

/**
 * App-bar button for the AI Assistant.
 *
 * Renders a toggle button in the Headlamp top bar that opens/closes the AI
 * panel. When no AI model provider has been configured (and the Holmes agent
 * is unavailable), it shows a one-time configuration popover prompting the
 * user to open settings.
 */
export default function HeadlampAIPrompt() {
  const pluginState = useGlobalState();
  const savedConfigs = usePluginConfig();
  const history = useHistory();
  const [popoverAnchor, setPopoverAnchor] = React.useState<HTMLElement | null>(null);
  const [showPopover, setShowPopover] = React.useState(false);
  const theme = useTheme();

  const hasShownPopover = savedConfigs?.configPopoverShown || false;

  const savedConfigData = React.useMemo(() => {
    return getSavedConfigurations(savedConfigs);
  }, [savedConfigs]);

  const hasAnyValidConfig = savedConfigData.providers && savedConfigData.providers.length > 0;

  const [isAgentAvailable, setIsAgentAvailable] = React.useState(false);
  React.useEffect(() => {
    let cancelled = false;
    const cluster = getCluster();
    if (!cluster) {
      setIsAgentAvailable(false);
      return;
    }
    checkHolmesAgentHealth(cluster, savedConfigs).then(available => {
      if (!cancelled) setIsAgentAvailable(available);
    });
    return () => {
      cancelled = true;
    };
  }, [savedConfigs]);

  React.useEffect(() => {
    if (hasAnyValidConfig && hasShownPopover) {
      const currentConf = pluginStore.get() || {};
      pluginStore.update({
        ...currentConf,
        configPopoverShown: false,
      });
    }
  }, [hasAnyValidConfig, hasShownPopover]);

  React.useEffect(() => {
    if (!hasAnyValidConfig && !hasShownPopover && !pluginState.isUIPanelOpen && !isAgentAvailable) {
      const timer = setTimeout(() => {
        if (!!popoverAnchor) {
          setShowPopover(true);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShowPopover(false);
    }
  }, [
    hasAnyValidConfig,
    popoverAnchor,
    hasShownPopover,
    pluginState.isUIPanelOpen,
    isAgentAvailable,
  ]);

  const handleClosePopover = () => {
    setShowPopover(false);
    const currentConf = pluginStore.get() || {};
    pluginStore.update({
      ...currentConf,
      configPopoverShown: true,
    });
  };

  const handleConfigureClick = () => {
    handleClosePopover();
    history.push(getSettingsURL());
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Tooltip title="AI Assistant">
        <ToggleButton
          ref={el => {
            setPopoverAnchor(el);
          }}
          aria-label={'AI Assistant'}
          onClick={() => {
            pluginState.setIsUIPanelOpen(!pluginState.isUIPanelOpen);
          }}
          selected={pluginState.isUIPanelOpen}
          size="small"
          value="ai-assistant"
        >
          <Icon icon="ai-assistant:logo" width="24px" color={theme.palette.text.primary} />
        </ToggleButton>
      </Tooltip>

      <Popper
        open={showPopover}
        anchorEl={popoverAnchor}
        placement="bottom"
        modifiers={[
          {
            name: 'offset',
            options: {
              offset: [0, 8],
            },
          },
        ]}
        sx={{
          zIndex: theme.zIndex.modal,
        }}
      >
        <Paper
          role="dialog"
          aria-label="Configure AI Assistant"
          elevation={8}
          sx={{
            p: 2,
            maxWidth: 300,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              mb: 1,
            }}
          >
            <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Configure AI Assistant
            </Typography>
            <IconButton size="small" onClick={handleClosePopover} sx={{ ml: 1, mt: -0.5 }}>
              <Icon icon="mdi:close" />
            </IconButton>
          </Box>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            To use the AI Assistant, you need to configure at least one AI model provider in the
            settings.
          </Typography>
          <Button variant="contained" size="small" onClick={handleConfigureClick} fullWidth>
            Open Settings
          </Button>
        </Paper>
      </Popper>
    </Box>
  );
}
