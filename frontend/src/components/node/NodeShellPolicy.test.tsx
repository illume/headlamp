/*
 * Copyright 2026 The Kubernetes Authors
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
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { storeClusterSettings } from '../../helpers/clusterSettings';
import { apply } from '../../lib/k8s/api/v1/apply';
import { stream } from '../../lib/k8s/api/v1/streamingApi';
import Node from '../../lib/k8s/node';
import { useTerminalStream } from '../../lib/k8s/useTerminalStream';
import store from '../../redux/stores/store';
import { setAdminSettings } from '../../settings/adminSettingsSlice';
import { parseAdminSettings } from '../../settings/parseAdminSettings';
import { TestContext } from '../../test';
import { AuthVisible } from '../common/Resource';
import { NodeShellAction } from './NodeShellAction';
import { NodeShellTerminal } from './NodeShellTerminal';

const { enqueueSnackbar } = vi.hoisted(() => ({ enqueueSnackbar: vi.fn() }));

vi.mock('../../lib/k8s/api/v1/apply', () => ({ apply: vi.fn() }));
vi.mock('../../lib/k8s/api/v1/streamingApi', () => ({ stream: vi.fn() }));
vi.mock('../../lib/k8s/useTerminalStream', () => ({
  useTerminalStream: vi.fn(() => ({
    xtermRef: { current: null },
    streamRef: { current: null },
    send: vi.fn(),
  })),
}));
vi.mock('../common/Resource', () => ({
  AuthVisible: vi.fn(({ children }: { children: ReactNode }) => <>{children}</>),
}));
vi.mock('notistack', async importOriginal => ({
  ...(await importOriginal<typeof import('notistack')>()),
  useSnackbar: () => ({ enqueueSnackbar }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      (key.split('|')[1] || key).replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
        String(options?.[name] ?? match)
      ),
  }),
}));

const cluster = 'policy-cluster';
const item = new Node(
  {
    metadata: { name: 'policy-node', uid: 'node-uid' },
    status: { nodeInfo: { operatingSystem: 'linux' } },
  } as ConstructorParameters<typeof Node>[0],
  cluster
);

beforeEach(() => {
  vi.clearAllMocks();
  storeClusterSettings(cluster, {
    nodeShellTerminal: { namespace: 'user-shells', linuxImage: 'user-image', isEnabled: true },
  });
  store.dispatch(
    setAdminSettings(
      parseAdminSettings({
        defaults: {
          clusters: {
            '*': {
              nodeShellTerminal: {
                namespace: { $value: 'managed-shells', $display: 'disabled' },
                linuxImage: { $value: 'managed-image', $display: 'hidden' },
              },
            },
          },
        },
      })
    )
  );
});

afterEach(() => {
  localStorage.clear();
  store.dispatch(setAdminSettings(parseAdminSettings({})));
});

describe('node shell policy consumers', () => {
  it('checks pod permissions in the managed namespace', () => {
    render(
      <TestContext>
        <NodeShellAction item={item} />
      </TestContext>
    );

    expect(screen.getByRole('button', { name: 'Debug Node' })).toBeInTheDocument();
    expect(
      vi.mocked(AuthVisible).mock.calls.map(([props]) => ({
        namespace: props.namespace,
        cluster: props.cluster,
      }))
    ).toEqual([
      { namespace: 'managed-shells', cluster },
      { namespace: 'managed-shells', cluster },
    ]);
  });

  it('removes the launch action when policy disables the shell', () => {
    render(
      <TestContext>
        <NodeShellAction item={item} />
      </TestContext>
    );
    act(() =>
      store.dispatch(
        setAdminSettings(
          parseAdminSettings({
            defaults: {
              clusters: {
                '*': {
                  nodeShellTerminal: { isEnabled: { $value: false, $display: 'disabled' } },
                },
              },
            },
          })
        )
      )
    );

    expect(screen.queryByRole('button', { name: 'Debug Node' })).not.toBeInTheDocument();
  });

  it('uses the managed image and namespace for pod creation and attachment', async () => {
    render(
      <TestContext>
        <NodeShellTerminal item={item} />
      </TestContext>
    );
    const options = vi.mocked(useTerminalStream).mock.lastCall![0];
    await act(() => options.connectStream(vi.fn()));

    expect(apply).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ namespace: 'managed-shells' }),
        spec: expect.objectContaining({
          containers: [expect.objectContaining({ image: 'managed-image' })],
        }),
      }),
      cluster
    );
    expect(stream).toHaveBeenCalledWith(
      expect.stringContaining('/namespaces/managed-shells/pods/'),
      expect.any(Function),
      expect.objectContaining({ cluster })
    );
  });

  it('does not create another pod when policy disables an already-open terminal', async () => {
    render(
      <TestContext>
        <NodeShellTerminal item={item} />
      </TestContext>
    );
    const options = vi.mocked(useTerminalStream).mock.lastCall![0];
    act(() =>
      store.dispatch(
        setAdminSettings(
          parseAdminSettings({
            defaults: {
              clusters: {
                '*': {
                  nodeShellTerminal: { isEnabled: { $value: false, $display: 'hidden' } },
                },
              },
            },
          })
        )
      )
    );
    await act(() => options.connectStream(vi.fn()));

    expect(apply).not.toHaveBeenCalled();
    expect(stream).not.toHaveBeenCalled();
    expect(enqueueSnackbar).toHaveBeenCalledWith(
      'Failed to open node shell: Node shells are disabled in settings',
      { variant: 'error' }
    );
  });
});
