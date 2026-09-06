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
import ResourceListView from './ResourceListView';

vi.mock('../SectionBox', () => ({
  default: ({ title, children }: any) => (
    <>
      {title}
      {children}
    </>
  ),
}));

vi.mock('../SectionFilterHeader', () => ({
  default: ({ title, titleSideActions }: any) => (
    <div>
      {title}
      {titleSideActions}
    </div>
  ),
}));

vi.mock('../CreateResourceButton', () => ({
  CreateResourceButton: () => <span>create resource</span>,
}));

vi.mock('./ResourceInfoButton', () => ({
  default: () => <span>resource information</span>,
}));

vi.mock('./ResourceTable', () => ({
  default: () => <div>resource table</div>,
}));

describe('ResourceListView', () => {
  const resourceClass = {
    apiVersion: 'v1',
    kind: 'Pod',
    isNamespaced: true,
  } as any;

  it('keeps custom title actions and adds resource information', () => {
    render(
      <ResourceListView
        title="Pods"
        resourceClass={resourceClass}
        columns={[]}
        headerProps={{ titleSideActions: [<span key="custom">custom action</span>] }}
      />
    );

    expect(screen.getByText('custom action')).toBeVisible();
    expect(screen.getByText('resource information')).toBeVisible();
    expect(screen.queryByText('create resource')).not.toBeInTheDocument();
  });

  it('adds resource information beside the default create action', () => {
    render(<ResourceListView title="Pods" resourceClass={resourceClass} columns={[]} />);

    expect(screen.getByText('resource information')).toBeVisible();
    expect(screen.getByText('create resource')).toBeVisible();
  });
});
