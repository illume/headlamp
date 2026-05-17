// Register icon side-effects for the UI
import '../icons/iconBundles';

// Re-export all model config from @headlamp-k8s/ai-common library
export type { ModelField, ModelProvider } from '@headlamp-k8s/ai-common/config/modelConfig';
export {
  modelProviders,
  getProviderById,
  getProviderFields,
  getDefaultConfig,
} from '@headlamp-k8s/ai-common/config/modelConfig';
