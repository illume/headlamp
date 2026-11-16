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

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AutoSaveInput } from './settings';

describe('AutoSaveInput', () => {
  it('displays the latest managed value when disabled', () => {
    const { rerender } = render(
      <AutoSaveInput disabled defaultValue="https://old.example.com" onSave={() => {}} />
    );

    rerender(
      <AutoSaveInput disabled defaultValue="https://managed.example.com" onSave={() => {}} />
    );

    expect(screen.getByRole('textbox')).toHaveValue('https://managed.example.com');
  });
});
