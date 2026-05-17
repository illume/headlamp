import { getSavedConfigurations } from '@headlamp-k8s/ai-common/managers/ProviderConfigManager';
import { PromptWidthProvider } from '@headlamp-k8s/ai-ui/contexts/PromptWidthContext';
import { Box } from '@mui/material';
import React from 'react';
import { ClusterChangeNotifier } from '../../hooks/useClusterChangeNotifier';
import AIPrompt from '../../modal';
import { useGlobalState, usePluginConfig } from '../../pluginState';

/**
 * Memoized UI Panel component that renders the AI Assistant side panel.
 *
 * Displays the AI chat prompt inside a resizable panel on the right side of
 * the Headlamp UI. The panel supports mouse-drag resizing between 300px and
 * 80% of the viewport width. When models are configured, it also renders a
 * {@link ClusterChangeNotifier} to keep the Electron MCP client informed of
 * active-cluster changes.
 */
const AIPanelComponent = React.memo(() => {
  const pluginState = useGlobalState();
  const conf = usePluginConfig();
  const [width, setWidth] = React.useState('35vw');
  const [isResizing, setIsResizing] = React.useState(false);

  const savedConfigData = React.useMemo(() => {
    return getSavedConfigurations(conf);
  }, [conf]);

  const hasAnyValidConfig = savedConfigData.providers && savedConfigData.providers.length > 0;

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      const constrainedWidth = Math.max(300, Math.min(newWidth, window.innerWidth * 0.8));
      setWidth(`${constrainedWidth}px`);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  if (!pluginState.isUIPanelOpen) {
    return null;
  }
  return (
    <Box
      flexShrink={0}
      sx={{
        height: '100%',
        width: width,
        borderLeft: '2px solid',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: '-8px',
          bottom: 0,
          width: '16px',
          cursor: 'ew-resize',
          zIndex: 1,
        },
      }}
    >
      {hasAnyValidConfig && <ClusterChangeNotifier />}
      <Box
        onMouseDown={handleMouseDown}
        sx={{
          position: 'absolute',
          top: 0,
          left: '-8px',
          bottom: 0,
          width: '16px',
          cursor: 'ew-resize',
          zIndex: 10,
        }}
      />
      <PromptWidthProvider initialWidth={width}>
        <AIPrompt
          openPopup={pluginState.isUIPanelOpen}
          setOpenPopup={pluginState.setIsUIPanelOpen}
          pluginSettings={conf}
          width={width}
        />
      </PromptWidthProvider>
    </Box>
  );
});

AIPanelComponent.displayName = 'AIPanelComponent';

export default AIPanelComponent;
