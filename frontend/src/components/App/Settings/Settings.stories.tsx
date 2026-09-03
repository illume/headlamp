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

import { Meta, StoryFn } from '@storybook/react';
import { useEffect } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { TestContext } from '../../../test';
import Settings from '.';

const desktopSend = fn();

function WithPackagedDesktop({ children }: { children: React.ReactNode }) {
  const previousDesktopApi = window.desktopApi;
  const previousProcess = window.process;
  Object.defineProperty(window, 'process', {
    configurable: true,
    value: { type: 'renderer' },
  });
  window.desktopApi = {
    receive: (channel: string, handler: (enabled: boolean) => void) => {
      if (channel === 'development-plugins') {
        handler(false);
      }
      return () => {};
    },
    send: desktopSend,
  } as any;

  useEffect(
    () => () => {
      window.desktopApi = previousDesktopApi;
      Object.defineProperty(window, 'process', {
        configurable: true,
        value: previousProcess,
      });
    },
    [previousDesktopApi, previousProcess]
  );

  return <>{children}</>;
}

export default {
  title: 'Settings',
  component: Settings,
  argTypes: {},
  decorators: [
    Story => {
      return (
        <TestContext>
          <Story />
        </TestContext>
      );
    },
  ],
} as Meta;

const Template: StoryFn = () => {
  return <Settings />;
};

export const General = Template.bind({});

export const PackagedDesktopDevelopmentMode: StoryFn = () => (
  <WithPackagedDesktop>
    <Settings showDevelopmentPluginsSetting />
  </WithPackagedDesktop>
);

PackagedDesktopDevelopmentMode.play = async ({ canvas }) => {
  desktopSend.mockClear();
  const developmentMode = await canvas.findByRole('checkbox', { name: 'Development Mode' });
  expect(developmentMode).not.toBeChecked();
  await userEvent.click(developmentMode);
  await waitFor(() => expect(desktopSend).toHaveBeenCalledWith('set-development-plugins', true));
};
