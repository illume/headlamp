// Register icon side-effects for the UI
import '../utils/icons';

// Re-export all model config from @headlamp-k8s/ai library
export type { ModelField, ModelProvider } from '@headlamp-k8s/ai-common/config';
export {
  modelProviders,
  getProviderById,
  getProviderFields,
  getDefaultConfig,
} from '@headlamp-k8s/ai-common/config';
