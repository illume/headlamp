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

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestContext } from '../../../test';
import ResourceInfoButton from './ResourceInfoButton';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) =>
      key.replace('{{ kind }}', values?.kind ?? ''),
  }),
}));

vi.mock('./DocsViewer', () => ({
  default: ({ docSpecs }: any) => <div>{JSON.stringify(docSpecs)}</div>,
}));

describe('ResourceInfoButton', () => {
  it('opens accessible documentation for every API version of a resource', async () => {
    const user = userEvent.setup();
    const resourceClass = {
      apiVersion: ['v1', 'v1beta1'],
      kind: 'Pod',
    } as any;
    render(
      <TestContext>
        <ResourceInfoButton resourceClass={resourceClass} />
      </TestContext>
    );

    await user.click(screen.getByRole('button', { name: 'Learn more about Pod' }));

    expect(screen.getByRole('dialog', { name: 'Pod documentation' })).toBeVisible();
    expect(
      screen.getByText('[{"apiVersion":"v1","kind":"Pod"},{"apiVersion":"v1beta1","kind":"Pod"}]')
    ).toBeVisible();
  });
});
