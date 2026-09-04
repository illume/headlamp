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

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { TestContext } from '../../test';
import { PodLogViewer } from './Details';

vi.mock('../../lib/k8s', () => ({}));
vi.mock('../../lib/k8s/pod', () => ({ default: vi.fn(), __esModule: true }));
vi.mock('../../lib/k8s/cluster', () => ({}));

vi.mock('../globalSearch/useLocalStorageState', () => ({
  useLocalStorageState: (_key: string, defaultValue: any) => [defaultValue, vi.fn()],
}));

vi.mock('../common/LogViewer', () => ({
  LogViewer: ({ logs, topActions, handleReconnect, showReconnectButton }: any) => (
    <div>
      <div data-testid="logs">{logs.join('')}</div>
      <div data-testid="reconnect-visible">{String(showReconnectButton)}</div>
      <div>{React.Children.toArray(topActions)}</div>
      <button onClick={handleReconnect}>Reconnect</button>
    </div>
  ),
}));

vi.mock('@xterm/xterm', () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    open: vi.fn(),
    clear: vi.fn(),
    write: vi.fn(),
    focus: vi.fn(),
    onData: vi.fn(),
    onResize: vi.fn(),
    attachCustomKeyEventHandler: vi.fn(),
    dispose: vi.fn(),
    loadAddon: vi.fn(),
  })),
}));

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn().mockImplementation(() => ({
    fit: vi.fn(),
    activate: vi.fn(),
  })),
}));

function makeMockPod(getLogs: (...args: any[]) => any) {
  return {
    metadata: { name: 'test-pod', namespace: 'default', uid: 'pod-uid-123' },
    spec: {
      containers: [{ name: 'nginx' }, { name: 'sidecar' }],
      initContainers: [],
      ephemeralContainers: [],
    },
    status: {
      containerStatuses: [{ name: 'nginx', state: { running: {} }, restartCount: 0 }],
    },
    getName: () => 'test-pod',
    getLogs,
  } as any;
}

function selectContainer(name: string) {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Containers' }));
  fireEvent.click(screen.getByRole('option', { name }));
  fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
}

