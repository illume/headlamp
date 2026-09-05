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

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import getDocDefinitions from '../../../lib/docs';
import { TestContext } from '../../../test';
import DocsViewer from './DocsViewer';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../../lib/docs', () => ({
  default: vi.fn(),
}));

describe('DocsViewer', () => {
  it('shows resource and field documentation from OpenAPI on hover and focus', async () => {
    vi.mocked(getDocDefinitions).mockResolvedValue({
      type: 'object',
      description: 'A Pod runs one or more containers.',
      properties: {
        spec: {
          type: 'object',
          description: 'Specification of the desired behavior of the Pod.',
        },
      },
    } as any);

    render(
      <TestContext>
        <DocsViewer docSpecs={[{ apiVersion: 'v1', kind: 'Pod' }]} />
      </TestContext>
    );

    expect(await screen.findByText('A Pod runs one or more containers.')).toBeVisible();
    const field = screen.getByText('spec');

    await userEvent.hover(field);
    const fieldDescription = 'Specification of the desired behavior of the Pod.';
    expect(await screen.findByRole('tooltip')).toHaveTextContent(fieldDescription);
    expect(field).toHaveAccessibleName('spec');
    expect(field).toHaveAccessibleDescription(fieldDescription);

    await userEvent.unhover(field);
    act(() => field.focus());
    expect(await screen.findByRole('tooltip')).toHaveTextContent(fieldDescription);
    expect(field).toHaveAccessibleName('spec');
    expect(field).toHaveAccessibleDescription(fieldDescription);
  });
});
