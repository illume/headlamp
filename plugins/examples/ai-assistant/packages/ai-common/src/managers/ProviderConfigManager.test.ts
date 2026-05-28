/*
 * Copyright 2025 The Kubernetes Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, expect, it } from 'vitest';
import {
  deleteProviderConfig,
  getActiveConfig,
  getSavedConfigurations,
  saveProviderConfig,
  saveTermsAcceptance,
} from './ProviderConfigManager';

describe('ProviderConfigManager', () => {
  describe('getSavedConfigurations', () => {
    it('returns empty providers for null or undefined data', () => {
      expect(getSavedConfigurations(null)).toEqual({ providers: [] });
      expect(getSavedConfigurations(undefined)).toEqual({ providers: [] });
    });

    it('returns providers and metadata when providers array exists', () => {
      const data = {
        providers: [
          {
            providerId: 'openai',
            displayName: 'Primary',
            config: { apiKey: 'key-1', model: 'gpt-4.1' },
          },
        ],
        defaultProviderIndex: 0,
        termsAccepted: true,
      };

      expect(getSavedConfigurations(data)).toEqual(data);
    });

    it('returns empty providers when providers array is missing', () => {
      expect(getSavedConfigurations({ defaultProviderIndex: 1 })).toEqual({
        providers: [],
        termsAccepted: false,
      });
    });
  });

  describe('getActiveConfig', () => {
    it('returns null for null or empty configurations', () => {
      expect(getActiveConfig(null)).toBeNull();
      expect(getActiveConfig({ providers: [] })).toBeNull();
    });

    it('returns the provider at the default index', () => {
      const savedConfigs = {
        providers: [
          { providerId: 'openai', config: { apiKey: 'key-1' } },
          { providerId: 'azure', config: { apiKey: 'key-2' } },
        ],
        defaultProviderIndex: 1,
      };

      expect(getActiveConfig(savedConfigs)).toEqual(savedConfigs.providers[1]);
    });

    it('returns the first provider when no default index exists', () => {
      const savedConfigs = {
        providers: [
          { providerId: 'openai', config: { apiKey: 'key-1' } },
          { providerId: 'azure', config: { apiKey: 'key-2' } },
        ],
      };

      expect(getActiveConfig(savedConfigs)).toEqual(savedConfigs.providers[0]);
    });
  });

  describe('saveProviderConfig', () => {
    it('adds a new provider configuration', () => {
      expect(saveProviderConfig(null, 'openai', { apiKey: 'key-1' })).toEqual({
        providers: [{ providerId: 'openai', displayName: undefined, config: { apiKey: 'key-1' } }],
        defaultProviderIndex: undefined,
        termsAccepted: false,
      });
    });

    it('updates an existing provider configuration when apiKey matches', () => {
      const savedConfigs = {
        providers: [
          {
            providerId: 'openai',
            displayName: 'Original',
            config: { apiKey: 'key-1', model: 'gpt-4.1', temperature: 0.2 },
          },
        ],
        defaultProviderIndex: 0,
        termsAccepted: true,
      };

      expect(
        saveProviderConfig(savedConfigs, 'openai', {
          apiKey: 'key-1',
          model: 'gpt-4.1',
          temperature: 0.7,
        })
      ).toEqual({
        providers: [
          {
            providerId: 'openai',
            displayName: 'Original',
            config: { apiKey: 'key-1', model: 'gpt-4.1', temperature: 0.7 },
          },
        ],
        defaultProviderIndex: 0,
        termsAccepted: true,
      });
    });

    it('sets the saved provider as default when makeDefault is true', () => {
      const savedConfigs = {
        providers: [{ providerId: 'openai', config: { apiKey: 'key-1' } }],
      };

      expect(
        saveProviderConfig(savedConfigs, 'azure', { apiKey: 'key-2' }, true)
      ).toMatchObject({
        defaultProviderIndex: 1,
      });
    });

    it('stores the provided display name', () => {
      const result = saveProviderConfig(
        null,
        'openai',
        { apiKey: 'key-1' },
        false,
        'Work Account'
      );

      expect(result.providers?.[0]).toEqual({
        providerId: 'openai',
        displayName: 'Work Account',
        config: { apiKey: 'key-1' },
      });
    });
  });

  describe('deleteProviderConfig', () => {
    it('removes an existing provider configuration', () => {
      const savedConfigs = {
        providers: [
          { providerId: 'openai', config: { apiKey: 'key-1' } },
          { providerId: 'azure', config: { apiKey: 'key-2' } },
        ],
        defaultProviderIndex: 0,
      };

      expect(deleteProviderConfig(savedConfigs, 'openai', { apiKey: 'key-1' })).toEqual({
        providers: [{ providerId: 'azure', config: { apiKey: 'key-2' } }],
        defaultProviderIndex: 0,
        termsAccepted: false,
      });
    });

    it('adjusts the default provider index after deletion', () => {
      const savedConfigs = {
        providers: [
          { providerId: 'openai', config: { apiKey: 'key-1' } },
          { providerId: 'azure', config: { apiKey: 'key-2' } },
        ],
        defaultProviderIndex: 1,
        termsAccepted: true,
      };

      expect(deleteProviderConfig(savedConfigs, 'azure', { apiKey: 'key-2' })).toEqual({
        providers: [{ providerId: 'openai', config: { apiKey: 'key-1' } }],
        defaultProviderIndex: 0,
        termsAccepted: true,
      });
    });
  });

  describe('saveTermsAcceptance', () => {
    it('sets termsAccepted to true', () => {
      expect(saveTermsAcceptance({ providers: [] })).toEqual({
        providers: [],
        termsAccepted: true,
      });
    });
  });
});