describe('PodLogViewer', () => {
  describe('initialContainer', () => {
    it('uses initialContainer when it matches a known container', () => {
      const getLogs = vi.fn(() => () => {});
      render(
        <TestContext routerMap={{ namespace: 'default', name: 'test-pod' }}>
          <PodLogViewer
            open
            item={makeMockPod(getLogs)}
            onClose={() => {}}
            initialContainer="sidecar"
          />
        </TestContext>
      );

      expect(getLogs).toHaveBeenCalledWith('sidecar', expect.any(Function), expect.any(Object));
    });

    it('falls back to default container when initialContainer is invalid', () => {
      const getLogs = vi.fn(() => () => {});
      render(
        <TestContext routerMap={{ namespace: 'default', name: 'test-pod' }}>
          <PodLogViewer
            open
            item={makeMockPod(getLogs)}
            onClose={() => {}}
            initialContainer="nonexistent"
          />
        </TestContext>
      );

      expect(getLogs).toHaveBeenCalledWith('nginx', expect.any(Function), expect.any(Object));
    });

    it('uses default container when initialContainer is not specified', () => {
      const getLogs = vi.fn(() => () => {});
      render(
        <TestContext routerMap={{ namespace: 'default', name: 'test-pod' }}>
          <PodLogViewer open item={makeMockPod(getLogs)} onClose={() => {}} />
        </TestContext>
      );

      expect(getLogs).toHaveBeenCalledWith('nginx', expect.any(Function), expect.any(Object));
    });

    it('selects the default container when pod status becomes available', async () => {
      const getLogs = vi.fn(() => () => {});
      const pod = makeMockPod(getLogs);
      pod.spec.containers = [];
      pod.status = {};
      const { rerender } = render(
        <TestContext routerMap={{ namespace: 'default', name: 'test-pod' }}>
          <PodLogViewer open item={pod} onClose={() => {}} />
        </TestContext>
      );
      expect(getLogs).not.toHaveBeenCalled();

      pod.spec.containers = [{ name: 'nginx' }];
      pod.status = {
        containerStatuses: [{ name: 'nginx', state: { running: {} }, restartCount: 0 }],
      };
      rerender(
        <TestContext routerMap={{ namespace: 'default', name: 'test-pod' }}>
          <PodLogViewer open item={pod} onClose={() => {}} />
        </TestContext>
      );

      await waitFor(() =>
        expect(getLogs).toHaveBeenCalledWith('nginx', expect.any(Function), expect.any(Object))
      );
    });
  });

  it('streams logs for each selected container', async () => {
    const cancelLogs = vi.fn();
    const getLogs = vi.fn(() => cancelLogs);
    render(
      <TestContext routerMap={{ namespace: 'default', name: 'test-pod' }}>
        <PodLogViewer open item={makeMockPod(getLogs)} onClose={() => {}} />
      </TestContext>
    );

    selectContainer('sidecar');

    await waitFor(() => {
      expect(getLogs).toHaveBeenCalledWith('nginx', expect.any(Function), expect.any(Object));
      expect(getLogs).toHaveBeenCalledWith('sidecar', expect.any(Function), expect.any(Object));
    });

    const callsBeforeFiltering = getLogs.mock.calls.length;
    selectContainer('nginx');
    await waitFor(() => expect(getLogs).toHaveBeenCalledTimes(callsBeforeFiltering + 1));
    expect(getLogs).toHaveBeenLastCalledWith('sidecar', expect.any(Function), expect.any(Object));
    expect(cancelLogs).toHaveBeenCalled();
  });

  it('combines selected container logs without duplicates and removes deselected logs', async () => {
    const callbacks = new Map<string, (result: any) => void>();
    const getLogs = vi.fn((container, callback) => {
      callbacks.set(container, callback);
      return vi.fn();
    });
    render(
      <TestContext routerMap={{ namespace: 'default', name: 'test-pod' }}>
        <PodLogViewer open item={makeMockPod(getLogs)} onClose={() => {}} />
      </TestContext>
    );

    const staleNginxCallback = callbacks.get('nginx')!;
    selectContainer('sidecar');
    await waitFor(() => expect(callbacks.has('sidecar')).toBe(true));
    act(() => {
      staleNginxCallback({ logs: ['stale-nginx\n'], hasJsonLogs: false });
    });
    expect(screen.getByTestId('logs')).toBeEmptyDOMElement();

    act(() => {
      callbacks.get('sidecar')!({ logs: ['sidecar-1\n'], hasJsonLogs: false });
      callbacks.get('nginx')!({ logs: ['nginx-1\n'], hasJsonLogs: false });
    });
    expect(screen.getByTestId('logs')).toHaveTextContent('sidecar-1 nginx-1');

    act(() => {
      callbacks.get('sidecar')!({
        logs: ['sidecar-1\n', 'sidecar-2\n'],
        hasJsonLogs: false,
      });
    });
    await waitFor(() =>
      expect(screen.getByTestId('logs')).toHaveTextContent('sidecar-1 nginx-1 sidecar-2')
    );

    act(() => {
      callbacks.get('sidecar')!({
        logs: ['sidecar-1\n', 'sidecar-2\n'],
        hasJsonLogs: false,
      });
    });
    expect(screen.getByTestId('logs')).toHaveTextContent('sidecar-1 nginx-1 sidecar-2');

    act(() => {
      callbacks.get('sidecar')!({ logs: ['sidecar-reconnected\n'], hasJsonLogs: false });
    });
    await waitFor(() =>
      expect(screen.getByTestId('logs')).toHaveTextContent('nginx-1 sidecar-reconnected')
    );
    expect(screen.getByTestId('logs')).not.toHaveTextContent('sidecar-1');

    act(() => {
      callbacks.get('sidecar')!({ logs: ['sidecar-replaced\n'], hasJsonLogs: false });
    });
    await waitFor(() =>
      expect(screen.getByTestId('logs')).toHaveTextContent('nginx-1 sidecar-replaced')
    );
    expect(screen.getByTestId('logs')).not.toHaveTextContent('sidecar-reconnected');

    selectContainer('nginx');
    await waitFor(() => expect(screen.getByTestId('logs')).toBeEmptyDOMElement());
    act(() => {
      callbacks.get('sidecar')!({ logs: ['sidecar-only\n'], hasJsonLogs: false });
    });
    expect(screen.getByTestId('logs')).toHaveTextContent('sidecar-only');
    expect(screen.getByTestId('logs')).not.toHaveTextContent('nginx');
  });

  it('does not allow the last selected container to be removed', () => {
    const getLogs = vi.fn(() => vi.fn());
    render(
      <TestContext routerMap={{ namespace: 'default', name: 'test-pod' }}>
        <PodLogViewer open item={makeMockPod(getLogs)} onClose={() => {}} />
      </TestContext>
    );
    const callsBeforeFiltering = getLogs.mock.calls.length;

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Containers' }));
    const onlySelectedOption = screen.getByRole('option', { name: 'nginx' });
    expect(onlySelectedOption).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(onlySelectedOption);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });

    expect(screen.getByRole('combobox', { name: 'Containers' })).toHaveTextContent('nginx');
    expect(getLogs).toHaveBeenCalledTimes(callsBeforeFiltering);
  });

  it('enables selected options for removal after another container is selected', () => {
    const getLogs = vi.fn(() => vi.fn());
    render(
      <TestContext routerMap={{ namespace: 'default', name: 'test-pod' }}>
        <PodLogViewer open item={makeMockPod(getLogs)} onClose={() => {}} />
      </TestContext>
    );

    selectContainer('sidecar');
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Containers' }));

    expect(screen.getByRole('option', { name: 'nginx' })).not.toHaveAttribute(
      'aria-disabled',
      'true'
    );
    expect(screen.getByRole('option', { name: 'sidecar' })).not.toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('restarts and cleans up every selected container stream on reconnect', async () => {
    const cancelByContainer = {
      nginx: vi.fn(),
      sidecar: vi.fn(),
    };
    const getLogs = vi.fn((container: 'nginx' | 'sidecar') => cancelByContainer[container]);
    render(
      <TestContext routerMap={{ namespace: 'default', name: 'test-pod' }}>
        <PodLogViewer open item={makeMockPod(getLogs)} onClose={() => {}} />
      </TestContext>
    );
    selectContainer('sidecar');
    await waitFor(() => expect(getLogs).toHaveBeenCalledTimes(3));

    fireEvent.click(screen.getByRole('button', { name: 'Reconnect' }));

    await waitFor(() => expect(getLogs).toHaveBeenCalledTimes(5));
    expect(cancelByContainer.nginx).toHaveBeenCalledTimes(2);
    expect(cancelByContainer.sidecar).toHaveBeenCalledTimes(1);
  });

  it('cleans up selected streams when closed and restarts them when reopened', async () => {
    const cancelLogs = vi.fn();
    const getLogs = vi.fn(() => cancelLogs);
    const pod = makeMockPod(getLogs);
    const { rerender } = render(
      <TestContext routerMap={{ namespace: 'default', name: 'test-pod' }}>
        <PodLogViewer open item={pod} onClose={() => {}} />
      </TestContext>
    );
    selectContainer('sidecar');
    await waitFor(() => expect(getLogs).toHaveBeenCalledTimes(3));

    rerender(
      <TestContext routerMap={{ namespace: 'default', name: 'test-pod' }}>
        <PodLogViewer open={false} item={pod} onClose={() => {}} />
      </TestContext>
    );
    expect(cancelLogs).toHaveBeenCalledTimes(3);

    rerender(
      <TestContext routerMap={{ namespace: 'default', name: 'test-pod' }}>
        <PodLogViewer open item={pod} onClose={() => {}} />
      </TestContext>
    );
    await waitFor(() => expect(getLogs).toHaveBeenCalledTimes(5));
  });

  it('ignores reconnect failures from a stream after it is closed', () => {
    let staleReconnect = () => {};
    const getLogs = vi.fn((_container, _callback, options) => {
      staleReconnect = options.onReconnectStop;
      return vi.fn();
    });
    const pod = makeMockPod(getLogs);
    const { rerender } = render(
      <TestContext routerMap={{ namespace: 'default', name: 'test-pod' }}>
        <PodLogViewer open item={pod} onClose={() => {}} />
      </TestContext>
    );

    rerender(
      <TestContext routerMap={{ namespace: 'default', name: 'test-pod' }}>
        <PodLogViewer open={false} item={pod} onClose={() => {}} />
      </TestContext>
    );
    act(() => staleReconnect());

    expect(screen.getByTestId('reconnect-visible')).toHaveTextContent('false');
  });

  it('can select init and ephemeral container logs', async () => {
    const getLogs = vi.fn(() => vi.fn());
    const pod = makeMockPod(getLogs);
    pod.spec.initContainers = [{ name: 'setup' }];
    pod.spec.ephemeralContainers = [{ name: 'debugger' }];
    render(
      <TestContext routerMap={{ namespace: 'default', name: 'test-pod' }}>
        <PodLogViewer open item={pod} onClose={() => {}} />
      </TestContext>
    );

    selectContainer('setup');
    await waitFor(() =>
      expect(getLogs).toHaveBeenCalledWith('setup', expect.any(Function), expect.any(Object))
    );
    selectContainer('debugger');
    await waitFor(() =>
      expect(getLogs).toHaveBeenCalledWith('debugger', expect.any(Function), expect.any(Object))
    );
    expect(screen.getByRole('combobox', { name: 'Containers' })).toHaveTextContent(
      'nginx, setup, debugger'
    );
  });

  it('exposes an accessible multi-select with disabled group labels', () => {
    const getLogs = vi.fn(() => vi.fn());
    const pod = makeMockPod(getLogs);
    pod.spec.initContainers = [{ name: 'setup' }];
    pod.spec.ephemeralContainers = [{ name: 'debugger' }];
    render(
      <TestContext routerMap={{ namespace: 'default', name: 'test-pod' }}>
        <PodLogViewer open item={pod} onClose={() => {}} />
      </TestContext>
    );

    const containerChooser = screen.getByRole('combobox', { name: 'Containers' });
    expect(containerChooser).toHaveAttribute('aria-describedby', 'container-name-chooser-help');
    expect(screen.getByText('At least one container must remain selected.')).toHaveAttribute(
      'id',
      'container-name-chooser-help'
    );
    fireEvent.mouseDown(containerChooser);

    expect(screen.getByRole('listbox', { name: 'Containers' })).toHaveAttribute(
      'aria-multiselectable',
      'true'
    );
    expect(screen.getByRole('option', { name: 'nginx' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'sidecar' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
    for (const groupName of ['Containers', 'Init Containers', 'Ephemeral Containers']) {
      expect(screen.getByRole('option', { name: groupName })).toHaveAttribute(
        'aria-disabled',
        'true'
      );
    }
  });

  it('enables previous logs for restarted init and ephemeral containers', async () => {
    const getLogs = vi.fn(() => vi.fn());
    const pod = makeMockPod(getLogs);
    pod.spec.initContainers = [{ name: 'setup' }];
    pod.spec.ephemeralContainers = [{ name: 'debugger' }];
    pod.status.initContainerStatuses = [{ name: 'setup', restartCount: 1 }];
    pod.status.ephemeralContainerStatuses = [{ name: 'debugger', restartCount: 1 }];
    render(
      <TestContext routerMap={{ namespace: 'default', name: 'test-pod' }}>
        <PodLogViewer open item={pod} onClose={() => {}} />
      </TestContext>
    );

    selectContainer('setup');
    selectContainer('debugger');
    selectContainer('nginx');
    const previousLogs = screen.getByRole('checkbox', {
      name: 'Show logs for previous instances of this container.',
    });
    expect(previousLogs).toBeEnabled();

    fireEvent.click(previousLogs);
    await waitFor(() => {
      expect(getLogs).toHaveBeenCalledWith(
        'setup',
        expect.any(Function),
        expect.objectContaining({ showPrevious: true })
      );
      expect(getLogs).toHaveBeenCalledWith(
        'debugger',
        expect.any(Function),
        expect.objectContaining({ showPrevious: true })
      );
    });
  });

  it('turns off previous logs when the selection includes a container without restarts', async () => {
    const getLogs = vi.fn(() => vi.fn());
    const pod = makeMockPod(getLogs);
    pod.status.containerStatuses[0].restartCount = 1;
    render(
      <TestContext routerMap={{ namespace: 'default', name: 'test-pod' }}>
        <PodLogViewer open item={pod} onClose={() => {}} />
      </TestContext>
    );

    const previousLogs = screen.getByRole('checkbox', {
      name: 'Show logs for previous instances of this container.',
    });
    fireEvent.click(previousLogs);
    await waitFor(() =>
      expect(getLogs).toHaveBeenLastCalledWith(
        'nginx',
        expect.any(Function),
        expect.objectContaining({ showPrevious: true })
      )
    );

    selectContainer('sidecar');
    await waitFor(() =>
      expect(getLogs).toHaveBeenLastCalledWith(
        'sidecar',
        expect.any(Function),
        expect.objectContaining({ showPrevious: false })
      )
    );
    expect(previousLogs).toBeDisabled();
  });
});
