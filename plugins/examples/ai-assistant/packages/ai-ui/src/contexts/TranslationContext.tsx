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

import React, { createContext, useContext } from 'react';

/**
 * Translation function type compatible with i18next's TFunction.
 * Accepts a key and optional interpolation options, returns the translated string.
 */
export type TranslationFunction = (key: string, options?: Record<string, unknown>) => string;

interface TranslationContextValue {
  t: TranslationFunction;
}

/**
 * Default translation function: returns the key as-is with basic {{variable}} interpolation.
 * Since translation keys are English strings, this works as a no-op for English.
 */
function defaultT(key: string, options?: Record<string, unknown>): string {
  if (!options) return key;
  return key.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    const val = options[name];
    return val !== undefined ? String(val) : `{{${name}}}`;
  });
}

const TranslationContext = createContext<TranslationContextValue>({ t: defaultT });

/**
 * Provider for injecting a real translation function (e.g. from headlamp-plugin).
 * Only needed in tests or when wiring up non-English translations.
 * Production English works without any provider (default returns key as-is).
 */
export function TranslationProvider({
  t,
  children,
}: {
  t: TranslationFunction;
  children: React.ReactNode;
}) {
  return <TranslationContext.Provider value={{ t }}>{children}</TranslationContext.Provider>;
}

/**
 * Hook to access the translation function.
 * Returns `{ t }` with the same API as headlamp-plugin's useTranslation.
 * Without a provider, `t` is an identity function (returns the English key).
 */
export function useTranslation() {
  return useContext(TranslationContext);
}
