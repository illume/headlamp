// Re-export from @headlamp-k8s/ai library
export type { StoredProviderConfig, SavedConfigurations } from '@headlamp-k8s/ai/config';
export {
  getSavedConfigurations,
  getActiveConfig,
  saveProviderConfig,
  deleteProviderConfig,
  saveTermsAcceptance,
} from '@headlamp-k8s/ai/config';
