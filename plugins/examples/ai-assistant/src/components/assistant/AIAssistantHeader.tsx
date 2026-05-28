import React from 'react';
import { useHistory } from 'react-router-dom';
import { getSettingsURL } from '../../pluginState';
import AIAssistantHeaderBase from '@headlamp-k8s/ai-ui/components/assistant/AIAssistantHeader';

/** Props for the AIAssistantHeader component displayed at the top of the assistant panel. */
interface AIAssistantHeaderProps {
  /** Whether the assistant is operating in test mode. */
  isTestMode: boolean;
  /** Whether the settings navigation button should be disabled. */
  disableSettingsButton: boolean;
  /** Callback invoked when the user closes the assistant panel. */
  onClose: () => void;
}

export default function AIAssistantHeader({
  isTestMode,
  disableSettingsButton,
  onClose,
}: AIAssistantHeaderProps) {
  const history = useHistory();

  return (
    <AIAssistantHeaderBase
      isTestMode={isTestMode}
      disableSettingsButton={disableSettingsButton}
      onClose={onClose}
      onSettings={() => history.push(getSettingsURL())}
    />
  );
}
