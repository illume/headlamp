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

import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { PluginRunCommand } from '../components/App/runCommand';
import {
  commandCapabilityRegistration,
  createPluginRunCommand,
  findCommandCapability,
} from './commandCapabilities';
import { PluginInfo } from './pluginsSlice';

const plugin: PluginInfo = {
  name: '@example/plugin',
  folderName: 'example-plugin',
  source: 'shipped',
  type: 'shipped',
  description: '',
  homepage: '',
};

describe('commandCapabilityRegistration', () => {
  it('preserves package, bundle, path, and provenance', () => {
    expect(commandCapabilityRegistration(plugin, 'static-plugins/example-plugin')).toEqual({
      bundleName: 'example-plugin',
      packageName: '@example/plugin',
      path: 'static-plugins/example-plugin',
      source: 'shipped',
      type: 'shipped',
    });
  });

  it('rejects incomplete inventory metadata', () => {
    expect(commandCapabilityRegistration({ ...plugin, source: undefined }, 'path')).toBeUndefined();
    expect(
      commandCapabilityRegistration({ ...plugin, folderName: undefined }, 'path')
    ).toBeUndefined();
  });
});

describe('findCommandCapability', () => {
  const capabilities = [
    {
      bundleName: 'example-plugin',
      packageName: '@example/plugin',
      capability: 'secret',
    },
  ];

  it('matches both package and bundle identity', () => {
    expect(findCommandCapability(capabilities, plugin)).toBe('secret');
  });

  it('does not match a spoofed package or bundle', () => {
    expect(
      findCommandCapability(capabilities, { ...plugin, name: '@attacker/plugin' })
    ).toBeUndefined();
    expect(
      findCommandCapability(capabilities, { ...plugin, folderName: 'attacker' })
    ).toBeUndefined();
  });
});

describe('createPluginRunCommand', () => {
  it('exposes only command, arguments, and empty options to plugins', () => {
    expectTypeOf<PluginRunCommand>().parameters.toEqualTypeOf<
      [command: string, args: string[], options: Record<string, never>]
    >();
  });

  it('forwards the private capability through the captured bridge', () => {
    const internalRunCommand = vi.fn(() => ({ stdout: {}, stderr: {}, on: vi.fn() }));
    const send = vi.fn();
    const receive = vi.fn();
    const pluginRunCommand = createPluginRunCommand(
      'secret',
      internalRunCommand as any,
      {},
      send,
      receive
    );

    pluginRunCommand?.('examplectl', ['project', 'list'], {});

    expect(internalRunCommand).toHaveBeenCalledWith(
      'examplectl',
      ['project', 'list'],
      {},
      {},
      send,
      receive,
      'secret'
    );
  });

  it('does not create a bridge without a product capability', () => {
    expect(createPluginRunCommand(undefined, vi.fn() as any, {}, vi.fn(), vi.fn())).toBeUndefined();
  });
});
