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

import { BrowserWindow, dialog, IpcMain, IpcMainEvent } from 'electron';
import i18n from './i18next.config';
import { revokeRunCmdCapabilities } from './runCmd';
import { areDevelopmentPluginsEnabled, setDevelopmentPluginsEnabled } from './settings';

type DevelopmentPluginsIpcListeners = {
  requestDevelopmentPlugins: () => void;
  setDevelopmentPlugins: (event: IpcMainEvent, enabled: boolean) => void;
};

const developmentPluginsIpcListeners = new WeakMap<IpcMain, DevelopmentPluginsIpcListeners>();

export function confirmEnableDevelopmentPlugins(mainWindow: BrowserWindow): boolean {
  try {
    const response = dialog.showMessageBoxSync(mainWindow, {
      type: 'warning',
      buttons: [i18n.t('Enable'), i18n.t('Cancel')],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
      title: i18n.t('Development Mode'),
      message: i18n.t('Enable Development Mode?'),
      detail: i18n.t(
        'Development plugins run local code and may request command access. Only enable this mode if you trust every plugin in the development plugins directory.'
      ),
    });
    return response === 0;
  } catch (error) {
    console.error('Failed to confirm Development Mode:', error);
    return false;
  }
}

export function setupDevelopmentPluginsHandlers(mainWindow: BrowserWindow, ipcMain: IpcMain): void {
  const previousListeners = developmentPluginsIpcListeners.get(ipcMain);
  if (previousListeners) {
    ipcMain.off('request-development-plugins', previousListeners.requestDevelopmentPlugins);
    ipcMain.off('set-development-plugins', previousListeners.setDevelopmentPlugins);
  }

  const requestDevelopmentPlugins = () => {
    mainWindow.webContents.send('development-plugins', areDevelopmentPluginsEnabled());
  };

  const setDevelopmentPlugins = (event: IpcMainEvent, enabled: boolean) => {
    if (
      typeof enabled !== 'boolean' ||
      event.sender !== mainWindow.webContents ||
      event.senderFrame !== mainWindow.webContents.mainFrame
    ) {
      return;
    }
    const currentlyEnabled = areDevelopmentPluginsEnabled();
    if (enabled === currentlyEnabled) {
      return;
    }
    if (enabled && !confirmEnableDevelopmentPlugins(mainWindow)) {
      event.sender.send('development-plugins', currentlyEnabled);
      return;
    }
    setDevelopmentPluginsEnabled(enabled);
    revokeRunCmdCapabilities(ipcMain);
    mainWindow.webContents.reload();
  };

  ipcMain.on('request-development-plugins', requestDevelopmentPlugins);
  ipcMain.on('set-development-plugins', setDevelopmentPlugins);
  developmentPluginsIpcListeners.set(ipcMain, {
    requestDevelopmentPlugins,
    setDevelopmentPlugins,
  });
}
