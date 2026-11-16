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

import { expect, Page, test } from '@playwright/test';
import { HeadlampPage } from './headlampPage';

const pluginName = '@kinvolk/headlamp-pod-counter';
const pluginDisplayName = 'headlamp-pod-counter';

let headlampPage: HeadlampPage;

async function openPodCounterSettings(page: Page) {
  await headlampPage.navigateTopage('/settings/plugins', /Plugins/);
  const pluginRow = page.getByRole('row').filter({ hasText: pluginDisplayName });
  await expect(pluginRow).toBeVisible();
  await headlampPage.clickOnPlugin(pluginDisplayName);
  await headlampPage.hasTitleContaining(/Plugin Details/);
}

async function loadAdminPluginSettings(
  page: Page,
  errorMessage: string,
  display: 'disabled' | 'hidden'
) {
  await page.route('**/config', async (route) => {
    const response = await route.fetch();
    const config = await response.json();
    await route.fulfill({
      response,
      json: {
        ...config,
        adminSettings: {
          defaults: {
            plugins: {
              [pluginName]: {
                errorMessage: { $value: errorMessage, $display: display },
              },
            },
          },
        },
      },
    });
  });
  await page.reload();
}

async function loadAdminClusterSettings(page: Page, configMapName: string) {
  await page.route('**/config', async (route) => {
    const response = await route.fetch();
    const config = await response.json();
    await route.fulfill({
      response,
      json: {
        ...config,
        adminSettings: {
          defaults: {
            plugins: {
              [pluginName]: { errorMessage: 'Administrator fallback' },
            },
          },
          clusterDefinedSettings: {
            test: [{ name: configMapName, namespace: 'default', type: 'ConfigMap' }],
          },
        },
      },
    });
  });
  await page.reload();
}

test.beforeEach(async ({ page }) => {
  headlampPage = new HeadlampPage(page);

  await headlampPage.navigateToCluster('test', process.env.HEADLAMP_TEST_TOKEN);
});

test('plugin settings page should have a title', async () => {
  await headlampPage.navigateTopage('/settings/plugins', /Plugins/);
});

test('plugin settings page should have a table', async () => {
  const expectedHeaders = ['Name', 'Description', 'Origin', 'Status'];
  // note: Enable column is only there in app mode.

  await headlampPage.navigateTopage('/settings/plugins', /Plugins/);
  await headlampPage.tableHasHeaders('table', expectedHeaders);
  await headlampPage.a11y();
});

test('pod counter plugin should have setting option', async ({ page }) => {
  await headlampPage.navigateTopage('/settings/plugins', /Plugin/);
  const pluginRow = page.getByRole('row').filter({ hasText: 'headlamp-pod-counter' });
  await expect(pluginRow).toBeVisible();
  await headlampPage.clickOnPlugin('headlamp-pod-counter');
  await headlampPage.hasTitleContaining(/Plugin Details/);
  await headlampPage.checkPageContent('Custom Error Message');
  await headlampPage.a11y();
});

test('plugin settings save and persist after reload', async ({ page }) => {
  const errorMessage = `E2E custom message ${Date.now()}`;
  await openPodCounterSettings(page);

  await page.getByRole('textbox', { name: 'Custom Error Message' }).fill(errorMessage);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(/\/settings\/plugins$/);
  await expect
    .poll(() =>
      page.evaluate(
        (name) => JSON.parse(localStorage.getItem('pluginConfigs') || '{}')[name]?.errorMessage,
        pluginName
      )
    )
    .toBe(errorMessage);

  await page.reload();
  await openPodCounterSettings(page);
  await expect(page.getByRole('textbox', { name: 'Custom Error Message' })).toHaveValue(
    errorMessage
  );
});

test('administrator-disabled settings show the policy value read-only', async ({ page }) => {
  const adminValue = `E2E managed message ${Date.now()}`;
  await page.evaluate(
    ({ name, value }) => {
      localStorage.setItem('pluginConfigs', JSON.stringify({ [name]: { errorMessage: value } }));
    },
    { name: pluginName, value: 'User override' }
  );
  await loadAdminPluginSettings(page, adminValue, 'disabled');
  await openPodCounterSettings(page);

  const field = page.getByRole('textbox', { name: 'Custom Error Message' });
  await expect(field).toHaveValue(adminValue);
  await expect(field).toBeDisabled();
});

test('administrator-hidden settings are omitted', async ({ page }) => {
  await loadAdminPluginSettings(page, `E2E hidden message ${Date.now()}`, 'hidden');
  await openPodCounterSettings(page);

  await expect(page.getByRole('textbox', { name: 'Custom Error Message' })).toHaveCount(0);
});

test('cluster settings are loaded and refreshed from their ConfigMap', async ({ page }) => {
  const token = process.env.HEADLAMP_TEST_TOKEN;
  test.skip(!token, 'HEADLAMP_TEST_TOKEN is required to create a settings ConfigMap');

  const configMapName = `settings-e2e-${Date.now().toString(36)}`;
  const configMapURL = `/clusters/test/api/v1/namespaces/default/configmaps/${configMapName}`;
  const headers = { Authorization: 'Bearer ' + (token ?? '') };
  const settingsFor = (errorMessage: string) => ({
    plugins: { [pluginName]: { errorMessage } },
  });
  const createResponse = await page.request.post(
    '/clusters/test/api/v1/namespaces/default/configmaps',
    {
      headers,
      data: {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: { name: configMapName, namespace: 'default' },
        data: { 'settings.json': JSON.stringify(settingsFor('Cluster value one')) },
      },
    }
  );
  expect(createResponse.status(), await createResponse.text()).toBe(201);

  try {
    await loadAdminClusterSettings(page, configMapName);
    const effectiveValue = () =>
      page.evaluate(
        ({ name, cluster }) =>
          (window as any).pluginLib.Settings.get(name, 'errorMessage', cluster),
        { name: pluginName, cluster: 'test' }
      );
    const effectiveSource = () =>
      page.evaluate(
        ({ name, cluster }) =>
          (window as any).pluginLib.Settings.getSource(name, 'errorMessage', cluster),
        { name: pluginName, cluster: 'test' }
      );
    await expect.poll(effectiveValue, { timeout: 30_000 }).toBe('Cluster value one');
    await expect.poll(effectiveSource, { timeout: 30_000 }).toBe('cluster');

    const configMapResponse = await page.request.get(configMapURL, { headers });
    expect(configMapResponse.status()).toBe(200);
    const configMap = await configMapResponse.json();
    const updateResponse = await page.request.put(configMapURL, {
      headers,
      data: {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
          name: configMapName,
          namespace: 'default',
          resourceVersion: configMap.metadata.resourceVersion,
        },
        data: { 'settings.json': JSON.stringify(settingsFor('Cluster value two')) },
      },
    });
    expect(updateResponse.status(), await updateResponse.text()).toBe(200);

    await page.reload();
    await expect.poll(effectiveValue, { timeout: 30_000 }).toBe('Cluster value two');
  } finally {
    const deleteResponse = await page.request.delete(configMapURL, { headers });
    expect([200, 202, 404]).toContain(deleteResponse.status());
  }
});
