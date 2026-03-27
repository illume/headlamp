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

import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestContext } from '../../../test';
import AuthVisible from './AuthVisible';

// Mock KubeObject class with getAuthorization
function createMockItem(overrides: { allowed?: boolean; cluster?: string } = {}) {
  const { allowed = true, cluster = 'test-cluster' } = overrides;
  return {
    cluster,
    getName: () => 'test-resource',
    _class: () => ({
      apiName: 'pods',
      apiVersion: 'v1',
    }),
    getAuthorization: vi.fn().mockResolvedValue({
      status: { allowed, reason: allowed ? 'RBAC: allowed' : 'RBAC: denied' },
    }),
  } as any;
}

// Mock KubeObjectClass (no instance, just the class itself)
function createMockClass() {
  return {
    apiName: 'pods',
    apiVersion: 'v1',
    getAuthorization: vi.fn().mockResolvedValue({
      status: { allowed: true, reason: 'RBAC: allowed' },
    }),
  } as any;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AuthVisible', () => {
  it('does not throw when item is null (skipToken prevents query)', async () => {
    // This is the key regression test: before the fix, passing null would throw
    // because itemClass.apiName was dereferenced before skip could take effect.
    const onAuthResult = vi.fn();

    expect(() => {
      render(
        <TestContext>
          <AuthVisible item={null} authVerb="get" onAuthResult={onAuthResult}>
            <div>Should not appear</div>
          </AuthVisible>
        </TestContext>
      );
    }).not.toThrow();

    // Children should not be rendered when item is null
    expect(screen.queryByText('Should not appear')).not.toBeInTheDocument();

    // Verify the query was never executed (skipToken prevents it)
    // Wait briefly to ensure async would have resolved if it ran
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(onAuthResult).not.toHaveBeenCalled();
  });

  it('renders children when authorized', async () => {
    const mockItem = createMockItem({ allowed: true });

    render(
      <TestContext>
        <AuthVisible item={mockItem} authVerb="get">
          <div>Authorized Content</div>
        </AuthVisible>
      </TestContext>
    );

    await waitFor(() => {
      expect(screen.getByText('Authorized Content')).toBeInTheDocument();
    });
  });

  it('does not render children when not authorized', async () => {
    const mockItem = createMockItem({ allowed: false });

    render(
      <TestContext>
        <AuthVisible item={mockItem} authVerb="delete">
          <div>Should Not Appear</div>
        </AuthVisible>
      </TestContext>
    );

    // Wait for the query to resolve
    await waitFor(() => {
      expect(mockItem.getAuthorization).toHaveBeenCalled();
    });

    expect(screen.queryByText('Should Not Appear')).not.toBeInTheDocument();
  });

  it('returns null for invalid authVerb', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockItem = createMockItem();

    const { container } = render(
      <TestContext>
        <AuthVisible item={mockItem} authVerb="invalidVerb">
          <div>Should Not Appear</div>
        </AuthVisible>
      </TestContext>
    );

    expect(container.innerHTML).toBe('');
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid authVerb provided: "invalidVerb"')
    );
  });

  it('calls onAuthResult when auth check completes', async () => {
    const mockItem = createMockItem({ allowed: true });
    const onAuthResult = vi.fn();

    render(
      <TestContext>
        <AuthVisible item={mockItem} authVerb="get" onAuthResult={onAuthResult}>
          <div>Content</div>
        </AuthVisible>
      </TestContext>
    );

    await waitFor(() => {
      expect(onAuthResult).toHaveBeenCalledWith({
        allowed: true,
        reason: 'RBAC: allowed',
      });
    });
  });

  it('works with a KubeObjectClass (not instance) as item', async () => {
    const mockClass = createMockClass();

    render(
      <TestContext>
        <AuthVisible item={mockClass} authVerb="create" namespace="default">
          <div>Create Button</div>
        </AuthVisible>
      </TestContext>
    );

    await waitFor(() => {
      expect(screen.getByText('Create Button')).toBeInTheDocument();
    });
  });

  it('calls onError with the latest callback when auth check fails', async () => {
    // This verifies that when onError prop changes, the new callback is used (not stale)
    // Use a unique item name to avoid RTK Query cache collisions with other tests
    const failingItem = {
      cluster: 'test-cluster',
      getName: () => 'error-test-resource',
      _class: () => ({
        apiName: 'secrets',
        apiVersion: 'v1',
      }),
      getAuthorization: vi.fn().mockRejectedValue(new Error('RBAC: forbidden')),
    } as any;

    const onError1 = vi.fn();

    const { rerender } = render(
      <TestContext>
        <AuthVisible item={failingItem} authVerb="delete" onError={onError1}>
          <div>Content</div>
        </AuthVisible>
      </TestContext>
    );

    await waitFor(() => {
      expect(onError1).toHaveBeenCalledWith(expect.any(Error));
    });

    // Now re-render with a new onError callback
    const onError2 = vi.fn();

    rerender(
      <TestContext>
        <AuthVisible item={failingItem} authVerb="delete" onError={onError2}>
          <div>Content</div>
        </AuthVisible>
      </TestContext>
    );

    // The new callback should be used (not the stale one)
    // Due to RTK Query caching, error is already present so the effect should fire with onError2
    await waitFor(() => {
      expect(onError2).toHaveBeenCalled();
    });
  });

  it('calls onAuthResult with the latest callback when auth data arrives', async () => {
    // This verifies that when onAuthResult prop changes, the new callback is used (not stale)
    // Use unique item config to avoid cache collisions with other tests
    const mockItem = {
      cluster: 'test-cluster',
      getName: () => 'result-test-resource',
      _class: () => ({
        apiName: 'configmaps',
        apiVersion: 'v1',
      }),
      getAuthorization: vi.fn().mockResolvedValue({
        status: { allowed: true, reason: 'RBAC: allowed' },
      }),
    } as any;
    const onAuthResult1 = vi.fn();

    const { rerender } = render(
      <TestContext>
        <AuthVisible item={mockItem} authVerb="watch" onAuthResult={onAuthResult1}>
          <div>Content</div>
        </AuthVisible>
      </TestContext>
    );

    await waitFor(() => {
      expect(onAuthResult1).toHaveBeenCalledWith({ allowed: true, reason: 'RBAC: allowed' });
    });

    // Now re-render with a new onAuthResult callback
    const onAuthResult2 = vi.fn();

    rerender(
      <TestContext>
        <AuthVisible item={mockItem} authVerb="watch" onAuthResult={onAuthResult2}>
          <div>Content</div>
        </AuthVisible>
      </TestContext>
    );

    // The new callback should fire (not the stale one) because data is already present
    await waitFor(() => {
      expect(onAuthResult2).toHaveBeenCalledWith({ allowed: true, reason: 'RBAC: allowed' });
    });
  });
});
