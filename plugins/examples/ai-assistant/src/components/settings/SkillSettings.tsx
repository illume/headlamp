import { SectionBox } from '@kinvolk/headlamp-plugin/lib/components/common';
import { Dialog } from '@kinvolk/headlamp-plugin/lib/components/common';
import React from 'react';
import { pluginStore } from '../../pluginState';
import { SkillSettings as SkillSettingsBase } from '@headlamp-k8s/ai-ui/components/settings/SkillSettings';

/**
 * Headlamp-integrated skill settings panel.
 *
 * Thin wrapper around the framework-agnostic {@link SkillSettingsBase}
 * that injects the headlamp-plugin `SectionBox`, `Dialog`, and `pluginStore`.
 */
export function SkillSettings() {
  return (
    <SkillSettingsBase
      configStore={pluginStore}
      SectionWrapper={SectionBox}
      DialogSlot={Dialog}
    />
  );
}
