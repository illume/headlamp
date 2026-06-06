import {
  getActiveConfig,
  SavedConfigurations,
  saveProviderConfig,
} from '@headlamp-k8s/ai-common/managers/ProviderConfigManager';
import {
  detectProviders,
  dismissalKey,
  type CommandRunner,
  type DetectedProvider,
} from '@headlamp-k8s/ai-common/providers/providerAutoDetect';
import { getDefaultConfig } from '@headlamp-k8s/ai-ui/config/modelConfig';
import { HolmesAgentSettings } from '@headlamp-k8s/ai-ui/components/settings/HolmesAgentSettings';
import { MCPSettings } from '@headlamp-k8s/ai-ui/components/settings/MCPSettings';
import ModelSelector from '@headlamp-k8s/ai-ui/components/settings/ModelSelector';
import DetectedProvidersDialog from '@headlamp-k8s/ai-ui/components/settings/DetectedProvidersDialog';
import { SkillSettings } from '@headlamp-k8s/ai-ui/components/settings/SkillSettings';
import { isTestModeCheck } from '@headlamp-k8s/ai-ui/testing/testMode';
import { Headlamp } from '@kinvolk/headlamp-plugin/lib';
import {
  Box,
  Button,
  Divider,
  FormControlLabel,
  Link,
  Switch,
  Typography,
} from '@mui/material';
import React from 'react';
import {
  HOLMES_SERVICE_NAME,
  HOLMES_SERVICE_NAMESPACE,
  HOLMES_SERVICE_PORT,
} from '../../holmesClient';
import {
  AKS_AGENT_INSTALL_DOC_URL,
  getAllAvailableTools,
  isToolEnabled,
  pluginStore,
  toggleTool,
  usePluginConfig,
} from '../../pluginState';

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

  // Auto-detect state
  const [autoDetecting, setAutoDetecting] = React.useState(false);
  const [detectedProviders, setDetectedProviders] = React.useState<DetectedProvider[]>([]);
  const [showDetectedDialog, setShowDetectedDialog] = React.useState(false);

  // Command runner for CLI-based provider detection
  const commandRunnerRef = React.useRef<CommandRunner | null>(null);
  React.useEffect(() => {
    if (typeof (globalThis as any).pluginRunCommand === 'function') {
      commandRunnerRef.current = async (command: string, args: string[]) => {
        const result = await (globalThis as any).pluginRunCommand(command, args);
        return { stdout: result?.stdout ?? '', exitCode: result?.exitCode ?? -1 };
      };
    }
  }, []);

  const handleAutoDetect = React.useCallback(async () => {
    setAutoDetecting(true);
    try {
      const pluginSettings = pluginStore.get() || {};
      const dismissed: string[] = pluginSettings.autoDetectDismissedProviders || [];
      const existing = savedConfigs?.providers || [];
      const detected = await detectProviders(existing, dismissed, commandRunnerRef.current);
      if (detected.length > 0) {
        setDetectedProviders(detected);
        setShowDetectedDialog(true);
      }
    } catch (e) {
      console.error('[Settings] auto-detect failed:', e);
    } finally {
      setAutoDetecting(false);
    }
  }, [savedConfigs]);

  const handleAddDetectedProviders = React.useCallback(
    (providers: DetectedProvider[]) => {
      let configs = savedConfigs;
      for (const provider of providers) {
        configs = saveProviderConfig(
          configs,
          provider.providerId,
          provider.config,
          !configs?.providers?.length, // make default if no providers exist
          provider.displayName
        );
      }
      pluginStore.update(configs as any);

      // Update active configuration to first added provider if none exists
      if (!savedConfigs?.providers?.length && providers.length > 0) {
        setActiveConfiguration({
          providerId: providers[0].providerId,
          config: { ...providers[0].config },
          displayName: providers[0].displayName,
        });
      }
      setShowDetectedDialog(false);
      setDetectedProviders([]);
    },
    [savedConfigs]
  );

  const handleDismissDetectedProviders = React.useCallback(
    (providers: DetectedProvider[]) => {
      const currentConf = pluginStore.get() || {};
      const dismissed: string[] = currentConf.autoDetectDismissedProviders || [];
      const newDismissals = providers.map(p => dismissalKey(p));
      const merged = [...new Set([...dismissed, ...newDismissals])];
      pluginStore.update({ ...currentConf, autoDetectDismissedProviders: merged });
      setShowDetectedDialog(false);
      setDetectedProviders([]);
    },
    []
  );

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

  const handlePreviewChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const previewEnabled = event.target.checked;
    const currentConf = pluginStore.get() || {};
    pluginStore.update({
      ...currentConf,
      previewEnabled,
    });
  };

  const previewEnabled = savedConfigs?.previewEnabled ?? true;

  return (
    <Box width={'100%'}>
      <Typography variant="body1" sx={{ mb: 3 }}>
        This plugin is in early development and is not yet ready for production use. Using it may
        incur in costs from the AI provider! Use at your own risk.
      </Typography>

      {/* Preview Feature Toggle */}
      <Divider sx={{ my: 3 }} />
      <Box sx={{ mb: 3, ml: 2 }}>
        <FormControlLabel
          control={
            <Switch checked={previewEnabled} onChange={handlePreviewChange} color="primary" />
          }
          label={
            <Box>
              <Typography variant="body1">Preview Features</Typography>
              <Typography variant="caption" color="text.secondary">
                Enable preview features including the AI assistant button in the app bar
              </Typography>
            </Box>
          }
        />
      </Box>

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
        onAutoDetect={handleAutoDetect}
        autoDetecting={autoDetecting}
      />
      <DetectedProvidersDialog
        open={showDetectedDialog}
        onClose={() => setShowDetectedDialog(false)}
        detectedProviders={detectedProviders}
        onAddProviders={handleAddDetectedProviders}
        onDismiss={handleDismissDetectedProviders}
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
      <MCPSettings isRunningAsApp={Headlamp.isRunningAsApp()} configStore={pluginStore} />

      {/* Skills Section */}
      <Divider sx={{ my: 3 }} />
      <SkillSettings configStore={pluginStore} />

      {/* Holmes Agent Section */}
      <Divider sx={{ my: 3 }} />
      <HolmesAgentSettings
        config={savedConfigs}
        onConfigChange={(patch: Record<string, any>) => {
          const current = pluginStore.get() || {};
          pluginStore.update({ ...current, ...patch });
        }}
        defaultNamespace={HOLMES_SERVICE_NAMESPACE}
        defaultServiceName={HOLMES_SERVICE_NAME}
        defaultPort={HOLMES_SERVICE_PORT}
      />

      {/* AKS Agent Section */}
      <Divider sx={{ my: 3 }} />
      <Typography variant="h6" sx={{ mb: 2 }}>
        AKS Agent
      </Typography>
      <Box sx={{ ml: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          The AKS Agent provides AI-powered troubleshooting for Azure Kubernetes Service clusters.
          When installed in your cluster, it enables an agent mode in the AI assistant that can
          diagnose and help resolve cluster issues.
        </Typography>
        <Link
          href={AKS_AGENT_INSTALL_DOC_URL}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ fontSize: '0.875rem' }}
        >
          Learn how to install the AKS Agent →
        </Link>
      </Box>

      {/* MCP Tool Configuration Section */}
      <Divider sx={{ my: 3 }} />
    </Box>
  );
}
