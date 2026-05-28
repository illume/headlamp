import {
  getActiveConfig,
  SavedConfigurations,
} from '@headlamp-k8s/ai-common/managers/ProviderConfigManager';
import { getDefaultConfig } from '@headlamp-k8s/ai-ui/config/modelConfig';
import { isTestModeCheck } from '@headlamp-k8s/ai-ui/testing/testMode';
import {
  Box,
  Button,
  Divider,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material';
import React from 'react';
import {
  getAllAvailableTools,
  isToolEnabled,
  pluginStore,
  toggleTool,
  usePluginConfig,
} from '../../pluginState';
import { HolmesAgentSettings } from './HolmesAgentSettings';
import { MCPSettings } from './MCPSettings';
import ModelSelector from './ModelSelector';

/**
 * Plugin settings page for the AI Assistant.
 *
 * Renders model-provider selection (via {@link ModelSelector}), a test-mode
 * toggle, AI-tool enable/disable switches, and MCP server configuration.
 * Registered with `registerPluginSettings` so it appears on the Headlamp
 * settings route.
 */
export default function Settings() {
  const savedConfigs = usePluginConfig();

  const [activeConfiguration, setActiveConfiguration] = React.useState<{
    /** Provider identifier (e.g. `"openai"`, `"anthropic"`). */
    providerId: string;
    /** Provider-specific configuration values (API key, model name, etc.). */
    config: Record<string, any>;
    /** Human-readable name for this configuration entry. */
    displayName: string;
  }>(() => {
    const activeConfig = getActiveConfig(savedConfigs);
    if (activeConfig) {
      return {
        providerId: activeConfig.providerId,
        config: { ...activeConfig.config },
        displayName: activeConfig.displayName || '',
      };
    }
    return { providerId: 'openai', config: getDefaultConfig('openai'), displayName: '' };
  });

  const handleModelSelectorChange = (changes: {
    providerId: string;
    config: Record<string, any>;
    displayName: string;
    savedConfigs?: SavedConfigurations;
  }) => {
    setActiveConfiguration({
      providerId: changes.providerId,
      config: changes.config,
      displayName: changes.displayName,
    });

    if (changes.savedConfigs) {
      pluginStore.update(changes.savedConfigs as any);
    }
  };

  const handleTestModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isTestMode = event.target.checked;
    const currentConf = pluginStore.get() || {};
    pluginStore.update({
      ...currentConf,
      testMode: isTestMode,
    });
  };

  const handleResetPopover = () => {
    const currentConf = pluginStore.get() || {};
    pluginStore.update({
      ...currentConf,
      configPopoverShown: false,
    });
  };

  const isTestMode = isTestModeCheck();
  const hasShownConfigPopover = savedConfigs?.configPopoverShown || false;

  const toolsList = getAllAvailableTools();
  const pluginSettings = savedConfigs;

  const handleToolToggle = (toolId: string) => {
    const updatedSettings = toggleTool(pluginSettings, toolId);
    pluginStore.update(updatedSettings);
  };

  return (
    <Box width={'100%'}>
      <Typography variant="body1" sx={{ mb: 3 }}>
        This plugin is in early development and is not yet ready for production use. Using it may
        incur in costs from the AI provider! Use at your own risk.
      </Typography>

      <Divider sx={{ my: 3 }} />
      {isTestMode && (
        <>
          <Box sx={{ mb: 3, ml: 2 }}>
            <FormControlLabel
              control={
                <Switch checked={isTestMode} onChange={handleTestModeChange} color="primary" />
              }
              label={
                <Box>
                  <Typography variant="body1">Test Mode</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Enable test mode to manually input AI responses and see how they render in the
                    chat window
                  </Typography>
                </Box>
              }
            />
          </Box>

          <Box sx={{ mb: 3, ml: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="body1">Configuration Popover</Typography>
                <Typography variant="caption" color="text.secondary">
                  {hasShownConfigPopover
                    ? 'The configuration popover has been shown and dismissed'
                    : 'The configuration popover will show when no AI providers are configured'}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={handleResetPopover}
                disabled={!hasShownConfigPopover}
              >
                Reset
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />
        </>
      )}
      <ModelSelector
        selectedProvider={activeConfiguration.providerId}
        config={activeConfiguration.config}
        savedConfigs={savedConfigs}
        configName={activeConfiguration.displayName}
        isConfigView
        onChange={handleModelSelectorChange}
        onTermsAccept={updatedConfigs => {
          pluginStore.update(updatedConfigs as any);
        }}
      />
      {/* AI Tools Section */}
      <Divider sx={{ my: 3 }} />
      <Typography variant="h6" sx={{ mb: 2 }}>
        AI Tools
      </Typography>
      <Box>
        {toolsList.map(tool => (
          <Box key={tool.id} sx={{ display: 'flex', alignItems: 'center', mb: 2, ml: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isToolEnabled(pluginSettings, tool.id)}
                  onChange={() => handleToolToggle(tool.id)}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">{tool.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {tool.description}
                  </Typography>
                </Box>
              }
            />
          </Box>
        ))}
      </Box>

      {/* MCP Servers Section */}
      <Divider sx={{ my: 3 }} />
      <MCPSettings />

      {/* Holmes Agent Section */}
      <Divider sx={{ my: 3 }} />
      <HolmesAgentSettings config={savedConfigs} />

      {/* MCP Tool Configuration Section */}
      <Divider sx={{ my: 3 }} />
    </Box>
  );
}
